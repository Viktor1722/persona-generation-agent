import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const prepareForQuestionsStep = createStep({
  id: "prepare-for-questions",
  description:
    "Normalize persona data for question generation (works for both refined and non-refined personas)",
  inputSchema: z.object({
    "refine-persona": z
      .object({
        personaId: z.string(),
        personaProfile: z.string(),
        personaDescription: z.string(),
        context: z.string(),
        topic: z.string(),
        questionCount: z.number(),
        interviewFocus: z.string(),
        industry: z.string(),
      })
      .optional(),
    "use-original-persona": z
      .object({
        personaId: z.string(),
        personaProfile: z.string(),
        personaDescription: z.string(),
        context: z.string(),
        topic: z.string(),
        questionCount: z.number(),
        interviewFocus: z.string(),
        industry: z.string(),
      })
      .optional(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaDescription: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log("\n=== PREPARE FOR QUESTIONS STEP ===");
    console.log("Raw Input Keys:", Object.keys(inputData));

    const branchData =
      inputData["refine-persona"] || inputData["use-original-persona"];

    if (!branchData) {
      console.error(
        "Branch data structure:",
        JSON.stringify(inputData, null, 2)
      );
      throw new Error(
        "No branch output found. Expected 'refine-persona' or 'use-original-persona' key in input data."
      );
    }

    const {
      personaId,
      personaProfile,
      personaDescription,
      context,
      topic,
      questionCount,
      interviewFocus,
      industry,
    } = branchData;

    return {
      personaId,
      personaProfile,
      personaDescription,
      context,
      topic,
      questionCount,
      interviewFocus,
      industry,
    };
  },
});
