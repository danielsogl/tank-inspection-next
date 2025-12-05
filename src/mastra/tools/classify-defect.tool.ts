import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Defect priority levels with associated keywords for automatic classification.
 * Based on the taxonomy defined in data/leopard2-rag/defects/taxonomy.json
 */
const DEFECT_TAXONOMY = {
  priorities: [
    {
      level: 'critical' as const,
      name_de: 'KRITISCH',
      name_en: 'CRITICAL',
      response_time: 'sofort',
      vehicle_status: 'nicht einsatzbereit (NMC - Not Mission Capable)',
      escalation: 'Kommandant + Schirrmeister sofort informieren -> Kompaniechef innerhalb 1h',
      color: '#FF0000',
      keywords: [
        'ausfall',
        'blockiert',
        'kritisch',
        'sofort',
        'gefahr',
        'feuer',
        'explosion',
        'totalausfall',
        'nicht funktionsfähig',
        'lebensbedrohlich',
        'brand',
        'failure',
        'blocked',
        'critical',
        'danger',
        'fire',
      ],
    },
    {
      level: 'high' as const,
      name_de: 'HOCH',
      name_en: 'HIGH',
      response_time: 'vor nächster Ausfahrt (innerhalb 24h)',
      vehicle_status: 'bedingt einsatzbereit (PMC - Partially Mission Capable)',
      escalation: 'Kommandant -> Schirrmeister am selben Tag',
      color: '#FF8C00',
      keywords: [
        'gerissen',
        'leckage',
        'defekt',
        'funktioniert nicht',
        'ausgefallen',
        'stark',
        'erheblich',
        'beschädigt',
        'versagt',
        'torn',
        'leakage',
        'defect',
        'broken',
        'damaged',
        'failed',
      ],
    },
    {
      level: 'medium' as const,
      name_de: 'MITTEL',
      name_en: 'MEDIUM',
      response_time: 'innerhalb 48h',
      vehicle_status: 'voll einsatzbereit mit Einschränkung (FMC-S)',
      escalation: 'Meldung an Schirrmeister, Dokumentation für nächste Wartung',
      color: '#FFD700',
      keywords: [
        'verschleiß',
        'erhöht',
        'grenzwert',
        'nachlässt',
        'beeinträchtigt',
        'kleinere',
        'teilweise',
        'reduziert',
        'wear',
        'elevated',
        'threshold',
        'reduced',
        'partial',
      ],
    },
    {
      level: 'low' as const,
      name_de: 'NIEDRIG',
      name_en: 'LOW',
      response_time: 'bei nächster planmäßiger Wartung',
      vehicle_status: 'voll einsatzbereit (FMC - Fully Mission Capable)',
      escalation: 'keine, nur Dokumentation',
      color: '#32CD32',
      keywords: [
        'leicht',
        'minimal',
        'kosmetisch',
        'oberflächlich',
        'geringfügig',
        'unerheblich',
        'minor',
        'slight',
        'cosmetic',
        'superficial',
      ],
    },
    {
      level: 'info' as const,
      name_de: 'INFO',
      name_en: 'INFO',
      response_time: 'Kenntnisnahme',
      vehicle_status: 'voll einsatzbereit (FMC - Fully Mission Capable)',
      escalation: 'keine',
      color: '#1E90FF',
      keywords: [
        'hinweis',
        'information',
        'beobachtung',
        'notiz',
        'vorschlag',
        'note',
        'observation',
        'suggestion',
      ],
    },
  ],
  categories: [
    {
      id: 'mechanical',
      name: 'Mechanisch',
      subcategories: ['verschleiß', 'bruch', 'verformung', 'blockade', 'lockerung', 'korrosion'],
    },
    {
      id: 'hydraulic',
      name: 'Hydraulik',
      subcategories: ['leckage', 'druckverlust', 'verschmutzung', 'schlauch_defekt', 'ventil_defekt'],
    },
    {
      id: 'electrical',
      name: 'Elektrik',
      subcategories: ['kabelbruch', 'kurzschluss', 'spannungsabfall', 'kontaktprobleme', 'sicherung_defekt'],
    },
    {
      id: 'electronic',
      name: 'Elektronik',
      subcategories: ['sensor_ausfall', 'steuergerät_fehler', 'software_fehler', 'kommunikation_gestört', 'anzeige_defekt'],
    },
    {
      id: 'structural',
      name: 'Strukturell',
      subcategories: ['riss', 'delle', 'schweißnaht_defekt', 'materialermüdung', 'perforation'],
    },
  ],
};

function classifyByKeywords(description: string): {
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info';
  matchedKeywords: string[];
  confidence: number;
} {
  const normalizedDescription = description.toLowerCase();

  for (const priority of DEFECT_TAXONOMY.priorities) {
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
    priority: 'low',
    matchedKeywords: [],
    confidence: 0.1,
  };
}

function identifyCategory(description: string): {
  category: string;
  categoryName: string;
  subcategory?: string;
} | null {
  const normalizedDescription = description.toLowerCase();

  for (const category of DEFECT_TAXONOMY.categories) {
    for (const subcategory of category.subcategories) {
      if (normalizedDescription.includes(subcategory.toLowerCase().replace('_', ' '))) {
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
 * Tool for automatic defect classification based on keyword matching.
 */
export const classifyDefectTool = createTool({
  id: 'classify-defect',
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
      .describe('The defect description to classify. Can be in German or English.'),
    componentId: z
      .string()
      .optional()
      .describe('Optional component ID where the defect was found'),
    checkpointNumber: z
      .number()
      .optional()
      .describe('Optional checkpoint number where the defect was found'),
  }),
  outputSchema: z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low', 'info']),
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

    const priorityDetails = DEFECT_TAXONOMY.priorities.find(
      (p) => p.level === classification.priority,
    )!;

    const categoryInfo = identifyCategory(description);

    const recommendations: string[] = [];

    switch (classification.priority) {
      case 'critical':
        recommendations.push('Fahrzeug sofort stilllegen');
        recommendations.push('Kommandant und Schirrmeister informieren');
        recommendations.push('Kompaniechef innerhalb 1 Stunde informieren');
        recommendations.push('Fahrzeug nicht bewegen bis Freigabe');
        if (componentId) {
          recommendations.push(`Komponente ${componentId} auf Austausch prüfen`);
        }
        break;
      case 'high':
        recommendations.push('Fahrzeug vor nächster Ausfahrt instandsetzen');
        recommendations.push('Schirrmeister am selben Tag informieren');
        recommendations.push('Ersatzteile beschaffen falls nötig');
        if (checkpointNumber) {
          recommendations.push(`Prüfpunkt ${checkpointNumber} nach Reparatur erneut prüfen`);
        }
        break;
      case 'medium':
        recommendations.push('In Mängelliste aufnehmen');
        recommendations.push('Bei nächster L2-Wartung beheben');
        recommendations.push('Entwicklung beobachten');
        break;
      case 'low':
        recommendations.push('Dokumentieren für nächste planmäßige Wartung');
        recommendations.push('Keine sofortige Maßnahme erforderlich');
        break;
      case 'info':
        recommendations.push('Zur Kenntnis genommen');
        recommendations.push('Optional: In Fahrzeugakte vermerken');
        break;
    }

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
