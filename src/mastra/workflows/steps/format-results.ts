import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const formatResultsStep = createStep({
  id: "format-results",
  description: "Format the interview results with metadata",
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
    }),
  }),
  execute: async ({ inputData }) => {
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
      },
    };
  },
});
