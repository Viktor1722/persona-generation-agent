import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const webScraperTool = createTool({
  id: "web-scraper",
  description: "Scrapes content from publicly accessible web pages",
  inputSchema: z.object({
    url: z.string().url().describe("URL to scrape"),
  }),
  outputSchema: z.object({
    title: z.string(),
    content: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  execute: async ({ context }) => {
    const { url } = context;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MastraBot/1.0)",
      },
    });

    const html = await response.text();

    // Basic extraction (you'd want a proper HTML parser like cheerio)
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : "";

    // Extract text content (simplified)
    const content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      title,
      content: content.substring(0, 5000), // Limit to prevent token overflow
      metadata: {
        url,
        scrapedAt: new Date().toISOString(),
      },
    };
  },
});
