import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Rate limiter to prevent exceeding Brave API limits
class RateLimiter {
  private queue: Array<() => void> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minDelay: number; // milliseconds between requests

  constructor(requestsPerSecond: number = 1) {
    this.minDelay = 1000 / requestsPerSecond;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if we need to respect the rate limit
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.minDelay - timeSinceLastRequest)
        );
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.isProcessing = false;
  }
}

// Create a singleton rate limiter (1 request per second for free tier)
// Adjust to 2-3 for paid tiers
const rateLimiter = new RateLimiter(1);

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  published_date?: string;
}

interface BraveWebSearchResponse {
  web?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      published_date?: string;
      extra_snippets?: string[];
    }>;
  };
  news?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      published_date?: string;
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
        published_date: z.string().optional(),
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

    // Use rate limiter to prevent API abuse
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
          throw new Error(
            "Brave API rate limit exceeded. Please wait before making more requests."
          );
        }
        throw new Error(
          `Brave API error: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as BraveWebSearchResponse;
    });

    // Process results
    const results: BraveSearchResult[] = [];

    // Add web results
    if (searchResults.web?.results) {
      results.push(
        ...searchResults.web.results.map((result) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          published_date: result.published_date,
        }))
      );
    }

    // Add news results if searching for news
    if (search_type === "news" && searchResults.news?.results) {
      results.push(
        ...searchResults.news.results.map((result) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          published_date: result.published_date,
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
