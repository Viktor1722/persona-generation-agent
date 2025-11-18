import { z } from "zod";
import { createScorer } from "@mastra/core/scores";

// ============================================================================
// TOPIC RELEVANCE SCORER
// ============================================================================
// Evaluates if questions match the input topic and interview focus
// Applied to: generate-questions step

export const topicRelevanceScorer = createScorer({
  name: "Topic Relevance",
  description:
    "Evaluates if generated questions align with the specified topic and interview focus",
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "You are an expert at evaluating whether interview questions align with specified topics and objectives.",
  },
})
  .preprocess(({ run }) => {
    const questions = run.output?.questions || [];
    const topic = run.input?.topic || "";
    const interviewFocus = run.input?.interviewFocus || "";
    const industry = run.input?.industry || "";

    return {
      questions,
      topic,
      interviewFocus,
      industry,
    };
  })
  .analyze({
    description: "Analyze alignment between questions and topic/focus",
    outputSchema: z.object({
      overallAlignment: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
      }),
      questionAlignments: z.array(
        z.object({
          question: z.string(),
          isRelevantToTopic: z.boolean(),
          isRelevantToFocus: z.boolean(),
          alignmentScore: z.number().min(0).max(1),
          reasoning: z.string(),
        })
      ),
      overallAssessment: z.string(),
    }),
    createPrompt: ({ results }) => {
      const { questions, topic, interviewFocus, industry } =
        results.preprocessStepResult;
      return `
Evaluate how well these interview questions align with the specified topic and focus:

SPECIFIED TOPIC: ${topic}
INTERVIEW FOCUS: ${interviewFocus}
INDUSTRY CONTEXT: ${industry}

QUESTIONS TO EVALUATE:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

For each question, evaluate:
1. Does it directly relate to the specified topic (${topic})?
2. Does it address the interview focus (${interviewFocus})?
3. Is it appropriate for the industry context (${industry})?

Rate each question's alignment from 0 (completely off-topic) to 1 (perfectly aligned).

Provide an overall alignment score and assessment.

Return JSON with overall alignment score, individual question evaluations, and overall assessment.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;
    return Math.max(0, Math.min(1, analysis.overallAlignment.score));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    const relevantCount = analysis.questionAlignments.filter(
      (q) => q.isRelevantToTopic && q.isRelevantToFocus
    ).length;
    const totalCount = analysis.questionAlignments.length;
    return `Topic Relevance Score: ${score.toFixed(2)}. ${relevantCount} of ${totalCount} questions align with both the topic and interview focus. ${analysis.overallAssessment}`;
  });
