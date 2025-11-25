import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const researchPersonaStep = createStep({
  id: "research-persona",
  description:
    "Conducts digital ethnography research to gather authentic data for the persona",
  inputSchema: z.object({
    personaDescription: z.string(),
    industry: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number().default(10),
    interviewFocus: z.string(),
  }),
  outputSchema: z.object({
    personaDescription: z.string(),
    industry: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    researchOutput: z.object({
      summary: z.string(),
      top_findings: z.array(z.string()),
      sources: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          relevance: z.string(),
        })
      ),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
    } = inputData;

    const researchAgent = mastra?.getAgent("researchAgent");

    if (!researchAgent) {
      throw new Error("Research Agent not found");
    }

    console.log("\n\n=== STARTING RESEARCH STEP (STRUCTURED) ===");
    console.log(`Topic: ${personaDescription} | Industry: ${industry}`);

    // Generate research prompt with structured output request
    const researchPrompt = `
      I need to build a realistic persona for: "${personaDescription}" in the "${industry}" industry.
      Context: ${context}

      Please conduct research using the following strategy:
      1. Search for "day in the life of a ${personaDescription}" or similar roles to understand daily tasks.
      2. Search for "${personaDescription} pain points reddit" or "site:reddit.com ${personaDescription} complaints" to find authentic frustrations.
      3. Search for "salary range ${personaDescription}" and key responsibilities.

      CRITICAL: You must return a JSON object containing:
      - "summary": A concise overview of the findings.
      - "top_findings": An array of 5-7 specific insights (quotes, facts, pain points).
      - "sources": An array of objects, each having "title", "url", and "relevance" (why this source matters).

      Do not wrap in markdown. Return only the JSON ONLY and nothing else you have to be consistent with the output format.
    `;

    console.log("Executing Research Agent...");
    const result = await researchAgent.generate(researchPrompt, {
      output: z.object({
        summary: z.string(),
        top_findings: z.array(z.string()),
        sources: z.array(
          z.object({
            title: z.string(),
            url: z.string(),
            relevance: z.string(),
          })
        ),
      }),
    });

    console.log(
      "Research Completed. Found " + result.object?.sources.length + " sources."
    );

    const researchOutput = result.object;

    if (!researchOutput) {
      throw new Error("Failed to parse research output");
    }

    return {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
      researchOutput,
    };
  },
});
