import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { problemSpecificityScorer } from "../../scorers/interview";

const QuestionsOutputSchema = z.object({
  questions: z
    .array(z.string())
    .describe("Array of Mom Test interview questions"),
});

export const generateQuestionsStep = createStep({
  id: "generate-questions",
  description: "Generate Mom Test interview questions",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    questions: z.array(z.string()),
    topic: z.string(),
    questionCount: z.number(),
    industry: z.string(),
  }),
  scorers: {
    problemSpecificity: {
      scorer: problemSpecificityScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  execute: async ({ inputData, mastra }) => {
    const {
      topic,
      questionCount,
      interviewFocus,
      industry,
      personaId,
      personaProfile,
      personaSummary,
    } = inputData;

    const questionsAgent = mastra?.getAgent("questionsAgent");

    if (!questionsAgent) {
      throw new Error("Questions Agent not found");
    }

    const questionsPrompt = `Generate exactly ${questionCount} Mom Test interview questions for:

        Topic: ${topic}
        Industry: ${industry}
        Focus: ${interviewFocus}

        Create questions that follow The Mom Test principles - focus on past behaviors, real experiences, and specific examples. Do not ask hypothetical or leading questions.

        Generate EXACTLY ${questionCount} questions.`;

    const response = await questionsAgent.generate(questionsPrompt, {
      output: QuestionsOutputSchema,
    });

    const questions = response.object?.questions || [];

    if (questions.length === 0) {
      throw new Error("Questions agent did not return any questions");
    }

    return {
      personaId,
      personaProfile,
      personaSummary,
      questions: questions.slice(0, questionCount),
      topic,
      questionCount,
      industry,
    };
  },
});
