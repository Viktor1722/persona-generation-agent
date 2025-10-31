/**
 * Test Script for Synthetic Interview Workflow
 *
 * This script demonstrates how to use the synthetic interview workflow
 * to generate a persona, create questions, and conduct an automated interview.
 *
 * Usage:
 * 1. Make sure you have your environment variables set up (API keys, etc.)
 * 2. Run: npx tsx test-synthetic-interview.ts
 */

import { mastra } from "./src/mastra/index.js";

async function testSyntheticInterview() {
  console.log("🚀 Starting Synthetic Interview Workflow Test...\n");

  try {
    // Get the workflow
    const workflow = mastra.getWorkflow("syntheticInterviewWorkflow");

    if (!workflow) {
      throw new Error("Synthetic Interview Workflow not found!");
    }

    // Define test input
    const testInput = {
      // Persona requirements
      personaDescription:
        "non-technical business owner of a small-to-medium enterprise (SME)",
      industry: "Retail/E-commerce",
      context:
        "Running a growing online boutique with 5-10 employees, handling inventory, orders, and customer service. Not very tech-savvy but willing to adopt tools that are easy to use.",

      // Interview requirements
      topic: "financial software for business finance management",
      questionCount: 8,
      interviewFocus:
        "pain points with current accounting processes, willingness to adopt new software, decision-making process for business tools",
    };

    console.log("📋 Test Configuration:");
    console.log("- Persona: " + testInput.personaDescription);
    console.log("- Industry: " + testInput.industry);
    console.log("- Topic: " + testInput.topic);
    console.log("- Questions: " + testInput.questionCount);
    console.log("\n⏳ Running workflow (this may take a few minutes)...\n");

    // Create a workflow run instance and execute it
    const run = await workflow.createRunAsync();
    const result = await run.start({ inputData: testInput });

    // Check workflow status
    if (result.status !== "success") {
      throw new Error(
        `Workflow failed with status: ${result.status}. ${result.status === "failed" ? result.error?.message : ""}`
      );
    }

    // Display results
    console.log("\n✅ Workflow Completed Successfully!\n");
    console.log("=".repeat(80));
    console.log("SYNTHETIC INTERVIEW RESULTS");
    console.log("=".repeat(80));

    const output = result.result;
    console.log("\n📊 Metadata:");
    console.log(`  Persona ID: ${output.personaId}`);
    console.log(`  Interview ID: ${output.interviewId}`);
    console.log(`  Topic: ${output.metadata.topic}`);
    console.log(`  Industry: ${output.metadata.industry}`);
    console.log(`  Questions Asked: ${output.metadata.questionCount}`);
    console.log(`  Conducted At: ${output.metadata.conductedAt}`);

    console.log("\n👤 Persona Summary:");
    console.log(`  ${output.personaSummary}`);

    console.log("\n" + "=".repeat(80));
    console.log("INTERVIEW TRANSCRIPT");
    console.log("=".repeat(80) + "\n");

    output.transcript.forEach((qa: any, index: number) => {
      console.log(`Q${index + 1}: ${qa.question}`);
      console.log(`\nA${index + 1}: ${qa.answer}`);
      console.log("\n" + "-".repeat(80) + "\n");
    });

    console.log("=".repeat(80));
    console.log("END OF INTERVIEW");
    console.log("=".repeat(80));

    return output;
  } catch (error) {
    console.error("\n❌ Error running workflow:", error);
    throw error;
  }
}

// Run the test
testSyntheticInterview()
  .then(() => {
    console.log("\n✨ Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  });
