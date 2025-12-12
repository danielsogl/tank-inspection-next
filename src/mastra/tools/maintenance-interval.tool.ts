import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  getExecutorDescription,
  MAINTENANCE_INTERVALS,
  type MaintenanceLevel,
} from "../data/maintenance-intervals";

/**
 * Tool for querying maintenance intervals based on NATO AJP-4 and MTU concept.
 */
export const getMaintenanceIntervalTool = createTool({
  id: "get-maintenance-interval",
  description: `Get maintenance interval information based on NATO AJP-4 and MTU maintenance concept.

This tool provides:
- Interval-specific tasks and checklists
- Duration estimates
- Responsible executor (crew, technician, depot)
- Trigger conditions (hours, calendar, events)
- Applicable maintenance sections

Maintenance levels:
- L1: Organizational (Crew) - Daily, weekly, pre/post deployment
- L2: Intermediate (Unit Technician) - 250h, 500h, annual
- L3: Field Depot (Mobile Repair Team) - 1000h
- L4: Base Depot (Manufacturer) - 6000h major overhaul

Use this tool when:
- Determining what maintenance is due based on operating hours
- Planning maintenance schedules
- Getting task lists for specific maintenance levels
- Understanding escalation paths for maintenance`,
  inputSchema: z.object({
    level: z
      .enum(["L1", "L2", "L3", "L4"])
      .optional()
      .describe("Filter by maintenance level (L1-L4)"),
    operatingHours: z
      .number()
      .optional()
      .describe(
        "Current operating hours to determine which maintenance intervals are due",
      ),
    intervalId: z
      .string()
      .optional()
      .describe(
        'Get a specific interval by ID (e.g., "L2-250H", "L1-DAILY", "L3-1000H")',
      ),
    includeTasksInRange: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "When using operatingHours, include all intervals up to that point",
      ),
  }),
  outputSchema: z.object({
    intervals: z.array(
      z.object({
        id: z.string(),
        level: z.enum(["L1", "L2", "L3", "L4"]),
        name: z.string(),
        executor: z.string(),
        executorName: z.object({
          de: z.string(),
          en: z.string(),
        }),
        trigger: z.object({
          type: z.enum(["event", "calendar", "operating_hours"]),
          value: z.union([z.string(), z.number()]),
          unit: z.string().optional(),
        }),
        duration: z.string(),
        tasks: z.array(z.string()),
        sections: z.array(z.string()),
        notes: z.string(),
        isDue: z.boolean().optional(),
        hoursUntilDue: z.number().optional(),
      }),
    ),
    summary: z.object({
      totalIntervals: z.number(),
      dueIntervals: z.number().optional(),
      nextDueInterval: z.string().optional(),
      hoursUntilNext: z.number().optional(),
    }),
  }),
  execute: async (inputData) => {
    const { level, operatingHours, intervalId, includeTasksInRange } =
      inputData;

    let filteredIntervals = [...MAINTENANCE_INTERVALS];

    if (intervalId) {
      filteredIntervals = filteredIntervals.filter((i) => i.id === intervalId);
    }

    if (level) {
      filteredIntervals = filteredIntervals.filter((i) => i.level === level);
    }

    const processedIntervals = filteredIntervals.map((interval) => {
      const executorName = getExecutorDescription(interval.executor);

      const processed: {
        id: string;
        level: MaintenanceLevel;
        name: string;
        executor: string;
        executorName: { de: string; en: string };
        trigger: {
          type: "event" | "calendar" | "operating_hours";
          value: string | number;
          unit?: string;
        };
        duration: string;
        tasks: string[];
        sections: string[];
        notes: string;
        isDue?: boolean;
        hoursUntilDue?: number;
      } = {
        id: interval.id,
        level: interval.level,
        name: interval.name,
        executor: interval.executor,
        executorName,
        trigger: interval.trigger as {
          type: "event" | "calendar" | "operating_hours";
          value: string | number;
          unit?: string;
        },
        duration: interval.duration,
        tasks: interval.tasks,
        sections: interval.sections,
        notes: interval.notes,
      };

      if (
        operatingHours !== undefined &&
        interval.trigger.type === "operating_hours"
      ) {
        const triggerHours = interval.trigger.value as number;
        const hoursUntilDue = triggerHours - (operatingHours % triggerHours);
        processed.isDue = hoursUntilDue <= 50;
        processed.hoursUntilDue = hoursUntilDue;
      }

      return processed;
    });

    let resultIntervals = processedIntervals;
    if (operatingHours !== undefined && includeTasksInRange) {
      resultIntervals = processedIntervals.filter((i) => {
        if (i.trigger.type === "operating_hours") {
          return (i.trigger.value as number) <= operatingHours;
        }
        return true;
      });
    }

    const dueIntervals = resultIntervals.filter((i) => i.isDue).length;
    const hourBasedIntervals = resultIntervals
      .filter(
        (i) =>
          i.trigger.type === "operating_hours" && i.hoursUntilDue !== undefined,
      )
      .sort((a, b) => (a.hoursUntilDue || 0) - (b.hoursUntilDue || 0));

    const summary: {
      totalIntervals: number;
      dueIntervals?: number;
      nextDueInterval?: string;
      hoursUntilNext?: number;
    } = {
      totalIntervals: resultIntervals.length,
    };

    if (operatingHours !== undefined) {
      summary.dueIntervals = dueIntervals;
      if (hourBasedIntervals.length > 0) {
        summary.nextDueInterval = hourBasedIntervals[0].id;
        summary.hoursUntilNext = hourBasedIntervals[0].hoursUntilDue;
      }
    }

    return {
      intervals: resultIntervals,
      summary,
    };
  },
});
