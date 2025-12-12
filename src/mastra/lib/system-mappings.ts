/**
 * Consolidated system and component mappings for vehicle inspection.
 *
 * Provides a single source of truth for:
 * - System identification from text
 * - System to component mapping
 * - Component resolution from hints
 */

export type VehicleSystem =
  | "engine"
  | "transmission"
  | "hydraulic"
  | "electrical"
  | "turret"
  | "tracks"
  | "cooling"
  | "fuel"
  | "brakes"
  | "electronics"
  | "general";

export type ComponentId = "mtu_mb873" | "renk_hswl354" | "turmdrehkranz";

/**
 * Keywords for identifying affected vehicle systems from text.
 * Supports both German and English keywords.
 */
export const SYSTEM_KEYWORDS: Record<VehicleSystem, string[]> = {
  engine: [
    "motor",
    "engine",
    "antrieb",
    "diesel",
    "mtu",
    "leistung",
    "power",
    "drehzahl",
    "rpm",
  ],
  transmission: [
    "getriebe",
    "transmission",
    "renk",
    "gang",
    "gear",
    "kupplung",
    "clutch",
  ],
  hydraulic: [
    "hydraulik",
    "hydraulic",
    "druck",
    "pressure",
    "öl",
    "oil",
    "leck",
    "leak",
  ],
  electrical: [
    "elektrik",
    "electrical",
    "strom",
    "batterie",
    "battery",
    "spannung",
    "voltage",
  ],
  turret: ["turm", "turret", "drehkranz", "rotation", "richtung", "elevation"],
  tracks: [
    "kette",
    "track",
    "fahrwerk",
    "suspension",
    "laufwerk",
    "rolle",
    "wheel",
  ],
  cooling: [
    "kühlung",
    "cooling",
    "temperatur",
    "temperature",
    "überhitzung",
    "overheating",
  ],
  fuel: ["kraftstoff", "fuel", "diesel", "tank", "filter", "pumpe", "pump"],
  brakes: ["bremse", "brake", "stopp", "stop", "blockiert", "blocked"],
  electronics: [
    "elektronik",
    "electronic",
    "sensor",
    "steuerung",
    "control",
    "fehler",
    "error",
  ],
  general: [],
};

/**
 * Maps vehicle systems to their primary component IDs.
 */
export const SYSTEM_TO_COMPONENT_MAP: Record<VehicleSystem, ComponentId[]> = {
  engine: ["mtu_mb873"],
  transmission: ["renk_hswl354"],
  turret: ["turmdrehkranz"],
  hydraulic: ["renk_hswl354"], // Transmission has hydraulic components
  cooling: ["mtu_mb873"], // Engine has cooling system
  electrical: [],
  tracks: [],
  fuel: ["mtu_mb873"],
  brakes: [],
  electronics: [],
  general: [],
};

/**
 * Component hint patterns for resolving component IDs from text hints.
 */
const COMPONENT_HINT_PATTERNS: Array<{
  patterns: string[];
  componentId: ComponentId;
}> = [
  {
    patterns: ["mtu", "motor", "engine"],
    componentId: "mtu_mb873",
  },
  {
    patterns: ["renk", "getriebe", "transmission"],
    componentId: "renk_hswl354",
  },
  {
    patterns: ["turm", "turret", "drehkranz"],
    componentId: "turmdrehkranz",
  },
];

/**
 * Stop words to filter from keyword extraction (German and English).
 */
export const STOP_WORDS = new Set([
  "der",
  "die",
  "das",
  "ein",
  "eine",
  "und",
  "oder",
  "aber",
  "wenn",
  "ist",
  "sind",
  "hat",
  "haben",
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "is",
  "are",
  "has",
  "have",
  "when",
  "what",
  "how",
]);

/**
 * Identifies affected vehicle systems from a text description.
 *
 * @param text - The text to analyze (symptom description, query, etc.)
 * @returns Array of identified system names
 */
export function identifyAffectedSystems(text: string): VehicleSystem[] {
  const normalizedText = text.toLowerCase();
  const affectedSystems: VehicleSystem[] = [];

  for (const [system, keywords] of Object.entries(SYSTEM_KEYWORDS)) {
    if (keywords.some((keyword) => normalizedText.includes(keyword))) {
      affectedSystems.push(system as VehicleSystem);
    }
  }

  return affectedSystems.length > 0 ? affectedSystems : ["general"];
}

/**
 * Gets component IDs for a list of affected systems.
 *
 * @param systems - Array of system names
 * @returns Set of unique component IDs
 */
export function getComponentsForSystems(
  systems: VehicleSystem[],
): Set<ComponentId> {
  const components = new Set<ComponentId>();

  for (const system of systems) {
    const mappedComponents = SYSTEM_TO_COMPONENT_MAP[system];
    if (mappedComponents) {
      for (const c of mappedComponents) {
        components.add(c);
      }
    }
  }

  return components;
}

/**
 * Resolves a component ID from a text hint.
 *
 * @param hint - The component hint text (e.g., "MTU engine", "transmission")
 * @returns The resolved component ID or null if not matched
 */
export function resolveComponentFromHint(hint: string): ComponentId | null {
  const normalizedHint = hint.toLowerCase();

  for (const { patterns, componentId } of COMPONENT_HINT_PATTERNS) {
    if (patterns.some((pattern) => normalizedHint.includes(pattern))) {
      return componentId;
    }
  }

  return null;
}

/**
 * Adds system from component hint if not already present.
 *
 * @param systems - Existing array of systems
 * @param hint - The component hint text
 * @returns Updated array with any additional system from hint
 */
export function addSystemFromHint(
  systems: VehicleSystem[],
  hint: string,
): VehicleSystem[] {
  const normalizedHint = hint.toLowerCase();
  const result = [...systems];

  for (const [system, keywords] of Object.entries(SYSTEM_KEYWORDS)) {
    if (
      keywords.some((k) => normalizedHint.includes(k)) &&
      !result.includes(system as VehicleSystem)
    ) {
      result.push(system as VehicleSystem);
      break;
    }
  }

  return result;
}

/**
 * Extracts significant keywords from text, filtering stop words.
 *
 * @param text - The text to extract keywords from
 * @param maxKeywords - Maximum number of keywords to return (default: 10)
 * @returns Array of significant keywords
 */
export function extractKeywords(text: string, maxKeywords = 10): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, maxKeywords);
}

/**
 * Default component ID when no systems are identified.
 */
export const DEFAULT_COMPONENT_ID: ComponentId = "mtu_mb873";
