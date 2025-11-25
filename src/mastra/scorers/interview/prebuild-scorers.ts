/**
 * Pre-built Scorers from Mastra
 *
 * This file exports Mastra's built-in scorers for evaluating AI outputs.
 * These scorers are optimized for common evaluation scenarios and ready to use.
 *
 * Documentation: https://mastra.ai/docs/scorers/built-in-scorers
 */

import {
  createAnswerRelevancyScorer,
  createFaithfulnessScorer,
  createHallucinationScorer,
  createPromptAlignmentScorerLLM,
} from "@mastra/evals/scorers/llm";

/**
 * Answer Relevancy Scorer
 * Evaluates how well responses address the input query (0-1, higher is better)
 */
export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: {
    id: "openai/gpt-4o-mini",
  },
});

/**
 * Faithfulness Scorer
 * Measures how accurately responses represent provided context (0-1, higher is better)
 */
export const faithfulnessScorer = createFaithfulnessScorer({
  model: {
    id: "openai/gpt-4o-mini",
  },
});

/**
 * Hallucination Scorer
 * Detects factual contradictions and unsupported claims (0-1, lower is better)
 */
export const hallucinationScorer = createHallucinationScorer({
  model: {
    id: "openai/gpt-5",
  },
});

/**
 * Prompt Alignment Scorer
 * Measures how well agent responses align with user prompt intent, requirements,
 * completeness, and format (0-1, higher is better)
 */
export const promptAlignmentScorer = createPromptAlignmentScorerLLM({
  model: {
    id: "openai/gpt-4o-mini",
  },
});

// Export all scorers as a collection
export const prebuiltScorers = {
  answerRelevancyScorer,
  faithfulnessScorer,
  hallucinationScorer,
  promptAlignmentScorer,
};
