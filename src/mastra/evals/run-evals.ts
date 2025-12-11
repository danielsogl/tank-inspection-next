#!/usr/bin/env npx tsx

/**
 * CLI script for running RAG retrieval evaluations.
 *
 * Usage:
 *   npm run evals:retrieval
 *   npx tsx src/mastra/evals/run-evals.ts
 */

import { config } from "dotenv";

// Load environment variables
config();

import { RequestContext } from "@mastra/core/request-context";
import { queryInspectionTool } from "../tools/query-inspection.tool";
import {
  edgeCaseTestCases,
  retrievalTestCases,
} from "./datasets/retrieval-test-cases";

interface EvalResult {
  query: string;
  description: string;
  resultsFound: number;
  avgScore: number;
  dataTypeMatch: boolean | null;
  componentMatch: boolean | null;
  topResult: string;
}

async function runRetrievalEvals() {
  console.log("=".repeat(60));
  console.log("RAG Retrieval Evaluation");
  console.log("=".repeat(60));
  console.log();

  const results: EvalResult[] = [];
  const startTime = Date.now();

  // Run evaluations for each test case
  console.log("Running test cases...\n");

  for (const testCase of [...retrievalTestCases, ...edgeCaseTestCases]) {
    process.stdout.write(
      `  Testing: ${testCase.description.slice(0, 40).padEnd(42)}... `,
    );

    try {
      const ctx = new RequestContext();
      ctx.set("vehicleId", "leopard2");

      const rawResult = await queryInspectionTool.execute(
        {
          query: testCase.query,
          topK: 5,
          minScore: 0.3,
          useReranking: false,
        },
        { requestContext: ctx },
      );

      // Handle validation errors
      if ("issues" in rawResult) {
        console.log("VALIDATION ERROR");
        results.push({
          query: testCase.query,
          description: testCase.description,
          resultsFound: 0,
          avgScore: 0,
          dataTypeMatch: null,
          componentMatch: null,
          topResult: "Validation error",
        });
        continue;
      }

      // Type assertion after narrowing to extract the success result
      const searchResult = rawResult as {
        results: Array<{
          dataType: string;
          componentId?: string;
          content: string;
          score: number;
        }>;
        totalFound: number;
      };

      const avgScore =
        searchResult.results.length > 0
          ? searchResult.results.reduce(
              (sum: number, r: { score: number }) => sum + r.score,
              0,
            ) / searchResult.results.length
          : 0;

      // Check data type match
      let dataTypeMatch: boolean | null = null;
      if (testCase.expectedDataType) {
        dataTypeMatch = searchResult.results.some(
          (r: { dataType: string }) => r.dataType === testCase.expectedDataType,
        );
      }

      // Check component match
      let componentMatch: boolean | null = null;
      if (testCase.expectedComponentId) {
        componentMatch = searchResult.results.some(
          (r: { componentId?: string }) =>
            r.componentId === testCase.expectedComponentId,
        );
      }

      const topResult =
        searchResult.results[0]?.content.slice(0, 50) || "No results";

      results.push({
        query: testCase.query,
        description: testCase.description,
        resultsFound: searchResult.totalFound,
        avgScore,
        dataTypeMatch,
        componentMatch,
        topResult,
      });

      // Print result status
      const status =
        searchResult.totalFound > 0
          ? dataTypeMatch === false || componentMatch === false
            ? "PARTIAL"
            : "OK"
          : "NO RESULTS";

      console.log(
        `${status} (${searchResult.totalFound} results, avg: ${avgScore.toFixed(3)})`,
      );
    } catch (error) {
      console.log("ERROR");
      results.push({
        query: testCase.query,
        description: testCase.description,
        resultsFound: 0,
        avgScore: 0,
        dataTypeMatch: null,
        componentMatch: null,
        topResult: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      });
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Calculate summary statistics
  console.log(`\n${"=".repeat(60)}`);
  console.log("Summary");
  console.log("=".repeat(60));

  const withResults = results.filter((r) => r.resultsFound > 0);
  const dataTypeCases = results.filter((r) => r.dataTypeMatch !== null);
  const componentCases = results.filter((r) => r.componentMatch !== null);

  const stats = {
    totalCases: results.length,
    casesWithResults: withResults.length,
    resultRate: (withResults.length / results.length) * 100,
    avgSimilarityScore:
      withResults.length > 0
        ? withResults.reduce((sum, r) => sum + r.avgScore, 0) /
          withResults.length
        : 0,
    dataTypeAccuracy:
      dataTypeCases.length > 0
        ? (dataTypeCases.filter((r) => r.dataTypeMatch).length /
            dataTypeCases.length) *
          100
        : 0,
    componentAccuracy:
      componentCases.length > 0
        ? (componentCases.filter((r) => r.componentMatch).length /
            componentCases.length) *
          100
        : 0,
  };

  console.log(`
Total test cases:        ${stats.totalCases}
Cases with results:      ${stats.casesWithResults} (${stats.resultRate.toFixed(1)}%)
Average similarity:      ${stats.avgSimilarityScore.toFixed(3)}
Data type accuracy:      ${stats.dataTypeAccuracy.toFixed(1)}% (${dataTypeCases.filter((r) => r.dataTypeMatch).length}/${dataTypeCases.length})
Component accuracy:      ${stats.componentAccuracy.toFixed(1)}% (${componentCases.filter((r) => r.componentMatch).length}/${componentCases.length})
Duration:                ${duration.toFixed(2)}s
`);

  // Print detailed results table
  console.log("=".repeat(60));
  console.log("Detailed Results");
  console.log("=".repeat(60));

  console.log("\n| Description | Results | Avg Score | Type | Component |");
  console.log("|-------------|---------|-----------|------|-----------|");

  for (const r of results) {
    const typeStatus =
      r.dataTypeMatch === null ? "-" : r.dataTypeMatch ? "OK" : "MISS";
    const compStatus =
      r.componentMatch === null ? "-" : r.componentMatch ? "OK" : "MISS";

    console.log(
      `| ${r.description.slice(0, 35).padEnd(35)} | ${String(r.resultsFound).padStart(7)} | ${r.avgScore.toFixed(3).padStart(9)} | ${typeStatus.padStart(4)} | ${compStatus.padStart(9)} |`,
    );
  }

  console.log();

  // Return exit code based on quality thresholds
  const passed = stats.resultRate >= 50 && stats.avgSimilarityScore >= 0.3;

  if (passed) {
    console.log("EVALUATION PASSED - Quality thresholds met");
    process.exit(0);
  } else {
    console.log("EVALUATION FAILED - Quality thresholds not met");
    console.log(`  Required: result rate >= 50%, avg similarity >= 0.3`);
    console.log(
      `  Actual: result rate = ${stats.resultRate.toFixed(1)}%, avg similarity = ${stats.avgSimilarityScore.toFixed(3)}`,
    );
    process.exit(1);
  }
}

// Run the evaluation
runRetrievalEvals().catch((error) => {
  console.error("Evaluation failed with error:", error);
  process.exit(1);
});
