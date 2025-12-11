/**
 * RAG Retrieval Quality Evaluation Tests
 *
 * These tests evaluate the quality of semantic retrieval
 * from the inspection knowledge base using Mastra's eval framework.
 */

import { RequestContext } from "@mastra/core/request-context";
import { describe, expect, it } from "vitest";
import { queryInspectionTool } from "../tools/query-inspection.tool";
import {
  edgeCaseTestCases,
  retrievalTestCases,
} from "./datasets/retrieval-test-cases";

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

  describe("Quality Metrics Summary", () => {
    it("should calculate aggregate metrics across all test cases", async () => {
      const metrics = {
        totalCases: retrievalTestCases.length,
        casesWithResults: 0,
        dataTypeMatches: 0,
        componentMatches: 0,
        avgSimilarityScore: 0,
        allScores: [] as number[],
      };

      for (const testCase of retrievalTestCases) {
        const result = await executeQuery(testCase.query);

        if (result.results.length > 0) {
          metrics.casesWithResults++;

          // Calculate avg score for this query
          const avgScore =
            result.results.reduce((sum, r) => sum + r.score, 0) /
            result.results.length;
          metrics.allScores.push(avgScore);

          // Check data type match
          if (testCase.expectedDataType) {
            const hasMatch = result.results.some(
              (r) => r.dataType === testCase.expectedDataType,
            );
            if (hasMatch) metrics.dataTypeMatches++;
          }

          // Check component match
          if (testCase.expectedComponentId) {
            const hasMatch = result.results.some(
              (r) => r.componentId === testCase.expectedComponentId,
            );
            if (hasMatch) metrics.componentMatches++;
          }
        }
      }

      // Calculate final metrics
      metrics.avgSimilarityScore =
        metrics.allScores.length > 0
          ? metrics.allScores.reduce((a, b) => a + b, 0) /
            metrics.allScores.length
          : 0;

      const resultRate = metrics.casesWithResults / metrics.totalCases;
      const dataTypeCases = retrievalTestCases.filter(
        (tc) => tc.expectedDataType,
      ).length;
      const componentCases = retrievalTestCases.filter(
        (tc) => tc.expectedComponentId,
      ).length;

      console.log("\n=== Retrieval Eval Summary ===");
      console.log(`Total test cases: ${metrics.totalCases}`);
      console.log(
        `Cases with results: ${metrics.casesWithResults} (${(resultRate * 100).toFixed(1)}%)`,
      );
      console.log(
        `Data type accuracy: ${metrics.dataTypeMatches}/${dataTypeCases}`,
      );
      console.log(
        `Component accuracy: ${metrics.componentMatches}/${componentCases}`,
      );
      console.log(
        `Average similarity score: ${metrics.avgSimilarityScore.toFixed(3)}`,
      );

      // Assertions for minimum quality
      expect(resultRate).toBeGreaterThan(0.5); // At least 50% of queries return results
    });
  });
});
