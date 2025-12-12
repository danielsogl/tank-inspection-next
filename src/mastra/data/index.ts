/**
 * Mastra data module exports.
 *
 * Contains domain-specific data structures for vehicle inspection:
 * - Defect taxonomy and classification
 * - Maintenance intervals and schedules
 */

export {
  classifyByKeywords,
  DEFECT_CATEGORIES,
  DEFECT_PRIORITIES,
  type DefectCategory,
  type DefectPriority,
  getPriorityDetails,
  identifyCategory,
  type PriorityLevel,
} from "./defect-taxonomy";

export {
  EXECUTOR_DESCRIPTIONS,
  type Executor,
  getExecutorDescription,
  getIntervalById,
  getIntervalsByLevel,
  MAINTENANCE_INTERVALS,
  type MaintenanceInterval,
  type MaintenanceLevel,
  type MaintenanceTrigger,
  type TriggerType,
} from "./maintenance-intervals";
