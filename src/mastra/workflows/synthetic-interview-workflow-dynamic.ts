import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { researchStep } from "./steps/research-step";
import { generatePersonaStep } from "./steps/generate-persona";
import { checkPersonaScoreStep } from "./steps/check-persona-score";
import { refinePersonaStep } from "./steps/refine-persona";
import { useOriginalPersonaStep } from "./steps/use-original-persona";
import { prepareForQuestionsStep } from "./steps/prepare-for-questions";
import { conductDynamicInterviewStep } from "./steps/conduct-dynamic-interview";
import { formatResultsStep } from "./steps/format-results";

// Create the dynamic workflow by chaining steps
export const syntheticInterviewWorkflowDynamic = createWorkflow({
  id: "synthetic-interview-workflow-dynamic",
  description:
    "Generate persona and conduct dynamic synthetic interview with context-aware question generation",
  inputSchema: z.object({
    // Persona generation inputs
    personaDescription: z
      .string()
      .describe(
        "Description of the persona (e.g., 'non-technical SME business owner')"
      ),
    industry: z.string().describe("Industry context"),
    context: z
      .string()
      .describe("Additional context about persona's situation"),

    // Question generation inputs
    topic: z
      .string()
      .describe("Topic of the interview (e.g., 'financial software')"),
    questionCount: z
      .number()
      .default(10)
      .describe(
        "Maximum number of questions (interview may exit early if goals covered)"
      ),
    interviewFocus: z
      .string()
      .describe(
        "Specific focus for questions (e.g., 'pain points with current accounting processes')"
      ),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaDescription: z.string(),
    personaProfile: z.string(),
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
      originalScore: z.number().nullable().default(null),
      finalScore: z.number().nullable().default(null),
      improvementNotes: z.string().nullable().default(null),
      interviewMetadata: z
        .object({
          totalQuestions: z.number(),
          earlyExit: z.boolean(),
          exitReason: z.string(),
          coverageAssessment: z
            .object({
              goalsCovered: z.array(z.string()),
              goalsRemaining: z.array(z.string()),
            })
            .optional(),
        })
        .optional(),
    }),
  }),
})
  .then(researchStep)
  .then(generatePersonaStep)
  .then(checkPersonaScoreStep)
  .branch([
    // Branch 1: Persona needs refinement (score < 0.7)
    [
      async ({ inputData }) => inputData.needsRefinement === true,
      refinePersonaStep,
    ],
    // Branch 2: Persona is good enough (score >= 0.7)
    [
      async ({ inputData }) => inputData.needsRefinement === false,
      useOriginalPersonaStep,
    ],
  ])
  .then(prepareForQuestionsStep)
  .then(conductDynamicInterviewStep)
  .then(formatResultsStep)
  .commit();

// Export the workflow
export default syntheticInterviewWorkflowDynamic;
