import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  classifyByKeywords,
  type DefectPriority,
  getPriorityDetails,
  identifyCategory,
} from "../data/defect-taxonomy";

/**
 * Tool for automatic defect classification based on keyword matching.
 */
export const classifyDefectTool = createTool({
  id: "classify-defect",
  description: `Automatically classify a defect description into a priority level.

This tool analyzes defect descriptions and assigns:
- Priority level: critical, high, medium, low, or info
- Response time requirements
- Vehicle status implications
- Escalation path recommendations
- Defect category (mechanical, hydraulic, electrical, electronic, structural)

Priority levels:
- CRITICAL: Immediate action required, vehicle not mission capable (NMC)
- HIGH: Before next operation (within 24h), partially mission capable (PMC)
- MEDIUM: Within 48h, fully capable with restrictions (FMC-S)
- LOW: Next scheduled maintenance, fully capable (FMC)
- INFO: Acknowledgment only, fully capable (FMC)

Use this tool when:
- A defect is reported and needs priority classification
- Determining urgency of maintenance actions
- Deciding on escalation paths`,
  inputSchema: z.object({
    description: z
      .string()
      .describe(
        "The defect description to classify. Can be in German or English.",
      ),
    componentId: z
      .string()
      .optional()
      .describe("Optional component ID where the defect was found"),
    checkpointNumber: z
      .number()
      .optional()
      .describe("Optional checkpoint number where the defect was found"),
  }),
  outputSchema: z.object({
    priority: z.enum(["critical", "high", "medium", "low", "info"]),
    priorityName: z.object({
      de: z.string(),
      en: z.string(),
    }),
    responseTime: z.string(),
    vehicleStatus: z.string(),
    escalation: z.string(),
    color: z.string(),
    matchedKeywords: z.array(z.string()),
    confidence: z.number(),
    category: z
      .object({
        id: z.string(),
        name: z.string(),
        subcategory: z.string().optional(),
      })
      .optional(),
    recommendations: z.array(z.string()),
  }),
  execute: async (inputData) => {
    const { description, componentId, checkpointNumber } = inputData;

    const classification = classifyByKeywords(description);
    const priorityDetails = getPriorityDetails(classification.priority);
    if (!priorityDetails) {
      throw new Error(`Unknown priority level: ${classification.priority}`);
    }
    const categoryInfo = identifyCategory(description);

    const recommendations = getRecommendations(
      classification.priority,
      componentId,
      checkpointNumber,
    );

    return {
      priority: classification.priority,
      priorityName: {
        de: priorityDetails.name_de,
        en: priorityDetails.name_en,
      },
      responseTime: priorityDetails.response_time,
      vehicleStatus: priorityDetails.vehicle_status,
      escalation: priorityDetails.escalation,
      color: priorityDetails.color,
      matchedKeywords: classification.matchedKeywords,
      confidence: classification.confidence,
      category: categoryInfo
        ? {
            id: categoryInfo.category,
            name: categoryInfo.categoryName,
            subcategory: categoryInfo.subcategory,
          }
        : undefined,
      recommendations,
    };
  },
});

function getRecommendations(
  priority: DefectPriority,
  componentId?: string,
  checkpointNumber?: number,
): string[] {
  const recommendations: string[] = [];

  switch (priority) {
    case "critical":
      recommendations.push("Fahrzeug sofort stilllegen");
      recommendations.push("Kommandant und Schirrmeister informieren");
      recommendations.push("Kompaniechef innerhalb 1 Stunde informieren");
      recommendations.push("Fahrzeug nicht bewegen bis Freigabe");
      if (componentId) {
        recommendations.push(`Komponente ${componentId} auf Austausch prüfen`);
      }
      break;
    case "high":
      recommendations.push("Fahrzeug vor nächster Ausfahrt instandsetzen");
      recommendations.push("Schirrmeister am selben Tag informieren");
      recommendations.push("Ersatzteile beschaffen falls nötig");
      if (checkpointNumber) {
        recommendations.push(
          `Prüfpunkt ${checkpointNumber} nach Reparatur erneut prüfen`,
        );
      }
      break;
    case "medium":
      recommendations.push("In Mängelliste aufnehmen");
      recommendations.push("Bei nächster L2-Wartung beheben");
      recommendations.push("Entwicklung beobachten");
      break;
    case "low":
      recommendations.push("Dokumentieren für nächste planmäßige Wartung");
      recommendations.push("Keine sofortige Maßnahme erforderlich");
      break;
    case "info":
      recommendations.push("Zur Kenntnis genommen");
      recommendations.push("Optional: In Fahrzeugakte vermerken");
      break;
  }

  return recommendations;
}
