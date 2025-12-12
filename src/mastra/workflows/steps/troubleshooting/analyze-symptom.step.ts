import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  addSystemFromHint,
  extractKeywords,
  identifyAffectedSystems,
} from "../../../lib/system-mappings";

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

    // Identify affected systems from symptom description
    let affectedSystems = identifyAffectedSystems(symptomDescription);

    // If component hint is provided, add its associated system
    if (componentHint) {
      affectedSystems = addSystemFromHint(affectedSystems, componentHint);
    }

    // Extract significant keywords from the symptom
    const keywords = extractKeywords(symptomDescription);

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
