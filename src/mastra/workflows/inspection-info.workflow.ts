import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  queryInspectionTool,
  getCheckpointTool,
  getComponentDetailsTool,
  getMaintenanceIntervalTool,
} from '../tools';

/**
 * Step 1: Analyze query and gather information in parallel
 *
 * This step determines what information is needed based on the query
 * and runs all relevant tools in parallel for maximum speed.
 */
const gatherInformationStep = createStep({
  id: 'gather-information',
  description: 'Gathers inspection information from multiple sources in parallel',
  inputSchema: z.object({
    query: z.string(),
    checkpointNumber: z.number().optional(),
    componentId: z.string().optional(),
    maintenanceLevel: z.enum(['L1', 'L2', 'L3', 'L4']).optional(),
    operatingHours: z.number().optional(),
  }),
  outputSchema: z.object({
    searchResults: z.array(z.any()).optional(),
    checkpoint: z.any().optional(),
    component: z.any().optional(),
    maintenance: z.any().optional(),
    sourcesUsed: z.array(z.string()),
  }),
  execute: async ({ inputData, requestContext }) => {
    const { query, checkpointNumber, componentId, maintenanceLevel, operatingHours } = inputData;

    const sourcesUsed: string[] = [];
    const tasks: Promise<{ type: string; result: unknown }>[] = [];

    // Always run semantic search for the query
    tasks.push(
      queryInspectionTool
        .execute({ query, topK: 5 }, { requestContext: requestContext ?? undefined })
        .then((result) => ({ type: 'search', result }))
        .catch(() => ({ type: 'search', result: null })),
    );
    sourcesUsed.push('knowledge-base-search');

    // If checkpoint number specified, get checkpoint details
    if (checkpointNumber) {
      tasks.push(
        getCheckpointTool
          .execute({ checkpointNumber }, { requestContext: requestContext ?? undefined })
          .then((result) => ({ type: 'checkpoint', result }))
          .catch(() => ({ type: 'checkpoint', result: null })),
      );
      sourcesUsed.push('checkpoint-details');
    }

    // If component ID specified or query mentions components, get component details
    if (componentId) {
      tasks.push(
        getComponentDetailsTool
          .execute({
            componentId,
            includeMaintenanceSchedule: true,
            includeMonitoringPoints: true,
            includeCommonFailures: true,
          })
          .then((result) => ({ type: 'component', result }))
          .catch(() => ({ type: 'component', result: null })),
      );
      sourcesUsed.push('component-details');
    }

    // If maintenance level or operating hours specified, get maintenance intervals
    if (maintenanceLevel || operatingHours !== undefined) {
      tasks.push(
        getMaintenanceIntervalTool
          .execute({
            level: maintenanceLevel,
            operatingHours,
            includeTasksInRange: true,
          })
          .then((result) => ({ type: 'maintenance', result }))
          .catch(() => ({ type: 'maintenance', result: null })),
      );
      sourcesUsed.push('maintenance-intervals');
    }

    // Run all tasks in parallel
    const results = await Promise.all(tasks);

    // Organize results by type
    const organized: {
      searchResults?: unknown[];
      checkpoint?: unknown;
      component?: unknown;
      maintenance?: unknown;
      sourcesUsed: string[];
    } = { sourcesUsed };

    for (const { type, result } of results) {
      if (!result) continue;

      switch (type) {
        case 'search':
          if ('results' in (result as Record<string, unknown>)) {
            organized.searchResults = (result as { results: unknown[] }).results;
          }
          break;
        case 'checkpoint':
          if ('found' in (result as Record<string, unknown>) && (result as { found: boolean }).found) {
            organized.checkpoint = (result as { checkpoint: unknown }).checkpoint;
          }
          break;
        case 'component':
          if ('found' in (result as Record<string, unknown>) && (result as { found: boolean }).found) {
            organized.component = (result as { component: unknown }).component;
          }
          break;
        case 'maintenance':
          organized.maintenance = result;
          break;
      }
    }

    return organized;
  },
});

/**
 * Step 2: Format the response
 *
 * Consolidates all gathered information into a structured response.
 */
const formatResponseStep = createStep({
  id: 'format-response',
  description: 'Formats gathered information into a structured response',
  inputSchema: z.object({
    searchResults: z.array(z.any()).optional(),
    checkpoint: z.any().optional(),
    component: z.any().optional(),
    maintenance: z.any().optional(),
    sourcesUsed: z.array(z.string()),
  }),
  outputSchema: z.object({
    summary: z.string(),
    searchResults: z.array(z.object({
      content: z.string(),
      sectionId: z.string(),
      checkpointNumber: z.number().optional(),
      score: z.number(),
    })).optional(),
    checkpoint: z.object({
      checkpointNumber: z.number(),
      checkpointName: z.string().optional(),
      sectionName: z.string().optional(),
      content: z.string(),
    }).optional(),
    component: z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      specs: z.record(z.unknown()).optional(),
      maintenanceSchedule: z.array(z.any()).optional(),
      monitoringPoints: z.array(z.any()).optional(),
      commonFailures: z.array(z.any()).optional(),
    }).optional(),
    maintenance: z.object({
      intervals: z.array(z.any()),
      summary: z.object({
        totalIntervals: z.number(),
        dueIntervals: z.number().optional(),
        nextDueInterval: z.string().optional(),
      }),
    }).optional(),
    sourcesUsed: z.array(z.string()),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { searchResults, checkpoint, component, maintenance, sourcesUsed } = inputData;
    const initData = getInitData() as { query: string };

    // Build summary based on what was found
    const summaryParts: string[] = [];

    if (checkpoint) {
      const cp = checkpoint as { checkpointNumber: number; checkpointName?: string };
      summaryParts.push(`Checkpoint ${cp.checkpointNumber}${cp.checkpointName ? `: ${cp.checkpointName}` : ''}`);
    }

    if (component) {
      const comp = component as { name: string; category: string };
      summaryParts.push(`Component: ${comp.name} (${comp.category})`);
    }

    if (maintenance) {
      const maint = maintenance as { summary: { totalIntervals: number; dueIntervals?: number } };
      summaryParts.push(`${maint.summary.totalIntervals} maintenance intervals`);
      if (maint.summary.dueIntervals) {
        summaryParts.push(`${maint.summary.dueIntervals} due`);
      }
    }

    if (searchResults && searchResults.length > 0) {
      summaryParts.push(`${searchResults.length} relevant results found`);
    }

    const summary = summaryParts.length > 0
      ? `Found: ${summaryParts.join(', ')}`
      : `No specific results found for: "${initData.query}"`;

    return {
      summary,
      searchResults: searchResults as Array<{
        content: string;
        sectionId: string;
        checkpointNumber?: number;
        score: number;
      }> | undefined,
      checkpoint: checkpoint as {
        checkpointNumber: number;
        checkpointName?: string;
        sectionName?: string;
        content: string;
      } | undefined,
      component: component as {
        id: string;
        name: string;
        category: string;
        specs?: Record<string, unknown>;
        maintenanceSchedule?: unknown[];
        monitoringPoints?: unknown[];
        commonFailures?: unknown[];
      } | undefined,
      maintenance: maintenance as {
        intervals: unknown[];
        summary: {
          totalIntervals: number;
          dueIntervals?: number;
          nextDueInterval?: string;
        };
      } | undefined,
      sourcesUsed,
    };
  },
});

/**
 * Inspection Info Workflow
 *
 * Handles general inspection queries by gathering information from multiple
 * sources in parallel. Use this for:
 * - Checkpoint details and procedures
 * - Component specifications and maintenance
 * - Maintenance intervals and schedules
 * - General inspection knowledge base queries
 *
 * This workflow runs tools in parallel for faster response times.
 */
export const inspectionInfoWorkflow = createWorkflow({
  id: 'inspection-info',
  description: `General inspection information workflow for vehicle queries.
Use this workflow when users ask about:
- Checkpoint details, procedures, or specifications (e.g., "What is checkpoint 5?")
- Component information (e.g., "Tell me about the engine", "MTU specifications")
- Maintenance schedules and intervals (e.g., "What maintenance is due at 500 hours?")
- General inspection questions (e.g., "How to check oil level?")

Do NOT use this for troubleshooting symptoms - use the troubleshooting workflow instead.`,
  inputSchema: z.object({
    query: z.string().describe('The user query about inspection information'),
    checkpointNumber: z.number().optional().describe('Specific checkpoint number if known'),
    componentId: z.string().optional().describe('Component ID (mtu_mb873, renk_hswl354, turmdrehkranz)'),
    maintenanceLevel: z.enum(['L1', 'L2', 'L3', 'L4']).optional().describe('Filter by maintenance level'),
    operatingHours: z.number().optional().describe('Current operating hours for maintenance queries'),
  }),
  outputSchema: z.object({
    summary: z.string(),
    searchResults: z.array(z.object({
      content: z.string(),
      sectionId: z.string(),
      checkpointNumber: z.number().optional(),
      score: z.number(),
    })).optional(),
    checkpoint: z.object({
      checkpointNumber: z.number(),
      checkpointName: z.string().optional(),
      sectionName: z.string().optional(),
      content: z.string(),
    }).optional(),
    component: z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      specs: z.record(z.unknown()).optional(),
      maintenanceSchedule: z.array(z.any()).optional(),
      monitoringPoints: z.array(z.any()).optional(),
      commonFailures: z.array(z.any()).optional(),
    }).optional(),
    maintenance: z.object({
      intervals: z.array(z.any()),
      summary: z.object({
        totalIntervals: z.number(),
        dueIntervals: z.number().optional(),
        nextDueInterval: z.string().optional(),
      }),
    }).optional(),
    sourcesUsed: z.array(z.string()),
  }),
})
  .then(gatherInformationStep)
  .then(formatResponseStep)
  .commit();

export { inspectionInfoWorkflow as default };
