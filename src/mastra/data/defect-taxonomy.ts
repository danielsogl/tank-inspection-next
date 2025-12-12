/**
 * Defect classification taxonomy based on NATO standards.
 *
 * Defines priority levels and categories for automatic defect classification.
 */

export type DefectPriority = "critical" | "high" | "medium" | "low" | "info";

export interface PriorityLevel {
  level: DefectPriority;
  name_de: string;
  name_en: string;
  response_time: string;
  vehicle_status: string;
  escalation: string;
  color: string;
  keywords: string[];
}

export interface DefectCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export const DEFECT_PRIORITIES: PriorityLevel[] = [
  {
    level: "critical",
    name_de: "KRITISCH",
    name_en: "CRITICAL",
    response_time: "sofort",
    vehicle_status: "nicht einsatzbereit (NMC - Not Mission Capable)",
    escalation:
      "Kommandant + Schirrmeister sofort informieren -> Kompaniechef innerhalb 1h",
    color: "#FF0000",
    keywords: [
      "ausfall",
      "blockiert",
      "kritisch",
      "sofort",
      "gefahr",
      "feuer",
      "explosion",
      "totalausfall",
      "nicht funktionsfähig",
      "lebensbedrohlich",
      "brand",
      "failure",
      "blocked",
      "critical",
      "danger",
      "fire",
    ],
  },
  {
    level: "high",
    name_de: "HOCH",
    name_en: "HIGH",
    response_time: "vor nächster Ausfahrt (innerhalb 24h)",
    vehicle_status: "bedingt einsatzbereit (PMC - Partially Mission Capable)",
    escalation: "Kommandant -> Schirrmeister am selben Tag",
    color: "#FF8C00",
    keywords: [
      "gerissen",
      "leckage",
      "defekt",
      "funktioniert nicht",
      "ausgefallen",
      "stark",
      "erheblich",
      "beschädigt",
      "versagt",
      "torn",
      "leakage",
      "defect",
      "broken",
      "damaged",
      "failed",
    ],
  },
  {
    level: "medium",
    name_de: "MITTEL",
    name_en: "MEDIUM",
    response_time: "innerhalb 48h",
    vehicle_status: "voll einsatzbereit mit Einschränkung (FMC-S)",
    escalation: "Meldung an Schirrmeister, Dokumentation für nächste Wartung",
    color: "#FFD700",
    keywords: [
      "verschleiß",
      "erhöht",
      "grenzwert",
      "nachlässt",
      "beeinträchtigt",
      "kleinere",
      "teilweise",
      "reduziert",
      "wear",
      "elevated",
      "threshold",
      "reduced",
      "partial",
    ],
  },
  {
    level: "low",
    name_de: "NIEDRIG",
    name_en: "LOW",
    response_time: "bei nächster planmäßiger Wartung",
    vehicle_status: "voll einsatzbereit (FMC - Fully Mission Capable)",
    escalation: "keine, nur Dokumentation",
    color: "#32CD32",
    keywords: [
      "leicht",
      "minimal",
      "kosmetisch",
      "oberflächlich",
      "geringfügig",
      "unerheblich",
      "minor",
      "slight",
      "cosmetic",
      "superficial",
    ],
  },
  {
    level: "info",
    name_de: "INFO",
    name_en: "INFO",
    response_time: "Kenntnisnahme",
    vehicle_status: "voll einsatzbereit (FMC - Fully Mission Capable)",
    escalation: "keine",
    color: "#1E90FF",
    keywords: [
      "hinweis",
      "information",
      "beobachtung",
      "notiz",
      "vorschlag",
      "note",
      "observation",
      "suggestion",
    ],
  },
];

export const DEFECT_CATEGORIES: DefectCategory[] = [
  {
    id: "mechanical",
    name: "Mechanisch",
    subcategories: [
      "verschleiß",
      "bruch",
      "verformung",
      "blockade",
      "lockerung",
      "korrosion",
    ],
  },
  {
    id: "hydraulic",
    name: "Hydraulik",
    subcategories: [
      "leckage",
      "druckverlust",
      "verschmutzung",
      "schlauch_defekt",
      "ventil_defekt",
    ],
  },
  {
    id: "electrical",
    name: "Elektrik",
    subcategories: [
      "kabelbruch",
      "kurzschluss",
      "spannungsabfall",
      "kontaktprobleme",
      "sicherung_defekt",
    ],
  },
  {
    id: "electronic",
    name: "Elektronik",
    subcategories: [
      "sensor_ausfall",
      "steuergerät_fehler",
      "software_fehler",
      "kommunikation_gestört",
      "anzeige_defekt",
    ],
  },
  {
    id: "structural",
    name: "Strukturell",
    subcategories: [
      "riss",
      "delle",
      "schweißnaht_defekt",
      "materialermüdung",
      "perforation",
    ],
  },
];

/**
 * Classifies a defect description by matching keywords against priority levels.
 */
export function classifyByKeywords(description: string): {
  priority: DefectPriority;
  matchedKeywords: string[];
  confidence: number;
} {
  const normalizedDescription = description.toLowerCase();

  for (const priority of DEFECT_PRIORITIES) {
    const matches = priority.keywords.filter((keyword) =>
      normalizedDescription.includes(keyword.toLowerCase()),
    );

    if (matches.length > 0) {
      return {
        priority: priority.level,
        matchedKeywords: matches,
        confidence: Math.min(1, matches.length * 0.3),
      };
    }
  }

  return {
    priority: "low",
    matchedKeywords: [],
    confidence: 0.1,
  };
}

/**
 * Identifies the defect category based on description text.
 */
export function identifyCategory(description: string): {
  category: string;
  categoryName: string;
  subcategory?: string;
} | null {
  const normalizedDescription = description.toLowerCase();

  for (const category of DEFECT_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      if (
        normalizedDescription.includes(
          subcategory.toLowerCase().replace("_", " "),
        )
      ) {
        return {
          category: category.id,
          categoryName: category.name,
          subcategory,
        };
      }
    }

    if (normalizedDescription.includes(category.name.toLowerCase())) {
      return {
        category: category.id,
        categoryName: category.name,
      };
    }
  }

  return null;
}

/**
 * Gets priority details by level.
 */
export function getPriorityDetails(
  priority: DefectPriority,
): PriorityLevel | undefined {
  return DEFECT_PRIORITIES.find((p) => p.level === priority);
}
