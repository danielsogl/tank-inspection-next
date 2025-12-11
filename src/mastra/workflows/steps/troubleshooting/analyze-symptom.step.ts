import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Step 1: Analyze the symptom description to extract keywords and identify affected systems.
 *
 * This step parses the user's symptom description and:
 * - Extracts keywords for semantic search
 * - Identifies potentially affected vehicle systems
 * - Prepares data for parallel knowledge base queries
 */
export const analyzeSymptomStep = createStep({
  id: "analyze-symptom",
  description:
    "Analyzes symptom description to extract keywords and identify affected systems",
  inputSchema: z.object({
    symptomDescription: z.string(),
    vehicleId: z.string(),
    componentHint: z.string().optional(),
    requireApproval: z.boolean().default(false),
  }),
  outputSchema: z.object({
    symptomDescription: z.string(),
    vehicleId: z.string(),
    componentHint: z.string().optional(),
    requireApproval: z.boolean(),
    keywords: z.array(z.string()),
    affectedSystems: z.array(z.string()),
    searchQueries: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { symptomDescription, vehicleId, componentHint, requireApproval } =
      inputData;

    // System keyword mappings for identification
    const systemKeywords: Record<string, string[]> = {
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
      turret: [
        "turm",
        "turret",
        "drehkranz",
        "rotation",
        "richtung",
        "elevation",
      ],
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
    };

    const normalizedSymptom = symptomDescription.toLowerCase();

    // Identify affected systems
    const affectedSystems: string[] = [];
    for (const [system, keywords] of Object.entries(systemKeywords)) {
      if (keywords.some((keyword) => normalizedSymptom.includes(keyword))) {
        affectedSystems.push(system);
      }
    }

    // If component hint is provided, add it as an affected system
    if (componentHint) {
      const hintSystem = Object.entries(systemKeywords).find(([, keywords]) =>
        keywords.some((k) => componentHint.toLowerCase().includes(k)),
      );
      if (hintSystem && !affectedSystems.includes(hintSystem[0])) {
        affectedSystems.push(hintSystem[0]);
      }
    }

    // Default to general if no systems identified
    if (affectedSystems.length === 0) {
      affectedSystems.push("general");
    }

    // Extract significant keywords from the symptom
    const stopWords = new Set([
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

    const keywords = normalizedSymptom
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);

    // Generate search queries for the knowledge base
    const searchQueries = [
      symptomDescription,
      ...affectedSystems.map((sys) => `${sys} problem troubleshooting`),
      ...(componentHint ? [`${componentHint} failure symptoms`] : []),
    ];

    return {
      symptomDescription,
      vehicleId,
      componentHint,
      requireApproval,
      keywords,
      affectedSystems,
      searchQueries,
    };
  },
});
