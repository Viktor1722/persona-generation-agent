import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

// This step normalizes the output from either the direct path or refinement path
// It ensures the data is in the correct format for generate-questions step
export const prepareForQuestionsStep = createStep({
  id: "prepare-for-questions",
  description:
    "Normalize persona data for question generation (works for both refined and non-refined personas)",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
    // Optional fields from refinement path
    originalPersona: z.string().optional(),
    originalScore: z.number().optional(),
    refinedScore: z.number().optional(),
    improvementNotes: z.string().optional(),
    qualityScore: z.number().optional(),
    needsRefinement: z.boolean().optional(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
  }),
  execute: async ({ inputData }) => {
    const {
      personaId,
      personaProfile,
      personaSummary,
      topic,
      questionCount,
      interviewFocus,
      industry,
      originalPersona,
      originalScore,
      improvementNotes,
    } = inputData;

    // Log if this persona was refined
    if (originalPersona) {
      const { refinedScore } = inputData;
      console.log("\n=== PERSONA WAS REFINED ===");
      console.log(`Original Score: ${originalScore?.toFixed(2)}`);
      if (refinedScore !== undefined) {
        console.log(`Refined Score: ${refinedScore.toFixed(2)}`);
        console.log(
          `Improvement: ${((refinedScore - (originalScore || 0)) * 100).toFixed(1)}%`
        );
      }
      console.log(`Improvement Notes: ${improvementNotes}`);
      console.log("Using refined version for interview");
    } else {
      console.log("\n=== USING ORIGINAL PERSONA ===");
      console.log("Persona quality met threshold");
    }

    // Return normalized output for generate-questions
    return {
      personaId,
      personaProfile,
      personaSummary,
      topic,
      questionCount,
      interviewFocus,
      industry,
    };
  },
});
