import { z } from "zod";
import { createScorer } from "@mastra/core/scores";

// ============================================================================
// MULTI-INTERVIEW CONSISTENCY SCORER
// ============================================================================
// Compares persona behavior across multiple interview runs
// Used via experiments/batch evaluation

export const multiInterviewConsistencyScorer = createScorer({
  name: "Multi-Interview Consistency",
  description:
    "Compares persona behavior patterns across multiple interview runs",
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "You are an expert at comparing persona consistency across multiple interviews.",
  },
})
  .preprocess(({ run }) => {
    // This scorer is designed to work with batch evaluation
    // The input should contain multiple interview results
    const currentInterview = run.output;
    const previousInterviews = run.input?.previousInterviews || [];

    return {
      currentInterview,
      previousInterviews,
    };
  })
  .analyze({
    description: "Compare persona behavior across multiple interviews",
    outputSchema: z.object({
      consistencyAcrossInterviews: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
      }),
      behaviorDifferences: z.array(z.string()),
      toneDifferences: z.array(z.string()),
      overallAssessment: z.string(),
    }),
    createPrompt: ({ results }) => {
      const { currentInterview, previousInterviews } =
        results.preprocessStepResult;

      return `
Compare the persona's behavior across multiple interviews:

CURRENT INTERVIEW:
${JSON.stringify(currentInterview, null, 2)}

PREVIOUS INTERVIEWS:
${JSON.stringify(previousInterviews, null, 2)}

Evaluate:
1. Does the persona maintain consistent personality traits?
2. Are pain points and priorities consistent?
3. Is the tone and language style consistent?
4. Are there any contradictions between interviews?

Rate overall consistency from 0 (completely inconsistent) to 1 (perfectly consistent).

Return JSON with consistency score, identified differences, and overall assessment.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;
    return Math.max(0, Math.min(1, analysis.consistencyAcrossInterviews.score));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    return `Multi-Interview Consistency Score: ${score.toFixed(2)}. ${analysis.overallAssessment}`;
  });
