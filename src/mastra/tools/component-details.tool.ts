import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getVectorStore,
  INSPECTION_INDEX_CONFIG,
  type InspectionChunkMetadata,
} from '../lib/vector';
import { getCachedEmbedding } from '../lib/cache';

/**
 * Tool for querying component details from the RAG database.
 */
export const getComponentDetailsTool = createTool({
  id: 'get-component-details',
  description: `Get detailed information about a specific vehicle component.

This tool retrieves component knowledge including:
- Technical specifications (power, torque, dimensions, etc.)
- Maintenance schedules with interval-based tasks
- Monitoring points with normal ranges and critical thresholds
- Common failures with symptoms and causes
- Diagnostic information

Available component IDs:
- mtu_mb873: MTU MB 873 Ka-501 V12 Diesel Engine (Leopard 2)
- renk_hswl354: RENK HSWL 354 Automatic Transmission (Leopard 2)
- turmdrehkranz: Turret ring and rotation system

Use this tool when the user asks about:
- Component specifications or technical details
- Maintenance schedules for specific components
- Monitoring parameters and thresholds
- Common failures and troubleshooting`,
  inputSchema: z.object({
    componentId: z
      .string()
      .describe(
        'The component ID to get details for (e.g., "mtu_mb873", "renk_hswl354", "turmdrehkranz")',
      ),
    includeMaintenanceSchedule: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include the maintenance schedule in the response'),
    includeMonitoringPoints: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include monitoring points with thresholds'),
    includeCommonFailures: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include common failures and symptoms'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    component: z
      .object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        content: z.string(),
        specs: z.record(z.unknown()).optional(),
        maintenanceSchedule: z
          .array(
            z.object({
              intervalHours: z.number(),
              description: z.string(),
              tasks: z.array(z.string()),
            }),
          )
          .optional(),
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
      })
      .optional(),
  }),
  execute: async (inputData) => {
    try {
      const {
        componentId,
        includeMaintenanceSchedule,
        includeMonitoringPoints,
        includeCommonFailures,
      } = inputData;

      // Use cached embedding
      const queryEmbedding = await getCachedEmbedding(
        `component ${componentId} specifications maintenance monitoring`,
      );

      // Get singleton vector store
      const vectorStore = getVectorStore();

      const queryResults = await vectorStore.query({
        indexName: INSPECTION_INDEX_CONFIG.indexName,
        queryVector: queryEmbedding,
        topK: 5,
        filter: {
          dataType: 'component',
          componentId,
        },
        includeVector: false,
      });

      const componentMatch = queryResults.find((result) => {
        const metadata = result.metadata as InspectionChunkMetadata;
        return metadata.componentId === componentId && metadata.dataType === 'component';
      });

      if (!componentMatch) {
        return {
          found: false,
          component: undefined,
        };
      }

      const metadata = componentMatch.metadata as InspectionChunkMetadata;

      let parsedContent: Record<string, unknown> = {};
      try {
        parsedContent = JSON.parse(metadata.text);
      } catch {
        return {
          found: true,
          component: {
            id: componentId,
            name: componentId,
            category: 'unknown',
            content: metadata.text,
          },
        };
      }

      const response: {
        id: string;
        name: string;
        category: string;
        content: string;
        specs?: Record<string, unknown>;
        maintenanceSchedule?: Array<{
          intervalHours: number;
          description: string;
          tasks: string[];
        }>;
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
      } = {
        id: (parsedContent.id as string) || componentId,
        name: (parsedContent.name as string) || componentId,
        category: (parsedContent.category as string) || 'unknown',
        content: metadata.text,
        specs: parsedContent.specs as Record<string, unknown>,
      };

      if (includeMaintenanceSchedule && parsedContent.maintenance_schedule) {
        response.maintenanceSchedule = (
          parsedContent.maintenance_schedule as Array<{
            interval_hours: number;
            description: string;
            tasks: string[];
          }>
        ).map((schedule) => ({
          intervalHours: schedule.interval_hours,
          description: schedule.description,
          tasks: schedule.tasks,
        }));
      }

      if (includeMonitoringPoints && parsedContent.monitoring_points) {
        response.monitoringPoints = (
          parsedContent.monitoring_points as Array<{
            name: string;
            unit: string;
            normal_range: { min?: number; max?: number };
            critical_threshold: { min?: number; max?: number };
          }>
        ).map((point) => ({
          name: point.name,
          unit: point.unit,
          normalRange: {
            min: point.normal_range?.min,
            max: point.normal_range?.max,
          },
          criticalThreshold: {
            min: point.critical_threshold?.min,
            max: point.critical_threshold?.max,
          },
        }));
      }

      if (includeCommonFailures && parsedContent.common_failures) {
        response.commonFailures = (
          parsedContent.common_failures as Array<{
            id: string;
            name: string;
            mtbf_hours: number;
            symptoms: string[];
            cause: string;
          }>
        ).map((failure) => ({
          id: failure.id,
          name: failure.name,
          mtbfHours: failure.mtbf_hours,
          symptoms: failure.symptoms,
          cause: failure.cause,
        }));
      }

      return {
        found: true,
        component: response,
      };
    } catch (error) {
      console.error('[get-component-details] Error:', error);
      return {
        found: false,
        component: undefined,
      };
    }
  },
});
