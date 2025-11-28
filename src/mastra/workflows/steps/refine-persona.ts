import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { personaQualityScorer } from "../../scorers/interview";

export const refinePersonaStep = createStep({
  id: "refine-persona",
  description:
    "Refine persona based on quality scorer feedback to improve the score",
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
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaDescription: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
    originalPersona: z.string(),
    originalScore: z.number(),
    refinedScore: z.number(),
    improvementNotes: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const {
      personaId,
      personaProfile,
      personaDescription,
      topic,
      questionCount,
      interviewFocus,
      industry,
      context,
      scorerFeedback,
      researchOutput,
      qualityScore,
    } = inputData;

    const personaAgent = mastra?.getAgent("personaAgent");

    if (!personaAgent) {
      throw new Error("Persona Agent not found");
    }

    // scorerFeedback should always exist when this step is called, but check anyway
    if (!scorerFeedback) {
      throw new Error("Scorer feedback is required for refinement");
    }

    console.log("\n\n=== REFINING PERSONA ===");
    console.log(`Original Score: ${qualityScore.toFixed(2)}`);
    console.log(
      `Target Score: 0.95 (attempting improvement based on feedback)`
    );

    // Build detailed improvement prompt with scorer feedback
    const improvementPrompt = `You are refining an existing persona to make it perfect for a specific interview context.

ORIGINAL PERSONA:
"""
${personaProfile}
"""

CONTEXT FOR THIS PERSONA:
- Industry: ${industry}
- Context: ${context}
- Description: ${personaDescription}
- Interview Topic: ${topic}
- Interview Focus: ${interviewFocus}

QUALITY ASSESSMENT (Score: ${scorerFeedback.score.toFixed(2)} / 1.0):

1. COMPLETENESS (${scorerFeedback.completeness.score.toFixed(2)}):
   ${scorerFeedback.completeness.reasoning}
   ${scorerFeedback.completeness.missingElements.length > 0 ? `Missing Elements:\n${scorerFeedback.completeness.missingElements.map((e) => `   - ${e}`).join("\n")}` : ""}

2. SUITABILITY (${scorerFeedback.suitability.score.toFixed(2)}):
   ${scorerFeedback.suitability.reasoning}
   ${scorerFeedback.suitability.misalignments.length > 0 ? `Misalignments:\n${scorerFeedback.suitability.misalignments.map((m) => `   - ${m}`).join("\n")}` : ""}

3. SPECIFICITY (${scorerFeedback.specificity.score.toFixed(2)}):
   ${scorerFeedback.specificity.reasoning}
   ${scorerFeedback.specificity.vagueAreas.length > 0 ? `Vague Areas:\n${scorerFeedback.specificity.vagueAreas.map((v) => `   - ${v}`).join("\n")}` : ""}

RESEARCH-BASED EVIDENCE (MUST USE):
Summary: ${researchOutput.summary}

Key Findings:
${researchOutput.top_findings.map((f) => `- ${f}`).join("\n")}

Verified Sources:
${researchOutput.sources.map((s, i) => `${i + 1}. [${s.title}](${s.url}) - ${s.relevance}`).join("\n")}

*** REFINEMENT INSTRUCTIONS ***
1. Address ALL missing elements identified in the completeness feedback
2. Fix ALL misalignments identified in the suitability feedback
3. Make ALL vague areas more specific as identified in the specificity feedback
4. Ground ALL improvements in the research evidence provided above
5. Maintain the persona structure and format
6. Keep all good elements from the original persona
7. Ensure the persona is highly suitable for interviews about "${topic}" with focus on "${interviewFocus}"

Generate the COMPLETE refined persona following all guidelines. Make it perfect for the interview purpose.`;

    console.log("Sending refinement prompt to Persona Agent...");
    const response = await personaAgent.generate(improvementPrompt);
    console.log("Refined Persona Generated Successfully");

    const refinedPersonaProfile = response.text;

    // Re-score the refined persona to verify improvement
    console.log("\n=== EVALUATING REFINED PERSONA QUALITY ===");
    const refinedScorerResult = await personaQualityScorer.run({
      input: {
        industry,
        context,
        personaDescription,
        interviewFocus,
        topic,
      },
      output: {
        personaProfile: refinedPersonaProfile,
      },
    });

    const refinedScore = refinedScorerResult.score;
    const refinedAnalysis = refinedScorerResult.analyzeStepResult;

    if (!refinedAnalysis) {
      throw new Error("Refined scorer did not return analysis results");
    }

    console.log(`Original Score: ${qualityScore.toFixed(2)}`);
    console.log(`Refined Score: ${refinedScore.toFixed(2)}`);
    console.log(
      `Improvement: ${refinedScore > qualityScore ? "✅" : "⚠️"} ${((refinedScore - qualityScore) * 100).toFixed(1)}%`
    );
    console.log(
      `  Completeness: ${refinedAnalysis.completeness.score.toFixed(2)} (was ${scorerFeedback.completeness.score.toFixed(2)})`
    );
    console.log(
      `  Suitability: ${refinedAnalysis.suitability.score.toFixed(2)} (was ${scorerFeedback.suitability.score.toFixed(2)})`
    );
    console.log(
      `  Specificity: ${refinedAnalysis.specificity.score.toFixed(2)} (was ${scorerFeedback.specificity.score.toFixed(2)})`
    );

    // Create improvement notes
    const improvementNotes = `Persona refined to address:
- Completeness issues: ${scorerFeedback.completeness.missingElements.join(", ") || "None"}
- Suitability concerns: ${scorerFeedback.suitability.misalignments.join(", ") || "None"}
- Specificity gaps: ${scorerFeedback.specificity.vagueAreas.join(", ") || "None"}
Original score: ${qualityScore.toFixed(2)} → Refined score: ${refinedScore.toFixed(2)}`;

    return {
      personaId,
      personaProfile: refinedPersonaProfile,
      personaDescription,
      topic,
      questionCount,
      interviewFocus,
      industry,
      originalPersona: personaProfile,
      originalScore: qualityScore,
      refinedScore: refinedScore,
      improvementNotes,
    };
  },
});
