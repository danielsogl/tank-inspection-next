import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { hypothesisSchema } from "../../schemas/diagnostic-report.schema";

/**
 * Step 3: Generate hypotheses based on gathered knowledge.
 *
 * This step synthesizes information from:
 * - Knowledge base search results
 * - Component details and failure modes
 * - Symptom analysis
 *
 * And generates ranked hypotheses for the root cause.
 */
export const generateHypothesisStep = createStep({
  id: "generate-hypothesis",
  description:
    "Generates and ranks hypotheses for the root cause based on gathered information",
  inputSchema: z.object({
    "search-knowledge-base": z.object({
      relatedIssues: z.array(
        z.object({
          content: z.string(),
          sectionId: z.string(),
          checkpointNumber: z.number().optional(),
          componentId: z.string().optional(),
          score: z.number(),
        }),
      ),
      searchCompleted: z.boolean(),
    }),
    "query-components": z.object({
      componentDetails: z.record(
        z.object({
          id: z.string(),
          name: z.string(),
          category: z.string(),
          specs: z.record(z.unknown()).optional(),
          monitoringPoints: z.array(z.any()).optional(),
          commonFailures: z.array(z.any()).optional(),
        }),
      ),
      queriedComponents: z.array(z.string()),
    }),
    "get-failure-modes": z.object({
      failureModes: z.array(
        z.object({
          description: z.string(),
          priority: z.string().optional(),
          componentId: z.string().optional(),
          sectionId: z.string(),
          score: z.number(),
        }),
      ),
      searchCompleted: z.boolean(),
    }),
  }),
  outputSchema: z.object({
    hypotheses: z.array(hypothesisSchema),
    topHypothesis: hypothesisSchema.optional(),
    needsMoreInfo: z.boolean(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const knowledgeBase = inputData["search-knowledge-base"];
    const components = inputData["query-components"];
    const failures = inputData["get-failure-modes"];

    // Get original symptom from init data
    const initData = getInitData() as {
      symptomDescription: string;
      componentHint?: string;
    };
    const symptomDescription = initData.symptomDescription.toLowerCase();

    const hypotheses: z.infer<typeof hypothesisSchema>[] = [];

    // Generate hypotheses from component failure data
    for (const [componentId, component] of Object.entries(
      components.componentDetails,
    )) {
      if (component.commonFailures) {
        for (const failure of component.commonFailures) {
          // Check if any symptoms match the description
          const matchingSymptoms = failure.symptoms.filter(
            (symptom: string) =>
              symptomDescription.includes(symptom.toLowerCase()) ||
              symptom
                .toLowerCase()
                .split(" ")
                .some((word: string) => symptomDescription.includes(word)),
          );

          if (matchingSymptoms.length > 0) {
            const likelihood = Math.min(90, 40 + matchingSymptoms.length * 15);

            hypotheses.push({
              id: `${componentId}-${failure.id}`,
              description: `${failure.name}: ${failure.cause}`,
              likelihood,
              affectedComponent: component.name,
              componentId,
              diagnosticActions: [
                `Check ${component.name} for signs of ${failure.name.toLowerCase()}`,
                ...failure.symptoms.map((s: string) => `Verify: ${s}`),
              ],
              supportingEvidence: matchingSymptoms.map(
                (s: string) => `Symptom match: ${s}`,
              ),
            });
          }
        }
      }
    }

    // Generate hypotheses from failure modes search
    for (const failureMode of failures.failureModes.slice(0, 5)) {
      const existingHypothesis = hypotheses.find(
        (h) => h.componentId === failureMode.componentId,
      );

      if (!existingHypothesis && failureMode.componentId) {
        hypotheses.push({
          id: `fm-${failureMode.sectionId}-${hypotheses.length}`,
          description: failureMode.description.slice(0, 200),
          likelihood: Math.round(failureMode.score * 60),
          affectedComponent: failureMode.componentId || "Unknown",
          componentId: failureMode.componentId,
          diagnosticActions: [
            `Inspect ${failureMode.componentId} based on: ${failureMode.description.slice(0, 100)}`,
          ],
          supportingEvidence: [
            `Knowledge base match (score: ${failureMode.score.toFixed(2)})`,
          ],
        });
      }
    }

    // Generate hypotheses from related issues
    for (const issue of knowledgeBase.relatedIssues.slice(0, 3)) {
      const hasExistingHypothesis = hypotheses.some(
        (h) =>
          h.componentId === issue.componentId ||
          h.description.includes(issue.sectionId),
      );

      if (!hasExistingHypothesis) {
        hypotheses.push({
          id: `issue-${issue.sectionId}-${issue.checkpointNumber || "gen"}`,
          description: `Related issue from ${issue.sectionId}: ${issue.content.slice(0, 150)}`,
          likelihood: Math.round(issue.score * 50),
          affectedComponent: issue.componentId || issue.sectionId,
          componentId: issue.componentId,
          diagnosticActions: [
            issue.checkpointNumber
              ? `Review checkpoint ${issue.checkpointNumber} procedures`
              : `Review ${issue.sectionId} section procedures`,
          ],
          supportingEvidence: [
            `Related issue match (score: ${issue.score.toFixed(2)})`,
          ],
        });
      }
    }

    // Sort by likelihood
    hypotheses.sort((a, b) => b.likelihood - a.likelihood);

    // Take top hypotheses
    const topHypotheses = hypotheses.slice(0, 5);

    return {
      hypotheses: topHypotheses,
      topHypothesis: topHypotheses[0],
      needsMoreInfo:
        topHypotheses.length === 0 || (topHypotheses[0]?.likelihood ?? 0) < 30,
    };
  },
});
