import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { personaQualityScorer } from "../../scorers/interview";

export const checkPersonaScoreStep = createStep({
  id: "check-persona-score",
  description:
    "Check persona quality score and determine if refinement is needed",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
    personaDescription: z.string(),
    context: z.string(),
    researchOutput: z.object({
      summary: z.string(),
      top_findings: z.array(z.string()),
      sources: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          relevance: z.string(),
        })
      ),
    }),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaDescription: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
    researchOutput: z.object({
      summary: z.string(),
      top_findings: z.array(z.string()),
      sources: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          relevance: z.string(),
        })
      ),
    }),
    needsRefinement: z.boolean(),
    qualityScore: z.number(),
    scorerFeedback: z
      .object({
        score: z.number(),
        completeness: z.object({
          score: z.number(),
          reasoning: z.string(),
          missingElements: z.array(z.string()),
        }),
        suitability: z.object({
          score: z.number(),
          reasoning: z.string(),
          misalignments: z.array(z.string()),
        }),
        specificity: z.object({
          score: z.number(),
          reasoning: z.string(),
          vagueAreas: z.array(z.string()),
        }),
      })
      .optional(),
  }),
  execute: async ({ inputData }) => {
    const {
      personaId,
      personaProfile,
      topic,
      questionCount,
      interviewFocus,
      industry,
      personaDescription,
      context,
      researchOutput,
    } = inputData;

    // Execute the scorer to evaluate persona quality
    console.log("\n=== EVALUATING PERSONA QUALITY ===");
    const scorerResult = await personaQualityScorer.run({
      input: {
        industry,
        context,
        personaDescription,
        interviewFocus,
        topic,
      },
      output: {
        personaProfile,
      },
    });

    const qualityScore = scorerResult.score;
    const analysis = scorerResult.analyzeStepResult;

    if (!analysis) {
      throw new Error("Scorer did not return analysis results");
    }

    const scorerFeedback = {
      score: qualityScore,
      completeness: analysis.completeness,
      suitability: analysis.suitability,
      specificity: analysis.specificity,
    };

    // Determine if refinement is needed based on threshold
    const SCORE_THRESHOLD = 0.95;
    const needsRefinement = qualityScore < SCORE_THRESHOLD;

    console.log(`Quality Score: ${qualityScore.toFixed(2)}`);
    console.log(`  Completeness: ${analysis.completeness.score.toFixed(2)}`);
    console.log(`  Suitability: ${analysis.suitability.score.toFixed(2)}`);
    console.log(`  Specificity: ${analysis.specificity.score.toFixed(2)}`);
    console.log(analysis);
    console.log(
      `Needs Refinement: ${needsRefinement ? "YES" : "NO"} (threshold: ${SCORE_THRESHOLD})`
    );

    if (needsRefinement) {
      console.log("⚠️  Persona quality below threshold - will refine");
    } else {
      console.log("✓ Persona quality meets threshold - proceeding");
    }

    return {
      personaId,
      personaProfile,
      topic,
      questionCount,
      interviewFocus,
      industry,
      personaDescription,
      context,
      researchOutput,
      needsRefinement,
      qualityScore,
      scorerFeedback: needsRefinement ? scorerFeedback : undefined,
    };
  },
});
