import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { researchPersonaStep } from "./steps/research-persona";
import { reviewResearchStep } from "./steps/review-research";
import { generatePersonaStep } from "./steps/generate-persona";
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
    }),
  }),
})
  .then(researchPersonaStep)
  .then(reviewResearchStep)
  .then(generatePersonaStep)
  .then(generateQuestionsStep)
  .then(conductInterviewStep)
  .then(formatResultsStep)
  .commit();

// Export the workflow
export default syntheticInterviewWorkflow;
