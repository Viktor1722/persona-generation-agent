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
    researchContext: z.string(),
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

    console.log("\n\n=== STARTING RESEARCH STEP ===");
    console.log(`Topic: ${personaDescription} | Industry: ${industry}`);

    // Generate research prompt
    const researchPrompt = `
      I need to build a realistic persona for: "${personaDescription}" in the "${industry}" industry.
      Context: ${context}

      Please conduct research using the following strategy:
      1. Search for "day in the life of a ${personaDescription}" or similar roles to understand daily tasks.
      2. Search for "${personaDescription} pain points reddit" or "site:reddit.com ${personaDescription} complaints" to find authentic frustrations.
      3. Search for "salary range ${personaDescription}" and key responsibilities.

      Synthesize your findings into a "Research Context" that I can feed into a persona generator. 
      Focus on finding:
      - Real quotes or specific language used by these people.
      - Concrete examples of problems they face.
      - Tools they use.
    `;

    console.log("Executing Research Agent...");
    const result = await researchAgent.generate(researchPrompt);
    console.log(
      "Research Completed. Found " + result.text.length + " chars of data."
    );
    const researchContext = result.text;

    return {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
      researchContext,
    };
  },
});
