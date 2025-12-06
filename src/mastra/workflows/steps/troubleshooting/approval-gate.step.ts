import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { hypothesisSchema, diagnosticStepSchema } from '../../schemas/diagnostic-report.schema';

/**
 * Step 5: Approval gate (pass-through).
 *
 * This step passes diagnostic data to the resolution step.
 * Auto-approves the diagnosis since interactive approval is disabled.
 *
 * Note: If interactive approval is needed in the future, this step
 * can be modified to use suspend/resume for human confirmation.
 */
export const approvalGateStep = createStep({
  id: 'approval-gate',
  description: 'Passes diagnosis results to resolution step (auto-approved)',
  inputSchema: z.object({
    confirmedHypothesis: hypothesisSchema.optional(),
    diagnosticSteps: z.array(diagnosticStepSchema),
    rootCauseConfidence: z.number(),
    evidenceTrail: z.array(z.string()),
    requiresApproval: z.boolean(),
  }),
  outputSchema: z.object({
    confirmedHypothesis: hypothesisSchema.optional(),
    diagnosticSteps: z.array(diagnosticStepSchema),
    rootCauseConfidence: z.number(),
    evidenceTrail: z.array(z.string()),
    approved: z.boolean(),
    approverNotes: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const {
      confirmedHypothesis,
      diagnosticSteps,
      rootCauseConfidence,
      evidenceTrail,
    } = inputData;

    // Auto-approve and pass through to resolution step
    return {
      confirmedHypothesis,
      diagnosticSteps,
      rootCauseConfidence,
      evidenceTrail: [...evidenceTrail, 'Auto-approved for resolution'],
      approved: true,
      approverNotes: undefined,
    };
  },
});
