import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

export const reviewResearchStep = createStep({
  id: "review-research",
  description: "Writes research findings to a file for human review",
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
  execute: async ({ inputData }) => {
    const {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
      researchOutput,
    } = inputData;

    console.log("\n\n=== REVIEW STEP ===");

    // Define report path
    const reportPath = path.join(process.cwd(), "research-report.md");

    const reportContent = `
# Research Report: ${personaDescription}
**Industry:** ${industry}
**Date:** ${new Date().toISOString()}

---

## Executive Summary
${researchOutput.summary}

## Top Findings
${researchOutput.top_findings.map((f) => `- ${f}`).join("\n")}

## Validated Sources
${researchOutput.sources.map((s) => `- [${s.title}](${s.url})\n  *Relevance: ${s.relevance}*`).join("\n")}

---
*End of Report*
    `.trim();

    // Write file to disk
    await fs.writeFile(reportPath, reportContent, "utf-8");

    console.log(`✅ Research report written to: ${reportPath}`);

    return {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
      researchOutput,
    };
  },
});
