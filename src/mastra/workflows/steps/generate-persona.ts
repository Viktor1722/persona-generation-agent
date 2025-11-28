import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { personaQualityScorer } from "../../scorers/interview";

export const generatePersonaStep = createStep({
  id: "generate-persona",
  description: "Generate a detailed persona based on requirements and research",
  inputSchema: z.object({
    personaDescription: z.string(),
    industry: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
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

    // Quality score from scorer
    qualityScore: z.number(),
    scorerFeedback: z.object({
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
    }),
  }),
  scorers: {
    personaQuality: {
      scorer: personaQualityScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  // Scorer is run manually in execute() to include results in output for branching
  execute: async ({ inputData, mastra }) => {
    const {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
      researchOutput,
    } = inputData;

    const personaAgent = mastra?.getAgent("personaAgent");

    if (!personaAgent) {
      throw new Error("Persona Agent not found");
    }

    // Create a comprehensive prompt for persona generation
    console.log("\n\n=== GENERATING PERSONA ===");

    let personaPrompt = `Create a detailed persona for: ${personaDescription}
    
    Industry: ${industry}
    Context: ${context}
    `;

    personaPrompt += `
    Generate a complete persona profile following all guidelines. Ensure the voice and frustrations match the research provided.`;

    console.log("Sending prompt to Persona Agent...");
    const response = await personaAgent.generate(personaPrompt);
    console.log("Persona Generated Successfully");

    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const personaProfile = response.text;

    // Run the quality scorer immediately to get the score for branching
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

    console.log(`Quality Score: ${qualityScore.toFixed(2)}`);
    console.log(`  Completeness: ${analysis.completeness.score.toFixed(2)}`);
    console.log(`  Suitability: ${analysis.suitability.score.toFixed(2)}`);
    console.log(`  Specificity: ${analysis.specificity.score.toFixed(2)}`);

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
      qualityScore,
      scorerFeedback: {
        score: qualityScore,
        completeness: analysis.completeness,
        suitability: analysis.suitability,
        specificity: analysis.specificity,
      },
    };
  },
});
