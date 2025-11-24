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
      "You are an expert evaluator of user personas for product research and customer discovery and problem discovery and solution discovery. You have to evaluate the persona based on the industry, context, and description provided. You are critical and examine if the persona is really useful or not for the purpose of the interviews. Additionally you look at all of the components that the persona has and if something is missing or you think its not well included you flag it. Also use simple words dont use complex words and dont use jargon. Also include in the reasoning substantiation why some components are missing or not well included. Also include in the reasoning why the score is what it is and what needs to be added to improve the score and make it perfect.",
  },
})
  .preprocess(({ run }) => {
    // Extract persona profile and input requirements
    const personaProfile = run.output?.personaProfile || "";
    const industry = run.input?.industry || "";
    const context = run.input?.context || "";
    const personaDescription = run.input?.personaDescription || "";
    const interviewFocus = run.input?.interviewFocus || "";
    const topic = run.input?.topic || "";

    return {
      personaProfile,
      industry,
      context,
      personaDescription,
      interviewFocus,
      topic,
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
      suitability: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
        misalignments: z.array(z.string()),
      }),
      specificity: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
        vagueAreas: z.array(z.string()),
      }),
    }),
    createPrompt: ({ results }) => {
      const {
        personaProfile,
        industry,
        context,
        personaDescription,
        interviewFocus,
        topic,
      } = results.preprocessStepResult;
      return `
Evaluate the quality of this persona profile specifically for the intended interview context:

PERSONA PROFILE:
"""
${personaProfile}
"""

REQUIRED CONTEXT:
- Industry: ${industry}
- Context: ${context}
- Description: ${personaDescription}
- Interview Topic: ${topic}
- Interview Focus/Objective: ${interviewFocus}

Evaluate across three dimensions:

1. COMPLETENESS (0-1): Does the persona include key elements like demographics, goals, pain points, behaviors, motivations, and challenges?
   - List any missing critical elements
   
2. SUITABILITY FOR INTERVIEW (0-1): Is this persona the RIGHT person to interview for the topic "${topic}" with the specific focus on "${interviewFocus}"?
   - Does the persona have the specific experience or problems needed to answer questions about this focus?
   - Don't penalize for missing details if they are irrelevant to the interview focus.
   - List any reasons why this persona might not be suitable for this specific interview goal.

3. SPECIFICITY (0-1): Is the persona specific and detailed in areas RELEVANT to the interview focus?
   - List any areas that are too vague, especially those that matter for the interview topic.
   - It is okay to be vague about irrelevant details (e.g. hobbies, if the interview is about B2B accounting software), but critical details must be specific.

Evaluates whether personality is coherent, contradictory where realistic, and grounded in Big Five traits.
Checks that motivations are specific to the role and decision-making processes are realistic.
Each pain point must be concrete.

Return JSON matching the schema with scores, reasoning, and identified issues.
      `.trim();
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult;
    const score =
      analysis.completeness.score * 0.2 +
      analysis.suitability.score * 0.5 +
      analysis.specificity.score * 0.3;
    return Math.max(0, Math.min(1, score));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult;
    return `Persona Quality Score: ${score.toFixed(2)}. Completeness: ${analysis.completeness.score.toFixed(2)} (${analysis.completeness.reasoning}). Suitability: ${analysis.suitability.score.toFixed(2)} (${analysis.suitability.reasoning}). Specificity: ${analysis.specificity.score.toFixed(2)} (${analysis.specificity.reasoning}).`;
  });
