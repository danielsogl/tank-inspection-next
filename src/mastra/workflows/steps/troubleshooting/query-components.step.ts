import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  DEFAULT_COMPONENT_ID,
  getComponentsForSystems,
  resolveComponentFromHint,
  type VehicleSystem,
} from "../../../lib/system-mappings";
import { getComponentDetailsTool } from "../../../tools/component-details.tool";

/**
 * Step 2b: Query component details for affected systems.
 *
 * This step retrieves detailed component information including:
 * - Technical specifications
 * - Monitoring points and thresholds
 * - Common failures and symptoms
 */
export const queryComponentsStep = createStep({
  id: "query-components",
  description: "Queries component details for affected systems",
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
    componentDetails: z.record(
      z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        content: z.string().describe("Semantic text content from RAG chunks"),
      }),
    ),
    queriedComponents: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { affectedSystems, componentHint } = inputData;

    // Get components for affected systems using shared mapping
    const componentsToQuery = getComponentsForSystems(
      affectedSystems as VehicleSystem[],
    );

    // Add component from hint if provided
    if (componentHint) {
      const hintComponent = resolveComponentFromHint(componentHint);
      if (hintComponent) {
        componentsToQuery.add(hintComponent);
      }
    }

    // Default to engine if nothing else matched
    if (componentsToQuery.size === 0) {
      componentsToQuery.add(DEFAULT_COMPONENT_ID);
    }

    // Query all components in parallel for faster execution
    const componentResults = await Promise.all(
      Array.from(componentsToQuery).map(async (componentId) => {
        try {
          const result = await getComponentDetailsTool.execute({
            componentId,
            topK: 10,
          });
          return { componentId, result, error: null };
        } catch (error) {
          console.error(`Failed to query component ${componentId}:`, error);
          return { componentId, result: null, error };
        }
      }),
    );

    // Build component details from parallel results
    const componentDetails: Record<
      string,
      {
        id: string;
        name: string;
        category: string;
        content: string;
      }
    > = {};

    for (const { componentId, result } of componentResults) {
      if (!result) continue;

      // Check for validation error - use 'found' property to narrow type
      if (!("found" in result) || !result.found) {
        if ("issues" in result) {
          console.error(`Component ${componentId} validation error:`, result);
        }
        continue;
      }

      // Combine all semantic chunks into a single content string
      const combinedContent = result.chunks
        .map((chunk) => chunk.content)
        .join("\n\n---\n\n");

      componentDetails[componentId] = {
        id: result.componentId,
        name: componentId,
        category: result.chunks[0]?.category ?? "unknown",
        content: combinedContent,
      };
    }

    return {
      componentDetails,
      queriedComponents: Array.from(componentsToQuery),
    };
  },
});
