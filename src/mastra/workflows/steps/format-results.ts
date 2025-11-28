import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const formatResultsStep = createStep({
  id: "format-results",
  description:
    "Format the interview results with metadata and persona refinement info",
  inputSchema: z.object({
    personaId: z.string(),
    personaSummary: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    topic: z.string(),
    questionCount: z.number(),
    industry: z.string(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaSummary: z.string(),
    interviewId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    metadata: z.object({
      topic: z.string(),
      industry: z.string(),
      questionCount: z.number(),
      conductedAt: z.string(),
      personaRefined: z.boolean(),
      originalScore: z.number().optional(),
      finalScore: z.number().optional(),
      improvementNotes: z.string().optional(),
    }),
  }),
  execute: async ({ inputData, getStepResult }) => {
    const {
      personaId,
      personaSummary,
      transcript,
      topic,
      industry,
      questionCount,
    } = inputData;

    const interviewId = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const conductedAt = new Date().toISOString();

    // Try to get refinement information from the prepare-for-questions step
    let personaRefined = false;
    let originalScore: number | undefined;
    let finalScore: number | undefined;
    let improvementNotes: string | undefined;

    try {
      const prepareResult = getStepResult("prepare-for-questions");

      // Check if there's an originalPersona field (indicates refinement occurred)
      if (prepareResult?.originalPersona) {
        personaRefined = true;
        originalScore = prepareResult.originalScore;
        finalScore = prepareResult.refinedScore;
        improvementNotes = prepareResult.improvementNotes;

        console.log("\n=== PERSONA REFINEMENT SUMMARY ===");
        console.log(`Refinement Performed: YES`);
        console.log(`Original Score: ${originalScore?.toFixed(2)}`);
        if (finalScore) {
          console.log(`Final Score: ${finalScore.toFixed(2)}`);
          console.log(
            `Improvement: +${(finalScore - (originalScore || 0)).toFixed(2)}`
          );
        }
        console.log(`Notes: ${improvementNotes}`);
      } else {
        console.log("\n=== PERSONA REFINEMENT SUMMARY ===");
        console.log(`Refinement Performed: NO`);
        console.log(`Original persona met quality threshold`);
      }
    } catch (error) {
      // If we can't get the step result, that's okay - just means no refinement info
      console.log("No refinement information available");
    }

    return {
      personaId,
      personaSummary,
      interviewId,
      transcript,
      metadata: {
        topic,
        industry,
        questionCount,
        conductedAt,
        personaRefined,
        originalScore,
        finalScore,
        improvementNotes,
      },
    };
  },
});
