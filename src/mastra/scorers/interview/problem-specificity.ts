import { z } from "zod";
import { createScorer } from "@mastra/core/scores";

// ============================================================================
// PROBLEM SPECIFICITY SCORER
// ============================================================================
// Verifies that questions address the specific problem defined in input
// Applied to: generate-questions step

export const problemSpecificityScorer = createScorer({
  name: "Problem Specificity",
  description:
    "Verifies questions address the specific problem defined in input",
  judge: {
    model: "openai/gpt-5",
    instructions:
      "You are an expert at evaluating whether interview questions are tailored to specific problems.",
  },
})
  .preprocess(({ run }) => {
    const questions = run.output?.questions || "";
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
    description:
      "Evaluate if each question is tailored to the specific problem",
    outputSchema: z.object({
      questionAnalysis: z.array(
        z.object({
          question: z.string(),
          isSpecificToProblem: z.boolean(),
          reasoning: z.string(),
          specificityScore: z.number().min(0).max(1),
        })
      ),
      overallAssessment: z.string(),
    }),
    createPrompt: ({ results }) => {
      const { questions, topic, interviewFocus, industry } =
        results.preprocessStepResult;
      return `
Evaluate whether these interview questions are specifically tailored to the defined problem:

DEFINED PROBLEM/FOCUS:
- Topic: ${topic}
- Interview Focus: ${interviewFocus}
- Industry: ${industry}

QUESTIONS TO EVALUATE:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

For each question, determine:
1. Is it specifically tailored to the problem/focus area?
2. Would it help validate or understand the specific problem mentioned?
3. Is it generic (could apply to any problem) or targeted?

Rate each question's specificity from 0 (generic) to 1 (highly specific to the problem).

Return JSON with analysis for each question and an overall assessment.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;
    if (!analysis.questionAnalysis || analysis.questionAnalysis.length === 0) {
      return 0;
    }

    const avgScore =
      analysis.questionAnalysis.reduce(
        (sum, q) => sum + q.specificityScore,
        0
      ) / analysis.questionAnalysis.length;

    return Math.max(0, Math.min(1, avgScore));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    const specificCount = analysis.questionAnalysis.filter(
      (q) => q.isSpecificToProblem
    ).length;
    const totalCount = analysis.questionAnalysis.length;
    return `Problem Specificity Score: ${score.toFixed(2)}. ${specificCount} of ${totalCount} questions are specifically tailored to the defined problem. ${analysis.overallAssessment}`;
  });
