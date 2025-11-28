import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

// This step is used when persona quality is good enough and no refinement is needed
// It passes through the original persona with the same output schema as refine-persona
export const useOriginalPersonaStep = createStep({
  id: "use-original-persona",
  description: "Use the original persona without refinement (quality is good)",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
    personaDescription: z.string(),
    context: z.string(),
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
    needsRefinement: z.boolean(),
    qualityScore: z.number(),
    scorerFeedback: z
      .object({
        score: z.number(),
        completeness: z.object({
          score: z.number(),
          reasoning: z.string(),
          missingElements: z.array(z.string()),
        }),
        suitability: z.object({
          score: z.number(),
          reasoning: z.string(),
          misalignments: z.array(z.string()),
        }),
        specificity: z.object({
          score: z.number(),
          reasoning: z.string(),
          vagueAreas: z.array(z.string()),
        }),
      })
      .optional(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
    originalPersona: z.string(),
    originalScore: z.number(),
    refinedScore: z.number().optional(),
    improvementNotes: z.string(),
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
      qualityScore,
    } = inputData;

    console.log("\n=== USING ORIGINAL PERSONA (No Refinement Needed) ===");
    console.log(`Quality Score: ${qualityScore.toFixed(2)} >= 0.95`);

    // Pass through with same schema as refine-persona
    return {
      personaId,
      personaProfile,
      personaSummary,
      topic,
      questionCount,
      interviewFocus,
      industry,
      originalPersona: personaProfile,
      originalScore: qualityScore,
      improvementNotes: "No refinement needed - quality score met threshold",
    };
  },
});
