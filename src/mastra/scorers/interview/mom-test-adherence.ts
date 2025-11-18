import { z } from "zod";
import { createScorer } from "@mastra/core/scores";

// ============================================================================
// MOM TEST ADHERENCE SCORER
// ============================================================================
// Detects hypothetical questions that violate Mom Test principles
// Applied to: generate-questions step

export const momTestAdherenceScorer = createScorer({
  name: "Mom Test Adherence",
  description:
    'Detects hypothetical questions ("Would you...?", "If you...") that violate Mom Test principles',
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "You are an expert in The Mom Test methodology for customer interviews.",
  },
})
  .preprocess(({ run }) => {
    const questions = run.output?.questions || [];
    return { questions };
  })
  .analyze({
    description: "Detect hypothetical questions and Mom Test violations",
    outputSchema: z.object({
      questionEvaluations: z.array(
        z.object({
          question: z.string(),
          isHypothetical: z.boolean(),
          violationType: z.enum([
            "hypothetical_would",
            "hypothetical_if",
            "leading",
            "compliment",
            "none",
          ]),
          reasoning: z.string(),
        })
      ),
      hypotheticalCount: z.number(),
      totalQuestions: z.number(),
    }),
    createPrompt: ({ results }) => {
      const { questions } = results.preprocessStepResult;
      return `
Evaluate these interview questions against The Mom Test principles, specifically focusing on avoiding hypothetical questions:

QUESTIONS:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

The Mom Test emphasizes:
- Ask about PAST behaviors and experiences (not "Would you...?" or "If we built...")
- Avoid hypothetical scenarios
- Don't ask leading questions
- Focus on specifics, not opinions

For each question, identify:
1. Is it hypothetical? (Contains "would you", "if you", "imagine if", etc.)
2. What type of violation (if any)?
3. Why it passes or fails the Mom Test

Return JSON with evaluation for each question, plus counts.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;
    if (analysis.totalQuestions === 0) return 0;

    // Score = percentage of questions that pass Mom Test (non-hypothetical)
    const passCount = analysis.totalQuestions - analysis.hypotheticalCount;
    const score = passCount / analysis.totalQuestions;

    return Math.max(0, Math.min(1, score));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    const violations = analysis.questionEvaluations.filter(
      (q) => q.isHypothetical
    );

    if (violations.length === 0) {
      return `Mom Test Adherence Score: ${score.toFixed(2)}. All ${analysis.totalQuestions} questions follow Mom Test principles by avoiding hypotheticals.`;
    }

    const violationExamples = violations
      .slice(0, 2)
      .map((v) => `"${v.question}" (${v.violationType})`)
      .join("; ");

    return `Mom Test Adherence Score: ${score.toFixed(2)}. ${analysis.hypotheticalCount} of ${analysis.totalQuestions} questions are hypothetical. Examples: ${violationExamples}`;
  });
