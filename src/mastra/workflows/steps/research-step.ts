import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  debugAndValidateAgentResult,
  validateAgentSchema,
  type AgentGenerateResult,
} from "../../tools/agent-debugger";

const ResearchReportSchema = z.object({
  summary: z
    .string()
    .describe("A comprehensive summary of the research findings"),
  top_findings: z
    .array(z.string())
    .describe("Array of key findings from the research"),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        relevance: z.string(),
      })
    )
    .describe("Array of source references used in the research"),
});

export const researchStep = createStep({
  id: "research-persona",
  description:
    "Conducts digital ethnography research to gather authentic data for the persona",
  inputSchema: z.object({
    personaDescription: z.string(),
    industry: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number().default(10),
    interviewFocus: z.string(),
  }),
  outputSchema: z.object({
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
  execute: async ({ inputData, mastra, tracingContext }) => {
    const {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
    } = inputData;

    const logger = mastra?.getLogger();
    const researchAgent = mastra?.getAgent("researchAgent");

    if (!researchAgent) {
      throw new Error("Research Agent not found");
    }

    tracingContext.currentSpan?.update({
      metadata: {
        personaDescription,
        industry,
        topic,
      },
    });

    const researchPrompt = `
        Research a realistic persona: "${personaDescription}" in the "${industry}" industry.

        Context: ${context}
        Interview Topic: ${topic}
        Interview Focus: ${interviewFocus}

        Conduct comprehensive research using the Brave Search tool. Make multiple searches with queries like:
        - "day in the life of a ${personaDescription}"
        - "${personaDescription} pain points reddit"
        - "site:reddit.com ${personaDescription} complaints"
        - "${personaDescription} salary and responsibilities"
        - "${industry} ${personaDescription} challenges"

        Gather authentic insights about their daily reality, pain points, language/terminology they use, and professional context.

        IMPORTANT: You MUST use the braveSearchTool multiple times to gather comprehensive data. Make at least 5-7 searches with different queries.
    `;

    try {
      const result = await researchAgent.generate(researchPrompt, {
        maxSteps: 25,
        output: ResearchReportSchema,
      });

      const rawObject = debugAndValidateAgentResult(
        result as AgentGenerateResult<z.infer<typeof ResearchReportSchema>>,
        {
          stepName: "research-persona",
          agentName: "researchAgent",
          maxSteps: 25,
        }
      );

      const researchOutput = validateAgentSchema(
        rawObject,
        ResearchReportSchema,
        {
          stepName: "research-persona",
          agentName: "researchAgent",
        }
      );

      tracingContext.currentSpan?.update({
        metadata: {
          sourcesFound: researchOutput.sources?.length || 0,
          findingsCount: researchOutput.top_findings?.length || 0,
          summaryLength: researchOutput.summary?.length || 0,
        },
      });

      return {
        personaDescription,
        industry,
        context,
        topic,
        questionCount,
        interviewFocus,
        researchOutput,
      };
    } catch (error: any) {
      logger?.error("❌ Error during research execution:", error);

      tracingContext.currentSpan?.update({
        metadata: {
          error: error.message,
          errorStack: error.stack,
        },
      });

      throw new Error(`Research step failed: ${error.message}`);
    }
  },
});
