import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { getComponentDetailsTool } from '../../../tools/component-details.tool';

/**
 * Step 2b: Query component details for affected systems.
 *
 * This step retrieves detailed component information including:
 * - Technical specifications
 * - Monitoring points and thresholds
 * - Common failures and symptoms
 */
export const queryComponentsStep = createStep({
  id: 'query-components',
  description: 'Queries component details for affected systems',
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
        specs: z.record(z.unknown()).optional(),
        monitoringPoints: z
          .array(
            z.object({
              name: z.string(),
              unit: z.string(),
              normalRange: z.object({
                min: z.number().optional(),
                max: z.number().optional(),
              }),
              criticalThreshold: z.object({
                min: z.number().optional(),
                max: z.number().optional(),
              }),
            }),
          )
          .optional(),
        commonFailures: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              mtbfHours: z.number(),
              symptoms: z.array(z.string()),
              cause: z.string(),
            }),
          )
          .optional(),
      }),
    ),
    queriedComponents: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { affectedSystems, componentHint } = inputData;

    // Map affected systems to component IDs
    const systemToComponentMap: Record<string, string[]> = {
      engine: ['mtu_mb873'],
      transmission: ['renk_hswl354'],
      turret: ['turmdrehkranz'],
      hydraulic: ['renk_hswl354'], // Transmission has hydraulic components
      cooling: ['mtu_mb873'], // Engine has cooling system
    };

    // Determine which components to query
    const componentsToQuery = new Set<string>();

    for (const system of affectedSystems) {
      const mappedComponents = systemToComponentMap[system];
      if (mappedComponents) {
        mappedComponents.forEach((c) => componentsToQuery.add(c));
      }
    }

    // Add component hint if provided
    if (componentHint) {
      const normalizedHint = componentHint.toLowerCase();
      if (normalizedHint.includes('mtu') || normalizedHint.includes('motor') || normalizedHint.includes('engine')) {
        componentsToQuery.add('mtu_mb873');
      }
      if (normalizedHint.includes('renk') || normalizedHint.includes('getriebe') || normalizedHint.includes('transmission')) {
        componentsToQuery.add('renk_hswl354');
      }
      if (normalizedHint.includes('turm') || normalizedHint.includes('turret') || normalizedHint.includes('drehkranz')) {
        componentsToQuery.add('turmdrehkranz');
      }
    }

    // Default to engine if nothing else matched
    if (componentsToQuery.size === 0) {
      componentsToQuery.add('mtu_mb873');
    }

    // Query all components in parallel for faster execution
    const componentResults = await Promise.all(
      Array.from(componentsToQuery).map(async (componentId) => {
        try {
          const result = await getComponentDetailsTool.execute({
            componentId,
            includeMaintenanceSchedule: false,
            includeMonitoringPoints: true,
            includeCommonFailures: true,
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
        specs?: Record<string, unknown>;
        monitoringPoints?: Array<{
          name: string;
          unit: string;
          normalRange: { min?: number; max?: number };
          criticalThreshold: { min?: number; max?: number };
        }>;
        commonFailures?: Array<{
          id: string;
          name: string;
          mtbfHours: number;
          symptoms: string[];
          cause: string;
        }>;
      }
    > = {};

    for (const { componentId, result } of componentResults) {
      if (!result) continue;

      // Check for validation error - use 'found' property to narrow type
      if (!('found' in result) || !result.found || !result.component) {
        if ('issues' in result) {
          console.error(`Component ${componentId} validation error:`, result);
        }
        continue;
      }

      componentDetails[componentId] = {
        id: result.component.id,
        name: result.component.name,
        category: result.component.category,
        specs: result.component.specs,
        monitoringPoints: result.component.monitoringPoints,
        commonFailures: result.component.commonFailures,
      };
    }

    return {
      componentDetails,
      queriedComponents: Array.from(componentsToQuery),
    };
  },
});
