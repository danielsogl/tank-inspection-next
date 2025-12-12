/**
 * RAG Retrieval Quality Evaluation Tests
 *
 * These tests evaluate the quality of semantic retrieval
 * from the inspection knowledge base using Mastra's eval framework.
 *
 * Note: Since we're evaluating a tool (not an agent), we run scorers
 * directly using their .run() method instead of runEvals which is
 * designed for agents/workflows.
 */

import { RequestContext } from "@mastra/core/request-context";
import { describe, expect, it } from "vitest";
import { queryInspectionTool } from "../tools/query-inspection.tool";
import {
  edgeCaseTestCases,
  retrievalTestCases,
} from "./datasets/retrieval-test-cases";
import {
  componentMatchScorer,
  dataTypeAccuracyScorer,
  resultFoundScorer,
  similarityScoreScorer,
} from "./scorers/rag-scorers";

// Create a shared request context for evals
function createEvalContext() {
  const ctx = new RequestContext();
  ctx.set("vehicleId", "leopard2");
  return ctx;
}

// Result type for query execution
interface QueryResult {
  results: Array<{
    dataType: string;
    sectionId: string;
    componentId?: string;
    content: string;
    score: number;
  }>;
  totalFound: number;
}

// Type for successful query result
type SuccessResult = {
  results: Array<{
    dataType: string;
    sectionId: string;
    vehicleType: string;
    content: string;
    score: number;
    componentId?: string;
  }>;
  totalFound: number;
};

// Helper to execute query tool and format for eval
async function executeQuery(query: string): Promise<QueryResult> {
  const rawResult = await queryInspectionTool.execute(
    {
      query,
      topK: 5,
      minScore: 0.3, // Lower threshold for eval to see more results
      useReranking: false,
    },
    { requestContext: createEvalContext() },
  );

  // Handle validation errors
  if ("issues" in rawResult) {
    return { results: [], totalFound: 0 };
  }

  // Type assertion after narrowing
  const result = rawResult as SuccessResult;

  return {
    results: result.results,
    totalFound: result.totalFound,
  };
}

describe("RAG Retrieval Quality", () => {
  describe("queryInspectionTool - Core Functionality", () => {
    it("should return results for valid German queries", async () => {
      const result = await executeQuery("Motor Ölstand prüfen");

      expect(result.totalFound).toBeGreaterThan(0);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("should have similarity scores above minimum threshold", async () => {
      const result = await executeQuery("Technische Daten MTU Motor");

      if (result.results.length === 0) {
        console.warn("No results returned - database may not be seeded");
        return;
      }

      const avgScore =
        result.results.reduce((sum, r) => sum + r.score, 0) /
        result.results.length;

      expect(avgScore).toBeGreaterThan(0.3);
    });

    it("should filter by data type correctly", async () => {
      const rawResult = await queryInspectionTool.execute(
        {
          query: "Wartung Motor",
          dataType: "checkpoint",
          topK: 5,
          minScore: 0.3,
          useReranking: false,
        },
        { requestContext: createEvalContext() },
      );

      // Skip validation errors
      if ("issues" in rawResult) {
        return;
      }

      // Type assertion after narrowing
      const result = rawResult as SuccessResult;

      if (result.results.length > 0) {
        // All results should be checkpoints
        const allCheckpoints = result.results.every(
          (r) => r.dataType === "checkpoint",
        );
        expect(allCheckpoints).toBe(true);
      }
    });
  });

  describe("Mastra Scorer Integration", () => {
    it("should evaluate retrieval quality using custom scorers", async () => {
      const testCase = retrievalTestCases[0];
      const output = await executeQuery(testCase.query);

      const groundTruth = {
        expectedDataType: testCase.expectedDataType,
        expectedComponentId: testCase.expectedComponentId,
      };

      // Run scorers directly
      const resultsFoundResult = await resultFoundScorer.run({
        input: { query: testCase.query },
        output,
        groundTruth,
      });

      const similarityResult = await similarityScoreScorer.run({
        input: { query: testCase.query },
        output,
        groundTruth,
      });

      const dataTypeResult = await dataTypeAccuracyScorer.run({
        input: { query: testCase.query },
        output,
        groundTruth,
      });

      // Verify we got scores
      expect(resultsFoundResult.score).toBeDefined();
      expect(similarityResult.score).toBeDefined();
      expect(dataTypeResult.score).toBeDefined();

      console.log("Scorer Results:", {
        "results-found": resultsFoundResult.score,
        "similarity-score": similarityResult.score,
        "data-type-accuracy": dataTypeResult.score,
      });
    });
  });

  describe("Data Type Accuracy", () => {
    it.each(
      retrievalTestCases
        .filter((tc) => tc.expectedDataType)
        .map((tc) => [tc.description, tc]),
    )("%s", async (_, testCase) => {
      const result = await executeQuery(testCase.query);

      if (result.results.length === 0) {
        console.warn(`No results for: ${testCase.query}`);
        return;
      }

      if (testCase.expectedDataType) {
        const hasExpectedType = result.results.some(
          (r) => r.dataType === testCase.expectedDataType,
        );

        expect(hasExpectedType).toBe(true);
      }
    });
  });

  describe("Component Matching", () => {
    it.each(
      retrievalTestCases
        .filter((tc) => tc.expectedComponentId)
        .map((tc) => [tc.description, tc]),
    )("%s", async (_, testCase) => {
      const result = await executeQuery(testCase.query);

      if (result.results.length === 0) {
        console.warn(`No results for: ${testCase.query}`);
        return;
      }

      if (testCase.expectedComponentId) {
        const hasExpectedComponent = result.results.some(
          (r) => r.componentId === testCase.expectedComponentId,
        );

        expect(hasExpectedComponent).toBe(true);
      }
    });
  });

  describe("Edge Cases", () => {
    it.each(
      edgeCaseTestCases.map((tc) => [tc.description, tc]),
    )("%s", async (_, testCase) => {
      const result = await executeQuery(testCase.query);

      // Edge cases should still return some results (or gracefully handle)
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe("Quality Metrics Summary (Using Mastra Scorers)", () => {
    it("should calculate aggregate metrics across all test cases", async () => {
      const allTestCases = [...retrievalTestCases, ...edgeCaseTestCases];

      const aggregateScores: Record<string, number[]> = {
        "results-found": [],
        "similarity-score": [],
        "data-type-accuracy": [],
        "component-match": [],
      };

      for (const testCase of allTestCases) {
        const output = await executeQuery(testCase.query);
        const groundTruth = {
          expectedDataType: testCase.expectedDataType,
          expectedComponentId: testCase.expectedComponentId,
        };

        // Run all scorers
        const resultsFoundResult = await resultFoundScorer.run({
          input: { query: testCase.query },
          output,
          groundTruth,
        });
        aggregateScores["results-found"].push(resultsFoundResult.score);

        const similarityResult = await similarityScoreScorer.run({
          input: { query: testCase.query },
          output,
          groundTruth,
        });
        aggregateScores["similarity-score"].push(similarityResult.score);

        const dataTypeResult = await dataTypeAccuracyScorer.run({
          input: { query: testCase.query },
          output,
          groundTruth,
        });
        aggregateScores["data-type-accuracy"].push(dataTypeResult.score);

        const componentResult = await componentMatchScorer.run({
          input: { query: testCase.query },
          output,
          groundTruth,
        });
        aggregateScores["component-match"].push(componentResult.score);
      }

      // Calculate averages
      const finalScores: Record<string, number> = {};
      for (const [id, scores] of Object.entries(aggregateScores)) {
        finalScores[id] =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;
      }

      console.log("\n=== Retrieval Eval Summary (Mastra Scorers) ===");
      console.log(`Total test cases: ${allTestCases.length}`);

      for (const [scorerId, score] of Object.entries(finalScores)) {
        console.log(`${scorerId}: ${(score * 100).toFixed(1)}%`);
      }

      // Assertions for minimum quality
      expect(finalScores["results-found"]).toBeGreaterThan(0.5); // At least 50% of queries return results
    });
  });
});
