import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { classifyDefectTool } from '../../../tools/classify-defect.tool';
import {
  hypothesisSchema,
  diagnosticStepSchema,
  diagnosticReportSchema,
} from '../../schemas/diagnostic-report.schema';

/**
 * Step 6: Generate the final resolution and diagnostic report.
 *
 * This step creates the structured output including:
 * - Defect classification and priority
 * - Maintenance level determination
 * - Recommended actions and parts
 * - Complete diagnostic report
 */
export const generateResolutionStep = createStep({
  id: 'generate-resolution',
  description: 'Generates the final resolution recommendation and diagnostic report',
  inputSchema: z.object({
    confirmedHypothesis: hypothesisSchema.optional(),
    diagnosticSteps: z.array(diagnosticStepSchema),
    rootCauseConfidence: z.number(),
    evidenceTrail: z.array(z.string()),
    approved: z.boolean(),
    approverNotes: z.string().optional(),
  }),
  outputSchema: diagnosticReportSchema,
  execute: async ({ inputData, getInitData }) => {
    const {
      confirmedHypothesis,
      diagnosticSteps,
      rootCauseConfidence,
      evidenceTrail,
      approved,
      approverNotes,
    } = inputData;

    // Get original input data
    const initData = getInitData() as {
      symptomDescription: string;
      vehicleId: string;
      componentHint?: string;
    };

    // Classify the defect using the existing tool
    const defectDescription = confirmedHypothesis?.description || initData.symptomDescription;
    const classificationResult = await classifyDefectTool.execute({
      description: defectDescription,
      componentId: confirmedHypothesis?.componentId,
    });

    // Check for validation error and provide defaults
    let priority: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'medium';
    let recommendations: string[] = ['Review defect and assess priority manually'];

    if ('priority' in classificationResult && 'recommendations' in classificationResult) {
      priority = classificationResult.priority;
      recommendations = classificationResult.recommendations;
    }

    // Determine maintenance level based on priority
    const priorityToMaintenanceLevel: Record<string, 'L1' | 'L2' | 'L3' | 'L4'> = {
      critical: 'L3',
      high: 'L2',
      medium: 'L2',
      low: 'L1',
      info: 'L1',
    };

    const maintenanceLevel = priorityToMaintenanceLevel[priority] || 'L2';

    // Estimate time based on priority and component
    const estimatedTimes: Record<string, string> = {
      critical: '4-8 hours (emergency)',
      high: '2-4 hours',
      medium: '1-2 hours',
      low: '30-60 minutes',
      info: '15-30 minutes',
    };

    // Determine required parts based on component
    const requiredParts: string[] = [];
    if (confirmedHypothesis?.componentId) {
      const componentParts: Record<string, string[]> = {
        mtu_mb873: ['Oil filter', 'Air filter', 'Gaskets', 'Seals'],
        renk_hswl354: ['Transmission fluid', 'Seals', 'Filter elements'],
        turmdrehkranz: ['Lubricant', 'Bearings', 'Seals'],
      };
      requiredParts.push(...(componentParts[confirmedHypothesis.componentId] || []));
    }

    // Build affected systems from hypothesis
    const affectedSystems = confirmedHypothesis
      ? [confirmedHypothesis.affectedComponent]
      : ['Unknown'];

    // Add approver notes to evidence if present
    const finalEvidence = approverNotes
      ? [...evidenceTrail, `Approved with note: ${approverNotes}`]
      : evidenceTrail;

    // Ensure all diagnostic steps have required fields
    const validatedSteps = diagnosticSteps.map((step, idx) => ({
      stepNumber: step.stepNumber || idx + 1,
      action: step.action || 'Inspection performed',
      expectedResult: step.expectedResult || 'Normal operation',
      actualResult: step.actualResult || 'Observation recorded',
      conclusion: step.conclusion || 'Step completed',
    }));

    // Generate the final report
    const report = {
      // Session metadata
      vehicleId: initData.vehicleId,
      timestamp: new Date().toISOString(),
      sessionId: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,

      // Symptom input
      symptomDescription: initData.symptomDescription,
      affectedSystems,

      // Diagnosis path
      diagnosticSteps: validatedSteps,

      // Root cause
      rootCause: {
        description: confirmedHypothesis?.description || 'Unable to determine root cause',
        confidence: rootCauseConfidence,
        affectedComponent: confirmedHypothesis?.affectedComponent || 'Unknown',
        componentId: confirmedHypothesis?.componentId,
      },

      // Resolution
      resolution: {
        priority,
        maintenanceLevel,
        recommendedAction: recommendations.join('. '),
        requiredParts,
        estimatedTime: estimatedTimes[priority] || '1-2 hours',
        requiredExpertise:
          maintenanceLevel === 'L1'
            ? 'Crew level'
            : maintenanceLevel === 'L2'
              ? 'Unit technician'
              : maintenanceLevel === 'L3'
                ? 'Field depot'
                : 'Manufacturer depot',
      },

      // Evidence
      evidenceTrail: finalEvidence,
    };

    return report;
  },
});
