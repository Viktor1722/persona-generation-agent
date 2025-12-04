import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const useOriginalPersonaStep = createStep({
  id: "use-original-persona",
  description: "Use the original persona without refinement (quality is good)",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
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
    personaDescription: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
  }),
  execute: async ({ inputData }) => {
    const {
      personaId,
      personaProfile,
      personaDescription,
      topic,
      questionCount,
      interviewFocus,
      industry,
      context,
      qualityScore,
    } = inputData;

    console.log("\n=== USING ORIGINAL PERSONA (No Refinement Needed) ===");
    console.log(`Quality Score: ${qualityScore.toFixed(2)} >= 0.95`);

    // Pass through with same schema as refine-persona
    const output = {
      personaId,
      personaProfile,
      personaDescription,
      context,
      topic,
      questionCount,
      interviewFocus,
      industry,
    };

    console.log("\n=== USE ORIGINAL PERSONA STEP - OUTPUT DATA ===");
    console.log("Output Keys:", Object.keys(output));
    console.log("PersonaId:", output.personaId);
    console.log("PersonaDescription:", output.personaDescription);
    console.log("Context:", output.context);
    console.log("Topic:", output.topic);
    console.log("Industry:", output.industry);
    console.log("InterviewFocus:", output.interviewFocus);
    console.log("QuestionCount:", output.questionCount);

    return output;
  },
});
