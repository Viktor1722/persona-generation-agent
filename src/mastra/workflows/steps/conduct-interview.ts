import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  behavioralAccuracyScorer,
  personaBehaviorConsistencyScorer,
} from "../../scorers/interview";

export const conductInterviewStep = createStep({
  id: "conduct-interview",
  description: "Have the persona answer each interview question",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    questions: z.array(z.string()),
    topic: z.string(),
    questionCount: z.number(),
    industry: z.string(),
  }),
  outputSchema: z.object({
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
  scorers: {
    behavioralAccuracy: {
      scorer: behavioralAccuracyScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    intraInterviewConsistency: {
      scorer: personaBehaviorConsistencyScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  execute: async ({ inputData, mastra }) => {
    const {
      personaProfile,
      questions,
      personaId,
      personaSummary,
      topic,
      questionCount,
      industry,
    } = inputData;

    const interviewAgent = mastra?.getAgent("interviewAgent");

    if (!interviewAgent) {
      throw new Error("Interview Agent not found");
    }

    const transcript: Array<{ question: string; answer: string }> = [];

    // Interview the persona with each question
    for (const question of questions) {
      const interviewPrompt = `You are embodying this persona:

        ${personaProfile}

        ---

        You are being interviewed. Here is the question:

        ${question}

        Answer as this persona would, naturally and authentically. Reference your specific situation, pain points, and experiences from the persona profile.`;

      const response = await interviewAgent.generate(interviewPrompt);

      transcript.push({
        question,
        answer: response.text,
      });
    }

    return {
      personaId,
      personaSummary,
      transcript,
      topic,
      questionCount,
      industry,
    };
  },
});
