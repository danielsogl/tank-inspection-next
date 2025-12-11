/**
 * Text conversion utilities for transforming structured JSON data into semantic German text.
 * Used by the seed script to prepare data for vector embeddings.
 *
 * These converters produce natural German prose that embeds better than raw JSON,
 * improving semantic search quality for German language queries.
 */

import type {
  Checkpoint,
  Component,
  DefectPriorityDefinition,
  MaintenanceInterval,
  MaintenanceSection,
  VehicleData,
} from "../types/rag-data.types";

// ============================================================================
// Vehicle Converters
// ============================================================================

/**
 * Convert vehicle data to semantic German text.
 * Transforms structured specs into readable prose for better embedding quality.
 */
export function vehicleSpecsToText(vehicle: VehicleData): string {
  const { specs } = vehicle;

  const lines: string[] = [
    `${vehicle.name} (${vehicle.variant}) - ${vehicle.manufacturer}`,
    "",
    "Technische Spezifikationen:",
    `Das Fahrzeug wiegt ${specs.weight_tons} Tonnen und wird von einer ${specs.crew}-köpfigen Besatzung bedient.`,
  ];

  // Dimensions
  if (specs.dimensions) {
    lines.push(
      `Die Abmessungen betragen ${specs.dimensions.length_m}m Länge, ${specs.dimensions.width_m}m Breite und ${specs.dimensions.height_m}m Höhe.`,
    );
  }

  // Engine & Transmission
  const mainGun = specs.armament.main_gun;
  lines.push(
    "",
    "Antrieb:",
    `Motor: ${specs.engine.model} - ein ${specs.engine.type} mit ${specs.engine.power_hp} PS (${specs.engine.power_kw} kW) und ${specs.engine.displacement_l} Liter Hubraum.`,
    `Getriebe: ${specs.transmission.model} (${specs.transmission.type}) mit ${specs.transmission.gears_forward} Vorwärtsgängen und ${specs.transmission.gears_reverse} Rückwärtsgang.`,
    "",
    "Bewaffnung:",
    `Hauptwaffe: ${mainGun.model} im Kaliber ${mainGun.caliber_mm}mm (${mainGun.barrel_length}) mit ${mainGun.ammunition_capacity} Schuss Munitionskapazität.`,
  );

  if (specs.armament.secondary_weapons?.length) {
    const secondaryList = specs.armament.secondary_weapons
      .map((w) => {
        const caliber = w.caliber_mm ? ` (${w.caliber_mm}mm)` : "";
        return `${w.type} ${w.model}${caliber}`;
      })
      .join(", ");
    lines.push(`Sekundärbewaffnung: ${secondaryList}.`);
  }

  // Performance
  const performanceLines = ["", "Leistungsdaten:"];
  if (specs.max_speed_kmh)
    performanceLines.push(`Höchstgeschwindigkeit: ${specs.max_speed_kmh} km/h`);
  if (specs.range_km) performanceLines.push(`Reichweite: ${specs.range_km} km`);
  if (specs.fuel_capacity_l)
    performanceLines.push(
      `Kraftstoffkapazität: ${specs.fuel_capacity_l} Liter`,
    );
  lines.push(...performanceLines);

  // Armor
  if (specs.armor) {
    const armorLines = ["", "Panzerung:"];
    if (specs.armor.type) armorLines.push(`Typ: ${specs.armor.type}`);
    if (specs.armor.hull_front_mm)
      armorLines.push(`Wannenfront: ${specs.armor.hull_front_mm}mm`);
    if (specs.armor.turret_front_mm)
      armorLines.push(`Turmfront: ${specs.armor.turret_front_mm}mm`);
    lines.push(...armorLines);
  }

  // Notes
  if (vehicle.notes) {
    lines.push("", vehicle.notes);
  }

  return lines.join("\n").trim();
}

// ============================================================================
// Checkpoint Converters
// ============================================================================

/**
 * Convert checkpoint base info to semantic German text.
 * Creates a focused chunk with core checkpoint information.
 */
export function checkpointBaseToText(
  section: MaintenanceSection,
  checkpoint: Checkpoint,
): string {
  const expectedVal =
    typeof checkpoint.expected_value === "string"
      ? checkpoint.expected_value
      : checkpoint.expected_value.description;

  const lines: string[] = [
    `Sektion ${section.id}: ${section.name}`,
    `Prüfpunkt ${checkpoint.number}: ${checkpoint.name}`,
    "",
    `Beschreibung: ${checkpoint.description}`,
    `Prüfungsart: ${formatCheckpointType(checkpoint.type)}`,
    `Erwartetes Ergebnis: ${expectedVal}`,
  ];

  // Expected value with thresholds
  if (
    typeof checkpoint.expected_value === "object" &&
    checkpoint.expected_value.unit
  ) {
    const ev = checkpoint.expected_value;
    if (ev.min !== undefined || ev.max !== undefined) {
      lines.push(
        `Normalbereich: ${ev.min ?? "-"} bis ${ev.max ?? "-"} ${ev.unit}`,
      );
    }
    if (ev.critical_threshold) {
      lines.push(
        `Kritischer Grenzwert: ${ev.critical_threshold.min ?? "-"} / ${ev.critical_threshold.max ?? "-"} ${ev.unit}`,
      );
    }
  }

  lines.push(
    `Benötigte Werkzeuge: ${checkpoint.tools_required.join(", ") || "Keine"}`,
    `Geschätzte Dauer: ${checkpoint.estimated_time_min} Minuten`,
    `Foto erforderlich: ${checkpoint.photo_required ? "Ja" : "Nein"}`,
    `Verantwortlich: ${formatCrewRole(checkpoint.responsible_role)}`,
    `Varianten: ${checkpoint.vehicle_variants.join(", ")}`,
  );

  if (checkpoint.notes) {
    lines.push("", `Hinweis: ${checkpoint.notes}`);
  }

  return lines.join("\n").trim();
}

/**
 * Convert checkpoint tasks to semantic German text.
 * Returns null if there are no tasks or they're simple.
 */
export function checkpointTasksToText(
  section: MaintenanceSection,
  checkpoint: Checkpoint,
): string | null {
  if (!checkpoint.tasks?.length) return null;

  const lines: string[] = [
    `Arbeitsschritte für Prüfpunkt ${checkpoint.number} (${checkpoint.name}):`,
    `Sektion: ${section.name}`,
    "",
  ];

  for (const task of checkpoint.tasks) {
    lines.push(`${task.step}. ${task.description}`);
    if (task.details) {
      lines.push(`   Details: ${task.details}`);
    }
    if (task.lubricant) {
      const lubInfo = [`Schmiermittel: ${task.lubricant.type}`];
      if (task.lubricant.quantity)
        lubInfo.push(`Menge: ${task.lubricant.quantity}`);
      if (task.lubricant.points)
        lubInfo.push(`${task.lubricant.points} Schmierstellen`);
      lines.push(`   ${lubInfo.join(", ")}`);
    }
  }

  return lines.join("\n").trim();
}

/**
 * Convert checkpoint defects to individual semantic German text chunks.
 * Returns an array with one text entry per defect.
 */
export function checkpointDefectsToText(
  section: MaintenanceSection,
  checkpoint: Checkpoint,
): string[] {
  if (!checkpoint.common_defects?.length) return [];

  return checkpoint.common_defects.map((defect) => {
    const lines: string[] = [
      `Häufiger Mangel bei Prüfpunkt ${checkpoint.number} (${checkpoint.name}):`,
      `Sektion: ${section.name}`,
      "",
      `Mangel: ${defect.description}`,
      `Priorität: ${formatPriority(defect.priority)}`,
      "",
      "Anzeichen:",
      ...defect.indicators.map((i) => `- ${i}`),
      "",
      `Erforderliche Maßnahme: ${defect.action}`,
    ];

    return lines.join("\n").trim();
  });
}

// ============================================================================
// Component Converters
// ============================================================================

/**
 * Convert component specs to semantic German text.
 * Transforms the specs object from JSON key-value pairs to readable prose.
 */
export function componentSpecsToText(component: Component): string {
  const lines: string[] = [
    `Komponente: ${component.name}`,
    `Kategorie: ${formatCategory(component.category)}`,
    "",
    "Technische Daten:",
  ];

  // Convert specs object to readable lines
  for (const [key, value] of Object.entries(component.specs)) {
    const readableKey = formatSpecKey(key);
    const formattedValue = formatSpecValue(value);
    lines.push(`${readableKey}: ${formattedValue}`);
  }

  if (component.notes) {
    lines.push("", component.notes);
  }

  return lines.join("\n").trim();
}

/**
 * Convert monitoring points to individual semantic German text chunks.
 * Returns an array with one text entry per monitoring point.
 */
export function monitoringPointsToText(component: Component): string[] {
  if (!component.monitoring_points?.length) return [];

  return component.monitoring_points.map((point) => {
    const lines: string[] = [
      `Überwachungsparameter für ${component.name}: ${point.name}`,
      `Einheit: ${point.unit}`,
      `Normalbereich: ${point.normal_range.min ?? "-"} bis ${point.normal_range.max ?? "-"} ${point.unit}`,
    ];

    if (point.critical_threshold) {
      lines.push(
        `Kritischer Grenzwert: ${point.critical_threshold.min ?? "-"} / ${point.critical_threshold.max ?? "-"} ${point.unit}`,
      );
    }

    return lines.join("\n").trim();
  });
}

/**
 * Convert component failures to individual semantic German text chunks.
 * Returns an array with one text entry per failure mode.
 */
export function componentFailuresToText(component: Component): string[] {
  if (!component.common_failures?.length) return [];

  return component.common_failures.map((failure) => {
    const lines: string[] = [
      `Häufiger Ausfall bei ${component.name}: ${failure.name}`,
      `MTBF: ${failure.mtbf_hours ?? "unbekannt"} Betriebsstunden`,
      "",
      "Symptome:",
      ...failure.symptoms.map((s) => `- ${s}`),
    ];

    if (failure.cause) {
      lines.push("", `Ursache: ${failure.cause}`);
    }

    return lines.join("\n").trim();
  });
}

// ============================================================================
// Defect Taxonomy Converters
// ============================================================================

/**
 * Convert defect priority definition to semantic German text.
 */
export function defectPriorityToText(
  priority: DefectPriorityDefinition,
): string {
  const lines: string[] = [
    `Mangelpriorität: ${priority.name_de} (${priority.name_en})`,
    `Level: ${priority.level}`,
    "",
    `Reaktionszeit: ${priority.response_time}`,
    `Fahrzeugstatus: ${priority.vehicle_status}`,
    `Eskalation: ${priority.escalation}`,
    "",
    "Beispiele:",
    ...priority.examples.map((ex) => `- ${ex}`),
    "",
    `Keywords: ${priority.keywords.join(", ")}`,
  ];

  return lines.join("\n").trim();
}

// ============================================================================
// Maintenance Interval Converters
// ============================================================================

/**
 * Convert maintenance interval to semantic German text.
 */
export function maintenanceIntervalToText(
  interval: MaintenanceInterval,
): string {
  const triggerText = formatTrigger(interval.trigger);

  const lines: string[] = [
    `Wartungsintervall: ${interval.name}`,
    `Level: ${interval.level}`,
    `Ausführung: ${formatExecutor(interval.executor)}`,
    `Dauer: ${interval.duration}`,
    "",
    `Auslöser: ${triggerText}`,
    "",
    "Aufgaben:",
    ...interval.tasks.map((task) => `- ${task}`),
  ];

  if (interval.notes) {
    lines.push("", interval.notes);
  }

  return lines.join("\n").trim();
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatCheckpointType(type: string): string {
  const typeMap: Record<string, string> = {
    visual_check: "Sichtprüfung",
    inspection_action: "Prüfhandlung",
    measurement: "Messung",
    functional_test: "Funktionsprüfung",
  };
  return typeMap[type] || type;
}

function formatCrewRole(role: string): string {
  const roleMap: Record<string, string> = {
    driver: "Fahrer",
    commander: "Kommandant",
    gunner: "Richtschütze",
    loader: "Ladeschütze",
  };
  return roleMap[role] || role;
}

function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    critical: "KRITISCH",
    high: "HOCH",
    medium: "MITTEL",
    low: "NIEDRIG",
    info: "INFO",
  };
  return priorityMap[priority] || priority;
}

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    powertrain: "Antriebsstrang",
    turret: "Turm",
    hull: "Wanne",
    electronics: "Elektronik",
    armament: "Bewaffnung",
  };
  return categoryMap[category] || category;
}

function formatSpecKey(key: string): string {
  // Common spec key translations
  const keyMap: Record<string, string> = {
    type: "Typ",
    model: "Modell",
    displacement_l: "Hubraum (Liter)",
    power_hp: "Leistung (PS)",
    power_kw: "Leistung (kW)",
    cylinders: "Zylinder",
    cooling: "Kühlung",
    max_rpm: "Max. Drehzahl",
    idle_rpm: "Leerlaufdrehzahl",
    fuel_consumption_l_per_100km: "Verbrauch (l/100km)",
    oil_capacity_l: "Ölkapazität (Liter)",
    coolant_capacity_l: "Kühlmittel (Liter)",
    weight_kg: "Gewicht (kg)",
    gears_forward: "Vorwärtsgänge",
    gears_reverse: "Rückwärtsgänge",
    max_torque_nm: "Max. Drehmoment (Nm)",
    gear_ratios: "Übersetzungsverhältnisse",
    rotation_speed: "Drehgeschwindigkeit",
    traverse_range: "Schwenkbereich",
    elevation_range: "Höhenrichtbereich",
    drive_type: "Antriebsart",
  };

  // Return mapped key or format the original
  if (keyMap[key]) return keyMap[key];

  // Convert snake_case to readable format
  return key
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (l) => l.toUpperCase())
    .replaceAll(/([A-Z])/g, " $1")
    .trim();
}

function formatSpecValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    // For nested objects, create a compact representation
    return Object.entries(value)
      .map(([k, v]) => `${formatSpecKey(k)}: ${formatSpecValue(v)}`)
      .join("; ");
  }
  // Handle remaining primitive types (symbol, bigint, function)
  return typeof value === "bigint" ? value.toString() : String(value);
}

function formatExecutor(executor: string): string {
  const executorMap: Record<string, string> = {
    crew: "Besatzung",
    technician: "Techniker",
    specialist: "Spezialist",
    depot: "Instandsetzung",
  };
  return executorMap[executor] || executor;
}

function formatTrigger(trigger: {
  type: string;
  value: number | string;
  unit?: string;
}): string {
  const typeMap: Record<string, string> = {
    operating_hours: "Betriebsstunden",
    calendar: "Kalender",
    event: "Ereignis",
  };

  const triggerType = typeMap[trigger.type] || trigger.type;

  if (trigger.type === "event") {
    return `${triggerType}: ${trigger.value}`;
  }

  const unitMap: Record<string, string> = {
    hours: "Stunden",
    days: "Tage",
    months: "Monate",
  };
  const unit = trigger.unit ? unitMap[trigger.unit] || trigger.unit : "";

  return `${triggerType} = ${trigger.value} ${unit}`.trim();
}
