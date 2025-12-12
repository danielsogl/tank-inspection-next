#!/usr/bin/env npx tsx

/**
 * CLI script for running RAG retrieval evaluations using Mastra scorers.
 *
 * Since we're evaluating a tool (not an agent), we run scorers directly
 * using their .run() method instead of runEvals which is designed for agents.
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
import {
  dataTypeAccuracyScorer,
  componentMatchScorer,
  similarityScoreScorer,
  resultFoundScorer,
} from "./scorers/rag-scorers";

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

/**
 * Execute the query tool and return formatted results.
 */
async function executeQuery(query: string): Promise<QueryResult> {
  const ctx = new RequestContext();
  ctx.set("vehicleId", "leopard2");

  const rawResult = await queryInspectionTool.execute(
    {
      query,
      topK: 5,
      minScore: 0.3,
      useReranking: false,
    },
    { requestContext: ctx },
  );

  // Handle validation errors
  if ("issues" in rawResult) {
    return { results: [], totalFound: 0 };
  }

  const result = rawResult as SuccessResult;
  return {
    results: result.results,
    totalFound: result.totalFound,
  };
}

// Define scorers to use
const scorers = [
  { id: "results-found", scorer: resultFoundScorer },
  { id: "similarity-score", scorer: similarityScoreScorer },
  { id: "data-type-accuracy", scorer: dataTypeAccuracyScorer },
  { id: "component-match", scorer: componentMatchScorer },
];

interface EvalResult {
  query: string;
  description: string;
  scores: Record<string, number>;
  totalFound: number;
}

async function runRetrievalEvals() {
  console.log("=".repeat(60));
  console.log("RAG Retrieval Evaluation (Mastra Scorers)");
  console.log("=".repeat(60));
  console.log();

  const startTime = Date.now();
  const allTestCases = [...retrievalTestCases, ...edgeCaseTestCases];

  console.log(`Running ${allTestCases.length} test cases with Mastra scorers...\n`);

  const results: EvalResult[] = [];
  const aggregateScores: Record<string, number[]> = {};

  // Initialize aggregate score arrays
  for (const { id } of scorers) {
    aggregateScores[id] = [];
  }

  for (const testCase of allTestCases) {
    process.stdout.write(
      `  Testing: ${testCase.description.slice(0, 40).padEnd(42)}... `,
    );

    try {
      // Execute the query
      const output = await executeQuery(testCase.query);

      // Prepare ground truth for scorers
      const groundTruth = {
        expectedDataType: testCase.expectedDataType,
        expectedComponentId: testCase.expectedComponentId,
        expectedSectionId: testCase.expectedSectionId,
        expectedCrewRole: testCase.expectedCrewRole,
        expectedPriority: testCase.expectedPriority,
      };

      // Run each scorer
      const itemScores: Record<string, number> = {};

      for (const { id, scorer } of scorers) {
        const result = await scorer.run({
          input: { query: testCase.query },
          output,
          groundTruth,
        });
        itemScores[id] = result.score;
        aggregateScores[id].push(result.score);
      }

      results.push({
        query: testCase.query,
        description: testCase.description,
        scores: itemScores,
        totalFound: output.totalFound,
      });

      // Print status
      const status = output.totalFound > 0 ? "OK" : "NO RESULTS";
      const avgScore =
        Object.values(itemScores).length > 0
          ? Object.values(itemScores).reduce((a, b) => a + b, 0) /
            Object.values(itemScores).length
          : 0;

      console.log(`${status} (avg: ${avgScore.toFixed(3)})`);
    } catch {
      console.log("ERROR");
      results.push({
        query: testCase.query,
        description: testCase.description,
        scores: {},
        totalFound: 0,
      });
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Calculate final aggregate scores
  const finalScores: Record<string, number> = {};
  for (const [id, scores] of Object.entries(aggregateScores)) {
    finalScores[id] =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("Summary (Aggregate Scores)");
  console.log("=".repeat(60));

  console.log(`\nTotal test cases: ${allTestCases.length}`);
  console.log(`Duration: ${duration.toFixed(2)}s\n`);

  console.log("Scorer Results:");
  for (const [scorerId, score] of Object.entries(finalScores)) {
    const percentage = (score * 100).toFixed(1);
    console.log(`  ${scorerId.padEnd(25)} ${percentage}%`);
  }

  // Print detailed results table
  console.log(`\n${"=".repeat(60)}`);
  console.log("Detailed Results");
  console.log("=".repeat(60));

  console.log(
    "\n| Description                             | Found | ResultsFound | DataType | Component |",
  );
  console.log(
    "|----------------------------------------|-------|--------------|----------|-----------|",
  );

  for (const r of results) {
    const resultsFound = r.scores["results-found"]?.toFixed(1) ?? "-";
    const dataType = r.scores["data-type-accuracy"]?.toFixed(1) ?? "-";
    const component = r.scores["component-match"]?.toFixed(1) ?? "-";

    console.log(
      `| ${r.description.slice(0, 38).padEnd(38)} | ${String(r.totalFound).padStart(5)} | ${resultsFound.padStart(12)} | ${dataType.padStart(8)} | ${component.padStart(9)} |`,
    );
  }

  console.log();

  // Calculate pass/fail based on aggregate scores
  const resultsFoundScore = finalScores["results-found"] ?? 0;
  const avgSimilarity = finalScores["similarity-score"] ?? 0;

  const passed = resultsFoundScore >= 0.5 && avgSimilarity >= 0.3;

  if (passed) {
    console.log("EVALUATION PASSED - Quality thresholds met");
    process.exit(0);
  } else {
    console.log("EVALUATION FAILED - Quality thresholds not met");
    console.log(`  Required: results-found >= 50%, similarity-score >= 0.3`);
    console.log(
      `  Actual: results-found = ${(resultsFoundScore * 100).toFixed(1)}%, similarity-score = ${avgSimilarity.toFixed(3)}`,
    );
    process.exit(1);
  }
}

// Run the evaluation
runRetrievalEvals().catch((error) => {
  console.error("Evaluation failed with error:", error);
  process.exit(1);
});
