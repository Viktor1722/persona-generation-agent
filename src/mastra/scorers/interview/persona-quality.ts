import { z } from "zod";
import { createScorer } from "@mastra/core/scores";

// ============================================================================
// PERSONA QUALITY SCORER
// ============================================================================
// Evaluates the quality, completeness, and relevance of generated personas
// Applied to: generate-persona step

export const personaQualityScorer = createScorer({
  name: "Persona Quality",
  description:
    "Evaluates persona completeness, specificity, and relevance to industry/context",
  judge: {
    model: "openai/gpt-5",
    instructions:
      "You are an expert evaluator of user personas for product research and customer discovery.",
  },
})
  .preprocess(({ run }) => {
    // Extract persona profile and input requirements
    const personaProfile = run.output?.personaProfile || "";
    const industry = run.input?.industry || "";
    const context = run.input?.context || "";
    const personaDescription = run.input?.personaDescription || "";

    return {
      personaProfile,
      industry,
      context,
      personaDescription,
    };
  })
  .analyze({
    description: "Analyze persona quality across multiple dimensions",
    outputSchema: z.object({
      completeness: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
        missingElements: z.array(z.string()),
      }),
      specificity: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
        vagueAreas: z.array(z.string()),
      }),
      relevance: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
        alignmentIssues: z.array(z.string()),
      }),
    }),
    createPrompt: ({ results }) => {
      const { personaProfile, industry, context, personaDescription } =
        results.preprocessStepResult;
      return `
Evaluate the quality of this persona profile:

PERSONA PROFILE:
"""
${personaProfile}
"""

REQUIRED CONTEXT:
- Industry: ${industry}
- Context: ${context}
- Description: ${personaDescription}

Evaluate across three dimensions:

1. COMPLETENESS (0-1): Does the persona include key elements like demographics, goals, pain points, behaviors, motivations, and challenges?
   - List any missing critical elements
   
2. SPECIFICITY (0-1): Is the persona specific and detailed, or vague and generic?
   - List any areas that are too vague
   
3. RELEVANCE (0-1): Does the persona align with the industry, context, and description provided?
   - List any alignment issues

Return JSON matching the schema with scores, reasoning, and identified issues.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;
    // Weighted average: completeness 40%, specificity 30%, relevance 30%
    const score =
      analysis.completeness.score * 0.4 +
      analysis.specificity.score * 0.3 +
      analysis.relevance.score * 0.3;
    return Math.max(0, Math.min(1, score));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    return `Persona Quality Score: ${score.toFixed(2)}. Completeness: ${analysis.completeness.score.toFixed(2)} (${analysis.completeness.reasoning}). Specificity: ${analysis.specificity.score.toFixed(2)} (${analysis.specificity.reasoning}). Relevance: ${analysis.relevance.score.toFixed(2)} (${analysis.relevance.reasoning}).`;
  });
