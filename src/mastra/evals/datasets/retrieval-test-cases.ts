/**
 * Test cases for RAG retrieval evaluation.
 *
 * These cases test semantic search quality for German language queries
 * against the inspection knowledge base.
 */

export interface RetrievalTestCase {
  /** German language query */
  query: string;
  /** Expected data type to find */
  expectedDataType?:
    | "vehicle"
    | "checkpoint"
    | "component"
    | "defect"
    | "interval";
  /** Expected section ID in results */
  expectedSectionId?: string;
  /** Expected component ID in results */
  expectedComponentId?: string;
  /** Expected crew role in results */
  expectedCrewRole?: string;
  /** Expected priority level */
  expectedPriority?: string;
  /** Human-readable description for test output */
  description: string;
}

/**
 * 10 German test cases covering different data types and query patterns.
 */
export const retrievalTestCases: RetrievalTestCase[] = [
  // Checkpoint queries
  {
    query: "Wie prüfe ich den Ölstand am Motor?",
    expectedDataType: "checkpoint",
    expectedSectionId: "ANTRIEB",
    description: "Engine oil level check procedure",
  },
  {
    query: "Wer ist verantwortlich für die Kettenspannung?",
    expectedDataType: "checkpoint",
    expectedCrewRole: "driver",
    description: "Track tension responsibility by crew role",
  },
  {
    query: "Welche Werkzeuge brauche ich für die Kühlmittelprüfung?",
    expectedDataType: "checkpoint",
    description: "Tools needed for coolant inspection",
  },

  // Component queries
  {
    query: "Technische Daten MTU Motor",
    expectedDataType: "component",
    expectedComponentId: "mtu_mb873",
    description: "MTU engine technical specifications",
  },
  {
    query: "Getriebeübersetzung RENK Automatikgetriebe",
    expectedDataType: "component",
    expectedComponentId: "renk_hswl354",
    description: "RENK transmission gear ratios",
  },
  {
    query: "Turmdrehgeschwindigkeit und Schwenkbereich",
    expectedDataType: "component",
    expectedComponentId: "turmdrehkranz",
    description: "Turret rotation speed and traverse range",
  },

  // Defect/failure queries
  {
    query: "Kritische Mängel Hydrauliksystem",
    expectedDataType: "defect",
    expectedPriority: "critical",
    description: "Critical hydraulic system defects",
  },
  {
    query: "Anzeichen für Motorüberhitzung Symptome",
    expectedDataType: "defect",
    description: "Engine overheating symptoms and indicators",
  },

  // Maintenance interval queries
  {
    query: "Wartungsintervall nach 250 Betriebsstunden",
    expectedDataType: "interval",
    description: "Maintenance at 250 operating hours",
  },
  {
    query: "Welche täglichen Wartungsaufgaben macht die Besatzung?",
    expectedDataType: "interval",
    description: "Daily crew maintenance tasks",
  },
];

/**
 * Additional edge case test cases.
 */
export const edgeCaseTestCases: RetrievalTestCase[] = [
  {
    query: "Motor kaputt",
    expectedDataType: "defect",
    description: "Very short/vague query about engine failure",
  },
  {
    query:
      "Der Leopard 2 zeigt beim Starten ungewöhnliche Geräusche aus dem Motorraum und der Öldruck schwankt stark",
    expectedDataType: "defect",
    description: "Long detailed symptom description",
  },
];
