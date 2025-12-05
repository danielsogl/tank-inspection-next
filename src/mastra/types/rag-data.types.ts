/**
 * TypeScript type definitions for structured RAG data model
 * @module rag-data.types
 * @description Defines types for vehicle data, maintenance checkpoints, components, defects, and intervals
 */

// ============================================================================
// Vehicle Master Data Types
// ============================================================================

export interface EngineSpecs {
  model: string;
  type: string;
  power_hp: number;
  power_kw: number;
  displacement_l: number;
  cylinders?: number;
  cooling?: string;
}

export interface TransmissionSpecs {
  model: string;
  type: string;
  gears_forward: number;
  gears_reverse: number;
}

export interface ArmamentSpecs {
  main_gun: {
    model: string;
    caliber_mm: number;
    barrel_length: string;
    ammunition_capacity: number;
  };
  secondary_weapons?: Array<{
    type: string;
    model: string;
    caliber_mm?: number;
    ammunition_capacity?: number;
  }>;
}

export interface Dimensions {
  length_m: number;
  width_m: number;
  height_m: number;
}

export interface VehicleSpecs {
  weight_tons: number;
  dimensions: Dimensions;
  crew: number;
  engine: EngineSpecs;
  transmission: TransmissionSpecs;
  armament: ArmamentSpecs;
  fuel_capacity_l?: number;
  max_speed_kmh?: number;
  range_km?: number;
  armor?: {
    hull_front_mm?: number;
    turret_front_mm?: number;
    type?: string;
  };
}

export interface VehicleData {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  country: string;
  in_service_since: number;
  variant: string;
  specs: VehicleSpecs;
  systems?: string[];
  notes?: string;
  source?: string;
  source_type?: 'official' | 'public' | 'estimated';
  last_verified?: string;
}

// ============================================================================
// Crew Role Types
// ============================================================================

export interface CrewRole {
  id: string;
  name_de: string;
  name_en: string;
  responsibilities: string[];
  maintenance_sections: string[];
  primary_systems: string[];
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export type CheckpointType =
  | 'visual_check'
  | 'inspection_action'
  | 'measurement'
  | 'functional_test';

export interface ExpectedValue {
  description: string;
  min?: number;
  max?: number;
  unit?: string;
  critical_threshold?: {
    min?: number;
    max?: number;
  };
}

export interface CheckpointTask {
  step: number;
  description: string;
  details?: string;
  lubricant?: {
    type: string;
    quantity?: string;
    points?: number;
    positions?: string[];
  };
}

export interface DefectIndicator {
  id: string;
  description: string;
  indicators: string[];
  priority: DefectPriority;
  action: string;
}

export interface Checkpoint {
  id: string;
  number: number;
  name: string;
  description: string;
  type: CheckpointType;
  expected_value: string | ExpectedValue;
  tools_required: string[];
  estimated_time_min: number;
  photo_required: boolean;
  photo_points?: string[];
  tasks?: CheckpointTask[];
  common_defects?: DefectIndicator[];
  vehicle_variants: string[];
  responsible_role: string;
  notes?: string;
}

export interface MaintenanceSection {
  id: string;
  name: string;
  responsible_roles: string[];
  subsystems: Checkpoint[];
}

// ============================================================================
// Component Types
// ============================================================================

export interface MonitoringPoint {
  name: string;
  unit: string;
  normal_range: {
    min?: number;
    max?: number;
  };
  critical_threshold?: {
    min?: number;
    max?: number;
  };
}

export interface MaintenanceSchedule {
  interval_hours: number;
  description: string;
  tasks: string[];
}

export interface ComponentFailure {
  id: string;
  name: string;
  mtbf_hours?: number;
  symptoms: string[];
  cause?: string;
}

export interface DiagnosticSystem {
  system: string;
  interface: string;
  monitored_parameters: string[];
  calibration_interval?: string;
}

export interface Component {
  id: string;
  name: string;
  category: string;
  specs: Record<string, unknown>;
  maintenance_schedule?: MaintenanceSchedule[];
  monitoring_points?: MonitoringPoint[];
  common_failures?: ComponentFailure[];
  diagnostics?: DiagnosticSystem;
  notes?: string;
}

// ============================================================================
// Defect Classification Types
// ============================================================================

export type DefectPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface DefectPriorityDefinition {
  level: DefectPriority;
  name_de: string;
  name_en: string;
  response_time: string;
  vehicle_status: string;
  escalation: string;
  color: string;
  icon: string;
  examples: string[];
  keywords: string[];
}

export interface DefectCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export interface DefectTaxonomy {
  priorities: DefectPriorityDefinition[];
  categories: DefectCategory[];
}

export interface DefectRecommendation {
  defect_type: string;
  priority: DefectPriority;
  action: string;
  spare_parts?: string[];
  required_expertise?: string;
  maintenance_level?: string;
}

// ============================================================================
// Maintenance Interval Types
// ============================================================================

export type MaintenanceLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface MaintenanceTrigger {
  type: 'operating_hours' | 'calendar' | 'event';
  value: number | string;
  unit?: 'hours' | 'days' | 'months';
}

export interface MaintenanceInterval {
  id: string;
  level: MaintenanceLevel;
  name: string;
  executor: string;
  trigger: MaintenanceTrigger;
  duration: string;
  tasks: string[];
  sections?: string[];
  notes?: string;
}

// ============================================================================
// NLP Types
// ============================================================================

export interface Intent {
  id: string;
  name: string;
  patterns: string[];
  response_template: string;
  parameters?: string[];
}

export interface Entity {
  id: string;
  name: string;
  values: Array<{
    value: string;
    synonyms: string[];
  }>;
}

export interface ResponseTemplate {
  id: string;
  template: string;
  variables: string[];
}

// ============================================================================
// Vector Store Metadata Types
// ============================================================================

export type DataType = 'vehicle' | 'checkpoint' | 'component' | 'defect' | 'interval' | 'legacy';

export interface InspectionChunkMetadata {
  /** The vehicle type this chunk belongs to */
  vehicleType: 'leopard2' | 'm1a2';
  /** The section ID (A-F) */
  sectionId: string;
  /** The human-readable section name */
  sectionName?: string;
  /** The original text content */
  text: string;
  /** Source file reference */
  source?: string;

  /** Vehicle variant (e.g., "A4", "A5", "A6", "A7V") */
  vehicleVariant?: string;
  /** Crew role (e.g., "driver", "commander", "gunner", "loader") */
  crewRole?: string;
  /** Maintenance level (L1-L4) */
  maintenanceLevel?: MaintenanceLevel;
  /** Component ID for component knowledge */
  componentId?: string;
  /** Defect priority level */
  priority?: DefectPriority;
  /** Estimated time in minutes for checkpoint */
  estimatedTimeMin?: number;
  /** The checkpoint number if applicable */
  checkpointNumber?: number;
  /** The checkpoint name */
  checkpointName?: string;
  /** @deprecated Use crewRole instead */
  role?: string;
  /** Data type discriminator */
  dataType: DataType;
}
