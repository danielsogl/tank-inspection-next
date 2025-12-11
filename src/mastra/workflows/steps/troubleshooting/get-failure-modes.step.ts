import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { queryInspectionTool } from "../../../tools/query-inspection.tool";

/**
 * Step 2c: Get failure modes related to the symptoms.
 *
 * This step searches for:
 * - Common failure patterns matching the symptoms
 * - Defect priorities and categories
 * - Historical failure data
 */
export const getFailureModesStep = createStep({
  id: "get-failure-modes",
  description: "Retrieves failure modes and patterns related to the symptoms",
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
    failureModes: z.array(
      z.object({
        description: z.string(),
        priority: z.string().optional(),
        componentId: z.string().optional(),
        sectionId: z.string(),
        score: z.number(),
      }),
    ),
    searchCompleted: z.boolean(),
  }),
  execute: async ({ inputData, requestContext }) => {
    const { symptomDescription, keywords, affectedSystems } = inputData;

    try {
      // Search for defect-related information
      const defectSearch = await queryInspectionTool.execute(
        {
          query: `failure defect problem ${symptomDescription}`,
          dataType: "defect",
          topK: 5,
          minScore: 0.5,
          useReranking: false,
        },
        { requestContext: requestContext ?? undefined },
      );

      // Check for validation error
      if ("issues" in defectSearch) {
        console.error("Defect search validation error:", defectSearch);
        return { failureModes: [], searchCompleted: false };
      }

      // Search for component-specific failures
      const componentFailures = await Promise.all(
        affectedSystems.slice(0, 2).map(async (system) => {
          const result = await queryInspectionTool.execute(
            {
              query: `${system} failure common problems symptoms`,
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

      // Combine results - use type narrowing for union types
      const defectResults =
        "results" in defectSearch ? defectSearch.results : [];
      const allFailures = [
        ...defectResults.map((r) => ({
          description: r.content,
          priority: r.priority,
          componentId: r.componentId,
          sectionId: r.sectionId,
          score: r.score,
        })),
        ...componentFailures.flatMap((cf) => {
          const cfResults = "results" in cf ? cf.results : [];
          return cfResults.map((r) => ({
            description: r.content,
            priority: r.priority,
            componentId: r.componentId,
            sectionId: r.sectionId,
            score: r.score,
          }));
        }),
      ];

      // Deduplicate and sort
      const seen = new Set<string>();
      const dedupedFailures = allFailures.filter((f) => {
        const key = `${f.sectionId}-${f.componentId || "n/a"}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const sortedFailures = dedupedFailures
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      return {
        failureModes: sortedFailures,
        searchCompleted: true,
      };
    } catch (error) {
      console.error("Failure mode search failed:", error);
      return {
        failureModes: [],
        searchCompleted: false,
      };
    }
  },
});
