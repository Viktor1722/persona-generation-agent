import { z } from "zod";
import { createScorer } from "@mastra/core/scores";

// ============================================================================
// BEHAVIORAL ACCURACY SCORER
// ============================================================================
// Evaluates if answers match what the specific persona group would actually say
// Applied to: conduct-interview step

export const behavioralAccuracyScorer = createScorer({
  name: "Behavioral Accuracy",
  description:
    "Evaluates if answers match what the specific persona group would actually say",
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "You are an expert at evaluating persona authenticity and behavioral realism in customer interviews.",
  },
})
  .preprocess(({ run }) => {
    const personaSummary = run.input?.personaSummary || "";
    const transcript = run.output?.transcript || [];
    const industry = run.input?.industry || "";

    return {
      personaSummary,
      transcript,
      industry,
    };
  })
  .analyze({
    description:
      "Evaluate if answers are behaviorally accurate for the persona",
    outputSchema: z.object({
      answerEvaluations: z.array(
        z.object({
          question: z.string(),
          answer: z.string(),
          isBehaviorallyAccurate: z.boolean(),
          accuracyScore: z.number().min(0).max(1),
          reasoning: z.string(),
        })
      ),
      overallAuthenticity: z.string(),
    }),
    createPrompt: ({ results }) => {
      const { personaSummary, transcript, industry } =
        results.preprocessStepResult;
      return `
Evaluate whether the interview answers are behaviorally accurate for this persona:

PERSONA:
${personaSummary}

INDUSTRY: ${industry}

INTERVIEW TRANSCRIPT:
${transcript
  .map(
    (t: { question: string; answer: string }, i: number) => `
Q${i + 1}: ${t.question}
A${i + 1}: ${t.answer}
`
  )
  .join("\n")}

For each answer, evaluate:
1. Would someone in this persona group actually say this?
2. Does the answer reflect realistic behaviors, pain points, and language for this persona?
3. Are the responses authentic or do they seem artificial/idealized?

Rate each answer's behavioral accuracy from 0 (unrealistic) to 1 (highly authentic).

Return JSON with evaluation for each Q&A pair and overall authenticity assessment.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;
    if (
      !analysis.answerEvaluations ||
      analysis.answerEvaluations.length === 0
    ) {
      return 0;
    }

    const avgScore =
      analysis.answerEvaluations.reduce((sum, a) => sum + a.accuracyScore, 0) /
      analysis.answerEvaluations.length;

    return Math.max(0, Math.min(1, avgScore));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    const accurateCount = analysis.answerEvaluations.filter(
      (a) => a.isBehaviorallyAccurate
    ).length;
    const totalCount = analysis.answerEvaluations.length;
    return `Behavioral Accuracy Score: ${score.toFixed(2)}. ${accurateCount} of ${totalCount} answers are behaviorally accurate for the persona. ${analysis.overallAuthenticity}`;
  });
