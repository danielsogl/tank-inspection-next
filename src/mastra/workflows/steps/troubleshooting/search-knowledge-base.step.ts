import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { queryInspectionTool } from "../../../tools/query-inspection.tool";

/**
 * Step 2a: Search the knowledge base for related issues.
 *
 * This step performs semantic search to find:
 * - Similar symptoms and issues from the inspection database
 * - Related checkpoints and procedures
 * - Historical defect information
 */
export const searchKnowledgeBaseStep = createStep({
  id: "search-knowledge-base",
  description:
    "Searches the inspection database for related issues and symptoms",
  inputSchema: z.object({
    symptomDescription: z.string(),
    vehicleId: z.string(),
    componentHint: z.string().optional(),
    requireApproval: z.boolean(),
    keywords: z.array(z.string()),
    affectedSystems: z.array(z.string()),
    searchQueries: z.array(z.string()),
  }),
  outputSchema: z.object({
    relatedIssues: z.array(
      z.object({
        content: z.string(),
        sectionId: z.string(),
        checkpointNumber: z.number().optional(),
        componentId: z.string().optional(),
        score: z.number(),
      }),
    ),
    searchCompleted: z.boolean(),
  }),
  execute: async ({ inputData, requestContext }) => {
    const { symptomDescription, vehicleId, affectedSystems } = inputData;

    try {
      // Perform main symptom search
      const mainResult = await queryInspectionTool.execute(
        {
          query: symptomDescription,
          topK: 5,
          minScore: 0.5,
          useReranking: false,
        },
        { requestContext: requestContext ?? undefined },
      );

      // Check for validation error
      if ("issues" in mainResult) {
        console.error("Main search validation error:", mainResult);
        return { relatedIssues: [], searchCompleted: false };
      }

      // Search for each affected system
      const systemResults = await Promise.all(
        affectedSystems.slice(0, 3).map(async (system) => {
          const result = await queryInspectionTool.execute(
            {
              query: `${system} problem diagnosis ${symptomDescription.split(" ").slice(0, 5).join(" ")}`,
              topK: 3,
              minScore: 0.5,
              useReranking: false,
            },
            { requestContext: requestContext ?? undefined },
          );
          // Return empty if validation error
          if ("issues" in result) return { results: [], totalFound: 0 };
          return result;
        }),
      );

      // Combine and deduplicate results
      const mainResults = "results" in mainResult ? mainResult.results : [];
      const allResults = [
        ...mainResults,
        ...systemResults.flatMap((r) => ("results" in r ? r.results : [])),
      ];

      // Deduplicate by content similarity (simple approach: by sectionId + checkpointNumber)
      const seen = new Set<string>();
      const dedupedResults = allResults.filter((result) => {
        const key = `${result.sectionId}-${result.checkpointNumber || "n/a"}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort by score and take top results
      const sortedResults = dedupedResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((r) => ({
          content: r.content,
          sectionId: r.sectionId,
          checkpointNumber: r.checkpointNumber,
          componentId: r.componentId,
          score: r.score,
        }));

      return {
        relatedIssues: sortedResults,
        searchCompleted: true,
      };
    } catch (error) {
      console.error("Knowledge base search failed:", error);
      return {
        relatedIssues: [],
        searchCompleted: false,
      };
    }
  },
});
