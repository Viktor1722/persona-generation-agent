import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { problemSpecificityScorer } from "../../scorers/interview";

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

    const questionsPrompt = `Generate ${questionCount} Mom Test interview questions for:

Topic: ${topic}
Industry: ${industry}
Focus: ${interviewFocus}

Create questions that follow The Mom Test principles - focus on past behaviors, real experiences, and specific examples. Do not ask hypothetical or leading questions.`;

    const response = await questionsAgent.generate(questionsPrompt);

    // Parse the numbered list of questions
    const questionText = response.text;
    const lines = questionText.split("\n").filter((line) => line.trim());

    // Extract questions (lines that start with numbers or bullets)
    const questions = lines
      .filter((line) => {
        const trimmed = line.trim();
        return /^\d+[\.)]\s/.test(trimmed) || /^[-*]\s/.test(trimmed);
      })
      .map((line) => {
        // Remove numbering/bullets
        return line
          .trim()
          .replace(/^\d+[\.)]\s*/, "")
          .replace(/^[-*]\s*/, "")
          .trim();
      })
      .filter((q) => q.length > 0);

    // If parsing failed, split by newlines and take non-empty lines
    if (questions.length === 0) {
      const fallbackQuestions = lines
        .filter((line) => line.trim().length > 20 && line.includes("?"))
        .slice(0, questionCount);

      return {
        personaId,
        personaProfile,
        personaSummary,
        questions: fallbackQuestions,
        topic,
        questionCount,
        industry,
      };
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
