import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Zod schema for question generation output
const QuestionsOutputSchema = z.object({
  questions: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("1-3 interview questions based on conversation context"),
  reasoning: z.string().describe("Brief reasoning for these questions"),
});

export const conductDynamicInterviewStep = createStep({
  id: "conduct-dynamic-interview",
  description:
    "Conduct dynamic interview with context-aware question generation",

  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaDescription: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z
      .number()
      .describe("Maximum number of questions (can exit early)"),
    interviewFocus: z.string(),
    industry: z.string(),
  }),

  outputSchema: z.object({
    personaId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    topic: z.string(),
    questionCount: z.number().describe("Actual number of questions asked"),
    industry: z.string(),
    interviewMetadata: z.object({
      totalQuestions: z.number(),
      earlyExit: z.boolean(),
      exitReason: z.string(),
      coverageAssessment: z.object({
        goalsCovered: z.array(z.string()),
        goalsRemaining: z.array(z.string()),
      }),
    }),
  }),

  execute: async ({ inputData, mastra, tracingContext }) => {
    const {
      personaProfile,
      personaDescription,
      context,
      topic,
      questionCount: maxQuestions,
      interviewFocus,
      industry,
      personaId,
    } = inputData;

    const questionsAgent = mastra?.getAgent("questionsAgent");
    const interviewAgent = mastra?.getAgent("interviewAgent");

    if (!questionsAgent || !interviewAgent) {
      throw new Error("Required agents not found");
    }

    // Interview state
    const transcript: Array<{ question: string; answer: string }> = [];
    let earlyExit = false;
    let exitReason = "Reached maximum question count";
    let coverageAssessment: any = undefined;

    // Update tracing with interview start
    tracingContext.currentSpan?.update({
      metadata: {
        phase: "interview-started",
        maxQuestions,
        topic,
        interviewFocus,
      },
    });

    // PHASE 1: Generate 1-2 opening questions
    console.log("\n=== DYNAMIC INTERVIEW: GENERATING OPENING QUESTIONS ===");

    const openingPrompt = `Generate 1-2 opening interview questions to start a conversation about: ${topic}

Industry: ${industry}
Focus: ${interviewFocus}
Persona Description: ${personaDescription}
Context: ${context}

These are the FIRST questions, so they should be broad but focused on the interview goals.
Create questions that follow The Mom Test principles - focus on past behaviors, real experiences, and specific examples.`;

    const openingResponse = await questionsAgent.generate(openingPrompt, {
      output: QuestionsOutputSchema,
    });

    const openingQuestions = openingResponse.object?.questions || [];

    if (openingQuestions.length === 0) {
      throw new Error("Failed to generate opening questions");
    }

    console.log(`Generated ${openingQuestions.length} opening questions`);

    tracingContext.currentSpan?.update({
      metadata: {
        phase: "opening-questions-generated",
        count: openingQuestions.length,
      },
    });

    // PHASE 2: Iterative interview loop
    let questionsAsked = 0;
    const CONTEXT_WINDOW_SIZE = 5;

    while (questionsAsked < maxQuestions) {
      // Determine which questions to ask
      let questionsToAsk: string[] = [];

      if (transcript.length === 0 && openingQuestions.length > 0) {
        // Use opening questions for first iteration
        questionsToAsk = openingQuestions.slice(0, Math.min(2, maxQuestions));
      } else {
        // Generate next questions based on conversation context

        const recentTranscript = transcript.slice(-CONTEXT_WINDOW_SIZE);
        const conversationContext = recentTranscript
          .map((t, i) => `Q: ${t.question}\nA: ${t.answer}`)
          .join("\n\n");

        const remainingQuestions = maxQuestions - questionsAsked;
        const questionsToGenerate = Math.min(2, remainingQuestions);

        console.log(
          `\n=== GENERATING FOLLOW-UP QUESTIONS (${questionsAsked}/${maxQuestions} asked) ===`
        );

        const followUpPrompt = `Based on this interview conversation so far, generate ${questionsToGenerate} follow-up question(s):

          INTERVIEW GOALS:
          Topic: ${topic}
          Focus: ${interviewFocus}
          Industry: ${industry}

          RECENT CONVERSATION:
          ${conversationContext}

          Generate Mom Test questions that:
          1. Build on insights from recent answers
          2. Dig deeper into interesting areas mentioned
          3. Uncover specific behaviors and pain points
          4. Avoid repeating what's already been asked

          Focus on following up on interesting details or gaps in understanding.`;

        try {
          const followUpResponse = await questionsAgent.generate(
            followUpPrompt,
            {
              output: QuestionsOutputSchema,
            }
          );

          questionsToAsk = followUpResponse.object?.questions || [];

          if (questionsToAsk.length === 0) {
            console.log(
              "Failed to generate follow-up questions, ending interview"
            );
            exitReason = "Failed to generate follow-up questions";
            break;
          }
        } catch (error) {
          console.error("Error generating follow-up questions:", error);
          exitReason = `Error generating follow-up questions: ${error}`;
          break;
        }
      }

      // Ask each question and get answer
      for (const question of questionsToAsk) {
        if (questionsAsked >= maxQuestions) break;

        console.log(`\nQ${questionsAsked + 1}: ${question}`);

        // Get recent transcript for persona context
        const recentContext = transcript
          .slice(-3)
          .map((t) => `Previously:\nQ: ${t.question}\nA: ${t.answer}`)
          .join("\n\n");

        const interviewPrompt = `You are embodying this persona:

${personaProfile}

${recentContext ? `\n---\nRECENT CONVERSATION:\n${recentContext}\n---\n` : ""}

You are being interviewed. Here is the question:

${question}

Answer as this persona would, naturally and authentically. Reference your specific situation, pain points, and experiences. Keep your answer conversational and natural (2-5 sentences).`;

        try {
          const answerResponse = await interviewAgent.generate(interviewPrompt);
          const answer = answerResponse.text;

          console.log(`A${questionsAsked + 1}: ${answer}`);

          transcript.push({ question, answer });
          questionsAsked++;

          // Update tracing
          tracingContext.currentSpan?.update({
            metadata: {
              phase: "question-answered",
              questionNumber: questionsAsked,
              progress: `${questionsAsked}/${maxQuestions}`,
            },
          });
        } catch (error) {
          console.error(
            `Failed to get answer for Q${questionsAsked + 1}:`,
            error
          );
          // Record placeholder and continue
          transcript.push({
            question,
            answer: "[Answer generation failed]",
          });
          questionsAsked++;
        }
      }
    }

    // Final tracing update
    tracingContext.currentSpan?.update({
      metadata: {
        phase: "interview-completed",
        totalQuestions: questionsAsked,
        earlyExit,
        exitReason,
      },
    });

    console.log(`\n=== INTERVIEW COMPLETED ===`);
    console.log(`Total questions: ${questionsAsked}/${maxQuestions}`);
    console.log(`Exit reason: ${exitReason}`);

    return {
      personaId,
      transcript,
      topic,
      questionCount: questionsAsked,
      industry,
      interviewMetadata: {
        totalQuestions: questionsAsked,
        earlyExit,
        exitReason,
        coverageAssessment,
      },
    };
  },
});
