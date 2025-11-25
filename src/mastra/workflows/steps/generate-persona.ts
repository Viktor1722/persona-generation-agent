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

    if (researchOutput) {
      console.log(
        `--- Incorporating ${researchOutput.sources.length} Verified Sources ---`
      );

      const evidenceDossier = `
*** EVIDENCE DOSSIER (GROUND TRUTH) ***

SUMMARY:
${researchOutput.summary}

KEY FINDINGS:
${researchOutput.top_findings.map((f) => `- ${f}`).join("\n")}

VERIFIED SOURCES:
${researchOutput.sources.map((s, i) => `${i + 1}. [${s.title}](${s.url}) - ${s.relevance}`).join("\n")}
      `;

      personaPrompt += `
      ${evidenceDossier}
      
      *** INSTRUCTION ***
      You must ground the persona in the Evidence Dossier above.
      - If the research lists specific pain points, USE THEM.
      - If the research lists specific tools, USE THEM.
      - Do not invent problems if real ones are provided.
      *** END INSTRUCTION ***
      `;
    }

    personaPrompt += `
    Generate a complete persona profile following all guidelines. Ensure the voice and frustrations match the research provided.`;

    console.log("Sending prompt to Persona Agent...");
    const response = await personaAgent.generate(personaPrompt);
    console.log("Persona Generated Successfully");

    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
