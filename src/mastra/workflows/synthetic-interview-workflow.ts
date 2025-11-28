import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { researchStep } from "./steps/research-step";
import { reviewResearchStep } from "./steps/review-research";
import { generatePersonaStep } from "./steps/generate-persona";
import { checkPersonaScoreStep } from "./steps/check-persona-score";
import { refinePersonaStep } from "./steps/refine-persona";
import { useOriginalPersonaStep } from "./steps/use-original-persona";
import { prepareForQuestionsStep } from "./steps/prepare-for-questions";
import { generateQuestionsStep } from "./steps/generate-questions";
import { conductInterviewStep } from "./steps/conduct-interview";
import { formatResultsStep } from "./steps/format-results";

// Create the workflow by chaining steps
export const syntheticInterviewWorkflow = createWorkflow({
  id: "synthetic-interview-workflow",
  description:
    "Generate persona, create questions, and conduct synthetic interview with research",
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
      .describe("Number of questions to generate"),
    interviewFocus: z
      .string()
      .describe(
        "Specific focus for questions (e.g., 'pain points with current accounting processes')"
      ),
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
      originalScore: z.number().nullable().default(null),
      finalScore: z.number().nullable().default(null),
      improvementNotes: z.string().nullable().default(null),
    }),
  }),
})
  .then(researchStep)
  .then(reviewResearchStep)
  .then(generatePersonaStep)
  .then(checkPersonaScoreStep)
  .branch([
    // Branch 1: Persona needs refinement (score < 0.95)
    [
      async ({ inputData }) => inputData.needsRefinement === true,
      refinePersonaStep,
    ],
    // Branch 2: Persona is good enough (score >= 0.95)
    [
      async ({ inputData }) => inputData.needsRefinement === false,
      useOriginalPersonaStep,
    ],
  ])
  .then(prepareForQuestionsStep)
  .then(generateQuestionsStep)
  .then(conductInterviewStep)
  .then(formatResultsStep)
  .commit();

// Export the workflow
export default syntheticInterviewWorkflow;
