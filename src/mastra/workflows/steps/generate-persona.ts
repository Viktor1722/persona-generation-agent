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
    researchContext: z.string(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
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
      researchContext,
    } = inputData;

    const personaAgent = mastra?.getAgent("personaAgent");

    if (!personaAgent) {
      throw new Error("Persona Agent not found");
    }

    // Create a comprehensive prompt for persona generation
    console.log("\n\n=== GENERATING PERSONA ===");
    console.log("Research Context Found:", researchContext ? "YES" : "NO");

    let personaPrompt = `Create a detailed persona for: ${personaDescription}
    
    Industry: ${industry}
    Context: ${context}
    `;

    if (researchContext) {
      console.log("--- Research Data (Snippet) ---");
      console.log(researchContext + "...");
      console.log("--------------------------------");

      personaPrompt += `
      
      *** RESEARCH DATA (GROUND TRUTH) ***
      Use the following real-world research to ground this persona in reality. 
      Incorporate specific quotes, pain points, and behavioral patterns found in the research.
      
      ${researchContext}
      
      *** END RESEARCH DATA ***
      `;
    }

    personaPrompt += `
    Generate a complete persona profile following all guidelines. Ensure the voice and frustrations match the research provided.`;

    console.log("Sending prompt to Persona Agent...");
    const response = await personaAgent.generate(personaPrompt);
    console.log("Persona Generated Successfully");

    // Generate a unique ID for this persona
    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract a brief summary (first few lines or overview section)
    const personaProfile = response.text;
    const lines = personaProfile.split("\n").filter((line) => line.trim());
    const summaryLines = lines.slice(0, 5).join(" ").substring(0, 200);
    const personaSummary = summaryLines + "...";

    return {
      personaId,
      personaProfile,
      personaSummary,
      topic,
      questionCount,
      interviewFocus,
      industry,
    };
  },
});
