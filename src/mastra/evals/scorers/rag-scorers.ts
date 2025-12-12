/**
 * RAG-specific scorers for evaluating retrieval quality.
 *
 * These scorers evaluate how well the RAG system retrieves
 * relevant information for German language queries.
 *
 * Includes both custom domain-specific scorers and Mastra built-in
 * RAG scorers following best practices.
 */

import { createScorer } from "@mastra/core/evals";
import {
  createContextPrecisionScorer,
  createContextRelevanceScorerLLM,
  createFaithfulnessScorer,
  createHallucinationScorer,
} from "@mastra/evals/scorers/prebuilt";
import { z } from "zod";
import { AGENT_MODEL_MINI } from "../../lib/models";

// ============================================================================
// MASTRA BUILT-IN RAG SCORERS
// ============================================================================

/**
 * Helper to extract context from retrieval results.
 */
const extractContext = (_input: unknown, output: unknown): string[] => {
  const results = output as { results?: Array<{ content: string }> };
  return results?.results?.map((r) => r.content) ?? [];
};

/**
 * Context Precision Scorer - evaluates retrieval ranking using Mean Average Precision.
 * Rewards systems that place relevant context earlier in the sequence.
 */
export const contextPrecisionScorer = createContextPrecisionScorer({
  model: AGENT_MODEL_MINI,
  options: {
    contextExtractor: extractContext,
  },
});

/**
 * Context Relevance Scorer - evaluates how relevant retrieved context is
 * using weighted relevance levels with penalties for unused/missing context.
 */
export const contextRelevanceScorer = createContextRelevanceScorerLLM({
  model: AGENT_MODEL_MINI,
  options: {
    contextExtractor: extractContext,
    penalties: {
      unusedHighRelevanceContext: 0.1,
      missingContextPerItem: 0.15,
      maxMissingContextPenalty: 0.5,
    },
  },
});

/**
 * Faithfulness Scorer - verifies claims in agent responses against retrieved context.
 * Essential for measuring RAG pipeline response reliability.
 *
 * Note: Context must be provided dynamically via options.context when creating the scorer.
 */
export const createRAGFaithfulnessScorer = (context: string[]) =>
  createFaithfulnessScorer({
    model: AGENT_MODEL_MINI,
    options: {
      context,
    },
  });

/**
 * Hallucination Scorer - detects factual contradictions and unsupported claims.
 * Identifies when the LLM generates information not present in the context.
 *
 * Note: Context must be provided dynamically via options.context when creating the scorer.
 */
export const createRAGHallucinationScorer = (context: string[]) =>
  createHallucinationScorer({
    model: AGENT_MODEL_MINI,
    options: {
      context,
    },
  });

// ============================================================================
// CUSTOM DOMAIN-SPECIFIC SCORERS
// ============================================================================

/**
 * Scorer that checks if results contain the expected data type.
 */
export const dataTypeAccuracyScorer = createScorer({
  id: "data-type-accuracy",
  name: "Data Type Accuracy",
  description: "Checks if retrieved results contain the expected data type",
})
  .preprocess(({ run }) => {
    const groundTruth = run.groundTruth as
      | { expectedDataType?: string }
      | undefined;
    const results = run.output as { results?: Array<{ dataType: string }> };

    return {
      expectedDataType: groundTruth?.expectedDataType,
      resultDataTypes: results?.results?.map((r) => r.dataType) ?? [],
    };
  })
  .generateScore(({ results }) => {
    const { expectedDataType, resultDataTypes } = results.preprocessStepResult;

    if (!expectedDataType) {
      // No expected data type specified, skip this check
      return 1;
    }

    // Check if any result has the expected data type
    const hasExpectedType = resultDataTypes.includes(expectedDataType);
    return hasExpectedType ? 1 : 0;
  })
  .generateReason(({ results, score }) => {
    const { expectedDataType, resultDataTypes } = results.preprocessStepResult;

    if (!expectedDataType) {
      return "No expected data type specified - test case skipped for this metric.";
    }

    if (score === 1) {
      return `Found expected data type "${expectedDataType}" in results.`;
    }

    return `Expected data type "${expectedDataType}" not found. Got: [${resultDataTypes.join(", ")}]`;
  });

/**
 * Scorer that checks if results contain the expected component ID.
 */
export const componentMatchScorer = createScorer({
  id: "component-match",
  name: "Component Match",
  description: "Checks if retrieved results contain the expected component ID",
})
  .preprocess(({ run }) => {
    const groundTruth = run.groundTruth as
      | { expectedComponentId?: string }
      | undefined;
    const results = run.output as { results?: Array<{ componentId?: string }> };

    return {
      expectedComponentId: groundTruth?.expectedComponentId,
      resultComponentIds:
        results?.results?.map((r) => r.componentId).filter(Boolean) ?? [],
    };
  })
  .generateScore(({ results }) => {
    const { expectedComponentId, resultComponentIds } =
      results.preprocessStepResult;

    if (!expectedComponentId) {
      return 1; // No expected component, skip
    }

    const hasExpectedComponent =
      resultComponentIds.includes(expectedComponentId);
    return hasExpectedComponent ? 1 : 0;
  })
  .generateReason(({ results, score }) => {
    const { expectedComponentId, resultComponentIds } =
      results.preprocessStepResult;

    if (!expectedComponentId) {
      return "No expected component ID specified - test case skipped for this metric.";
    }

    if (score === 1) {
      return `Found expected component "${expectedComponentId}" in results.`;
    }

    return `Expected component "${expectedComponentId}" not found. Got: [${resultComponentIds.join(", ")}]`;
  });

/**
 * Scorer that evaluates average similarity score of results.
 */
export const similarityScoreScorer = createScorer({
  id: "similarity-score",
  name: "Similarity Score",
  description: "Evaluates the average similarity score of retrieved results",
})
  .preprocess(({ run }) => {
    const results = run.output as { results?: Array<{ score: number }> };
    const scores = results?.results?.map((r) => r.score) ?? [];

    return {
      scores,
      avgScore:
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
    };
  })
  .generateScore(({ results }) => {
    // Return the average score as the metric
    return results.preprocessStepResult.avgScore;
  })
  .generateReason(({ results, score }) => {
    const { scores, minScore, maxScore } = results.preprocessStepResult;

    if (scores.length === 0) {
      return "No results returned.";
    }

    return `Average similarity: ${score.toFixed(3)} (range: ${minScore.toFixed(3)} - ${maxScore.toFixed(3)}, ${scores.length} results)`;
  });

/**
 * Scorer that checks if results were found at all.
 */
export const resultFoundScorer = createScorer({
  id: "results-found",
  name: "Results Found",
  description: "Checks if any results were returned for the query",
})
  .preprocess(({ run }) => {
    const results = run.output as { results?: unknown[]; totalFound?: number };

    return {
      totalFound: results?.totalFound ?? results?.results?.length ?? 0,
    };
  })
  .generateScore(({ results }) => {
    return results.preprocessStepResult.totalFound > 0 ? 1 : 0;
  })
  .generateReason(({ results, score }) => {
    const { totalFound } = results.preprocessStepResult;

    if (score === 1) {
      return `Found ${totalFound} result(s).`;
    }

    return "No results found for this query.";
  });

/**
 * LLM-based scorer that evaluates semantic relevance of retrieved content.
 */
export const semanticRelevanceScorer = createScorer({
  id: "semantic-relevance",
  name: "Semantic Relevance",
  description:
    "Uses LLM to evaluate if retrieved content is semantically relevant to the query",
  judge: {
    model: AGENT_MODEL_MINI,
    instructions: `Du bist ein Experte für die Bewertung von Suchergebnissen.
Deine Aufgabe ist es zu bewerten, wie relevant die abgerufenen Inhalte für die Suchanfrage sind.
Antworte immer auf Deutsch und sei präzise in deiner Bewertung.`,
  },
})
  .analyze({
    description: "Analyze semantic relevance of retrieved content",
    outputSchema: z.object({
      relevanceScore: z.number().min(0).max(1),
      reasoning: z.string(),
      topRelevantChunks: z.number(),
    }),
    createPrompt: ({ run }) => {
      const query = (run.input as { query?: string })?.query ?? "";
      const results = run.output as {
        results?: Array<{ content: string; score: number }>;
      };
      const contents =
        results?.results
          ?.slice(0, 5)
          .map((r, i) => `[${i + 1}] ${r.content.slice(0, 200)}...`) ?? [];

      return `Bewerte die Relevanz der folgenden Suchergebnisse für die Anfrage.

Suchanfrage: "${query}"

Abgerufene Inhalte:
${contents.join("\n\n")}

Bewerte:
1. Wie gut beantworten die Ergebnisse die Anfrage? (0-1)
2. Wie viele der Top-5 Ergebnisse sind wirklich relevant?

Antworte im JSON-Format:
{
  "relevanceScore": <0-1>,
  "reasoning": "<kurze Begründung>",
  "topRelevantChunks": <Anzahl relevanter Chunks>
}`;
    },
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult.relevanceScore;
  })
  .generateReason(({ results }) => {
    const { reasoning, topRelevantChunks } = results.analyzeStepResult;
    return `${reasoning} (${topRelevantChunks}/5 relevante Chunks)`;
  });
