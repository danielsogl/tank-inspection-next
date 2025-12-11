import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  diagnosticStepSchema,
  hypothesisSchema,
} from "../../schemas/diagnostic-report.schema";

/**
 * Step 4: Diagnostic analysis step.
 *
 * This step:
 * - Analyzes the top hypothesis
 * - Auto-generates diagnostic steps based on hypothesis data
 * - Returns results for resolution generation
 *
 * Note: This step runs to completion without user interaction.
 * Diagnostic conclusions are inferred from the RAG-based hypothesis data.
 */
export const diagnosticLoopStep = createStep({
  id: "diagnostic-loop",
  description: "Analyzes hypotheses and generates diagnostic conclusions",
  inputSchema: z.object({
    hypotheses: z.array(hypothesisSchema),
    topHypothesis: hypothesisSchema.optional(),
    needsMoreInfo: z.boolean(),
  }),
  outputSchema: z.object({
    confirmedHypothesis: hypothesisSchema.optional(),
    diagnosticSteps: z.array(diagnosticStepSchema),
    rootCauseConfidence: z.number(),
    evidenceTrail: z.array(z.string()),
    requiresApproval: z.boolean(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { hypotheses, topHypothesis } = inputData;
    const initData = getInitData() as { requireApproval: boolean };

    // Get the best hypothesis
    const bestHypothesis = topHypothesis || hypotheses[0];

    if (!bestHypothesis) {
      // No hypotheses to diagnose
      return {
        confirmedHypothesis: undefined,
        diagnosticSteps: [],
        rootCauseConfidence: 20,
        evidenceTrail: [
          "No specific hypothesis identified - manual diagnosis required",
        ],
        requiresApproval: initData.requireApproval,
      };
    }

    // Auto-generate diagnostic steps based on hypothesis data
    const diagnosticSteps = bestHypothesis.diagnosticActions.map(
      (action, idx) => ({
        stepNumber: idx + 1,
        action,
        expectedResult:
          bestHypothesis.supportingEvidence[idx] ||
          "Condition matches hypothesis",
        actualResult: `Based on analysis: ${bestHypothesis.supportingEvidence[idx] || "Consistent with " + bestHypothesis.description}`,
        conclusion: `Supports hypothesis: ${bestHypothesis.description.slice(0, 80)}`,
      }),
    );

    // If no diagnostic actions, create a default step
    if (diagnosticSteps.length === 0) {
      diagnosticSteps.push({
        stepNumber: 1,
        action: `Inspect ${bestHypothesis.affectedComponent}`,
        expectedResult: "Verify component condition",
        actualResult: `Analysis indicates: ${bestHypothesis.description}`,
        conclusion: "Based on knowledge base data and symptom analysis",
      });
    }

    // Build evidence trail from supporting evidence
    const evidenceTrail = [
      `Primary hypothesis: ${bestHypothesis.description}`,
      `Affected component: ${bestHypothesis.affectedComponent}`,
      ...bestHypothesis.supportingEvidence.map(
        (e, i) => `Evidence ${i + 1}: ${e}`,
      ),
      "Diagnosis auto-completed based on RAG data analysis",
    ];

    // Use hypothesis likelihood as confidence
    const rootCauseConfidence = bestHypothesis.likelihood;

    return {
      confirmedHypothesis: bestHypothesis,
      diagnosticSteps,
      rootCauseConfidence,
      evidenceTrail,
      requiresApproval: initData.requireApproval,
    };
  },
});
