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

    let personaPrompt = `Create a detailed persona for: ${personaDescription}
    
    Industry: ${industry}
    Context: ${context}
    `;

    personaPrompt += `
    Generate a complete persona profile following all guidelines. Ensure the voice and frustrations match the research provided.`;

    const response = await personaAgent.generate(personaPrompt);
    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const personaProfile = response.text;

    console.log(`\n=== PERSONA GENERATED ===`);
    console.log(`Persona ID: ${personaId}`);
    console.log(`Profile length: ${personaProfile.length} characters`);

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
    };
  },
});
