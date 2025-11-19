import { z } from "zod";
import { createScorer } from "@mastra/core/scores";

// ============================================================================
// INTRA-INTERVIEW CONSISTENCY SCORER
// ============================================================================
// Analyzes consistency of persona behavior across all Q&A pairs within single interview
// Applied to: conduct-interview step

export const personaBehaviorConsistencyScorer = createScorer({
  name: "Persona Behavior Consistency",
  description:
    "Analyzes consistency of persona behavior across all Q&A pairs within the interview",
  judge: {
    model: "openai/gpt-4o-mini",
    instructions:
      "You are an expert at detecting inconsistencies in persona behavior and responses.",
  },
})
  .preprocess(({ run }) => {
    const transcript = run.output?.transcript || "";
    const personaSummary = run.input?.personaSummary || "";

    // Extract all answers for consistency analysis
    const answers = transcript.map(
      (t: { question: string; answer: string }) => t.answer
    );
    const questions = transcript.map(
      (t: { question: string; answer: string }) => t.question
    );

    return {
      transcript,
      answers,
      questions,
      personaSummary,
    };
  })
  .analyze({
    description:
      "Identify contradictions, tone shifts, and behavioral inconsistencies",
    outputSchema: z.object({
      contradictions: z
        .array(
          z.object({
            answer1Index: z.number(),
            answer2Index: z.number(),
            contradiction: z.string(),
            severity: z.enum(["minor", "moderate", "major"]),
          })
        )
        .default([]),
      toneConsistency: z.object({
        isConsistent: z.boolean().default(true),
        reasoning: z.string().default(""),
        score: z.number().min(0).max(1).default(0.8),
      }),
      behaviorConsistency: z.object({
        isConsistent: z.boolean().default(true),
        reasoning: z.string().default(""),
        score: z.number().min(0).max(1).default(0.8),
      }),
      overallConsistencyAssessment: z.string().default(""),
    }),
    createPrompt: ({ results }) => {
      const { transcript, personaSummary } = results.preprocessStepResult;
      return `
Analyze the consistency of this persona's responses throughout the interview:

PERSONA:
${personaSummary}

FULL TRANSCRIPT:
${transcript
  .map(
    (t: { question: string; answer: string }, i: number) => `
[${i + 1}]
Q: ${t.question}
A: ${t.answer}
`
  )
  .join("\n")}

Evaluate:
1. CONTRADICTIONS: Do any answers contradict each other? (e.g., says they have no budget, then mentions spending $10k)
2. TONE CONSISTENCY: Does the persona maintain consistent tone and language style?
3. BEHAVIORAL CONSISTENCY: Does the persona maintain consistent attitudes, priorities, and behaviors?

For each contradiction found, note the answer indices and severity (minor/moderate/major).

Return JSON with detected contradictions, tone consistency evaluation, and behavioral consistency evaluation.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;

    // Calculate penalties for contradictions
    const contradictionPenalty = (analysis.contradictions || []).reduce(
      (penalty, c) => {
        if (c.severity === "major") return penalty + 0.2;
        if (c.severity === "moderate") return penalty + 0.1;
        return penalty + 0.05;
      },
      0
    );

    // Average of tone and behavior consistency, minus contradiction penalties
    const toneScore = analysis.toneConsistency?.score || 0.8;
    const behaviorScore = analysis.behaviorConsistency?.score || 0.8;
    const baseScore = toneScore * 0.4 + behaviorScore * 0.6;

    const finalScore = Math.max(0, baseScore - contradictionPenalty);
    return Math.max(0, Math.min(1, finalScore));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    const contradictions = analysis.contradictions || [];
    const contradictionCount = contradictions.length;
    const majorContradictions = contradictions.filter(
      (c) => c.severity === "major"
    ).length;

    let reason = `Consistency Score: ${score.toFixed(2)}. `;

    if (contradictionCount === 0) {
      reason += "No contradictions detected. ";
    } else {
      reason += `${contradictionCount} contradiction(s) found`;
      if (majorContradictions > 0) {
        reason += ` (${majorContradictions} major)`;
      }
      reason += ". ";
    }

    const toneReasoning =
      analysis.toneConsistency?.reasoning || "Consistent tone";
    const behaviorReasoning =
      analysis.behaviorConsistency?.reasoning || "Consistent behavior";
    reason += `Tone: ${toneReasoning}. Behavior: ${behaviorReasoning}.`;

    return reason;
  });
