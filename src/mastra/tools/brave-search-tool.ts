import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Robust Rate Limiter with Retry Logic
class RateLimiter {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minDelay = 1100;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minDelay) {
        const waitTime = this.minDelay - timeSinceLastRequest;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      try {
        const result = await this.executeWithRetry(item.fn);
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }

      this.lastRequestTime = Date.now();
      this.queue.shift();
    }

    this.isProcessing = false;
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && error.message.includes("429")) {
        console.log(
          `Rate limit hit. Retrying in 2 seconds... (${retries} attempts left)`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.executeWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  published_date?: string;
  relevance: string;
}

interface BraveWebSearchResponse {
  web?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      extra_snippets?: string[];
      relevance: string;
    }>;
  };
  news?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      relevance: string;
    }>;
  };
}

export const braveSearchTool = createTool({
  id: "brave-search",
  description:
    "Search the web using Brave Search API. Returns relevant web results, articles, and news for a given query. Use this to find information about people, companies, topics, or any public information.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up"),
    count: z
      .number()
      .optional()
      .default(10)
      .describe("Number of results to return (1-20, default 10)"),
    search_type: z
      .enum(["web", "news"])
      .optional()
      .default("web")
      .describe(
        'Type of search: "web" for general results, "news" for recent news articles'
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        description: z.string(),
        relevance: z.string(),
      })
    ),
    query: z.string(),
    total_results: z.number(),
  }),
  execute: async ({ context }) => {
    const apiKey = process.env.BRAVE_API_KEY;

    if (!apiKey) {
      throw new Error("BRAVE_API_KEY environment variable is not set");
    }

    const { query, count = 10, search_type = "web" } = context;

    // Validate count
    const validCount = Math.min(Math.max(count, 1), 20);

    // Execute through rate limiter
    const searchResults = await rateLimiter.execute(async () => {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.append("q", query);
      url.searchParams.append("count", validCount.toString());

      if (search_type === "news") {
        url.searchParams.append("search_lang", "en");
        url.searchParams.append("result_filter", "news");
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Brave API rate limit exceeded (429).");
        }
        throw new Error(
          `Brave API error: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as BraveWebSearchResponse;
    });

    // Process results
    const results: BraveSearchResult[] = [];

    if (searchResults.web?.results) {
      results.push(
        ...searchResults.web.results.map((result) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          relevance: result.relevance,
        }))
      );
    }

    if (search_type === "news" && searchResults.news?.results) {
      results.push(
        ...searchResults.news.results.map((result) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          relevance: result.relevance,
        }))
      );
    }

    return {
      results,
      query,
      total_results: results.length,
    };
  },
});
