import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  personaQualityScorer,
  topicRelevanceScorer,
  problemSpecificityScorer,
  momTestAdherenceScorer,
  behavioralAccuracyScorer,
  intraInterviewConsistencyScorer,
} from "../scorers/interview";

/**
 * Synthetic Interview Workflow
 *
 * This workflow orchestrates the complete synthetic interview process:
 * 1. Generate Persona - Create a detailed persona based on user requirements
 * 2. Generate Questions - Create Mom Test questions for the interview
 * 3. Conduct Interview - Have the persona answer each question authentically
 * 4. Format Results - Structure the interview transcript with metadata
 */

// Step 1: Generate Persona
const generatePersonaStep = createStep({
  id: "generate-persona",
  description: "Generate a detailed persona based on requirements",
  inputSchema: z.object({
    personaDescription: z.string(),
    industry: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number().default(10),
    interviewFocus: z.string(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
  }),
  scorers: {
    personaQuality: {
      scorer: personaQualityScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  execute: async ({ inputData, mastra }) => {
    const {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
    } = inputData;

    const personaAgent = mastra?.getAgent("personaAgent");

    if (!personaAgent) {
      throw new Error("Persona Agent not found");
    }

    // Create a comprehensive prompt for persona generation
    const personaPrompt = `Create a detailed persona for: ${personaDescription}

    Industry: ${industry}
    Context: ${context}

    Generate a complete persona profile following all guidelines.`;

    const response = await personaAgent.generate(personaPrompt);

    // Generate a unique ID for this persona
    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract a brief summary (first few lines or overview section)
    const personaProfile = response.text;
    const lines = personaProfile.split("\n").filter((line) => line.trim());
    const summaryLines = lines.slice(0, 5).join(" ").substring(0, 200);
    const personaSummary = summaryLines + "...";

    return {
      personaId,
      personaProfile,
      personaSummary,
      topic,
      questionCount,
      interviewFocus,
      industry,
    };
  },
});

// Step 2: Generate Questions
const generateQuestionsStep = createStep({
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
    topicRelevance: {
      scorer: topicRelevanceScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    problemSpecificity: {
      scorer: problemSpecificityScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    momTestAdherence: {
      scorer: momTestAdherenceScorer,
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

// Step 3: Conduct Interview
const conductInterviewStep = createStep({
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
      scorer: intraInterviewConsistencyScorer,
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

// Step 4: Format Results
const formatResultsStep = createStep({
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

// Create the workflow by chaining steps
export const syntheticInterviewWorkflow = createWorkflow({
  id: "synthetic-interview-workflow",
  description:
    "Generate persona, create questions, and conduct synthetic interview",
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
  .then(generatePersonaStep)
  .then(generateQuestionsStep)
  .then(conductInterviewStep)
  .then(formatResultsStep)
  .commit();

// Export the workflow
export default syntheticInterviewWorkflow;
