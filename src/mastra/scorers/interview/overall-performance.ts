import { createScorer } from "@mastra/core/scores";

// ============================================================================
// OVERALL PERFORMANCE SCORER
// ============================================================================
// Aggregates scores from all step-level scorers
// Applied to: overall workflow

export const overallPerformanceScorer = createScorer({
  name: "Overall Interview Performance",
  description:
    "Aggregates all step-level scores into overall performance metric",
})
  .generateScore(({ run }) => {
    // Access runtime context which should contain step scores
    const runtimeContext = run.runtimeContext;

    // Extract scores from different steps
    // Note: The actual structure depends on how Mastra exposes step scores
    // This is a placeholder implementation that can be adjusted based on actual structure
    const stepScores = runtimeContext?.stepScores || {};

    // Weights: persona quality (20%), question usefulness (40%), behavioral accuracy (25%), consistency (15%)
    const personaQuality =
      stepScores["generate-persona"]?.personaQualityScorer || 0.5;

    // Question usefulness = average of topic relevance, problem specificity, mom test
    const topicRelevance =
      stepScores["generate-questions"]?.topicRelevanceScorer || 0.5;
    const problemSpecificity =
      stepScores["generate-questions"]?.problemSpecificityScorer || 0.5;
    const momTest =
      stepScores["generate-questions"]?.momTestAdherenceScorer || 0.5;
    const questionUsefulness =
      (topicRelevance + problemSpecificity + momTest) / 3;

    const behavioralAccuracy =
      stepScores["conduct-interview"]?.behavioralAccuracyScorer || 0.5;
    const consistency =
      stepScores["conduct-interview"]?.intraInterviewConsistencyScorer || 0.5;

    const overallScore =
      personaQuality * 0.2 +
      questionUsefulness * 0.4 +
      behavioralAccuracy * 0.25 +
      consistency * 0.15;

    return Math.max(0, Math.min(1, overallScore));
  })
  .generateReason(({ run, score }) => {
    const runtimeContext = run.runtimeContext;
    const stepScores = runtimeContext?.stepScores || {};

    return `Overall Interview Performance: ${score.toFixed(2)}. This aggregates persona quality (20% weight), question usefulness (40% weight including topic relevance, problem specificity, and Mom Test adherence), behavioral accuracy (25% weight), and consistency (15% weight) across the interview workflow.`;
  });
