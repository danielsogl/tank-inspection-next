import { z } from "zod";

/**
 * Schema for a single diagnostic step performed during troubleshooting.
 */
export const diagnosticStepSchema = z.object({
  stepNumber: z.number().describe("The sequential step number"),
  action: z.string().describe("The diagnostic action to perform"),
  expectedResult: z
    .string()
    .describe("What result is expected if functioning correctly"),
  actualResult: z.string().describe("The actual result observed"),
  conclusion: z.string().describe("Conclusion drawn from this step"),
});

/**
 * Schema for the root cause identification.
 */
export const rootCauseSchema = z.object({
  description: z.string().describe("Description of the identified root cause"),
  confidence: z.number().min(0).max(100).describe("Confidence level (0-100)"),
  affectedComponent: z.string().describe("The primary affected component"),
  componentId: z
    .string()
    .optional()
    .describe("Component ID if known (e.g., mtu_mb873)"),
});

/**
 * Schema for the resolution recommendation.
 */
export const resolutionSchema = z.object({
  priority: z
    .enum(["critical", "high", "medium", "low", "info"])
    .describe("Defect priority"),
  maintenanceLevel: z
    .enum(["L1", "L2", "L3", "L4"])
    .describe("NATO maintenance level required"),
  recommendedAction: z
    .string()
    .describe("Recommended repair/maintenance action"),
  requiredParts: z.array(z.string()).describe("List of required parts"),
  estimatedTime: z.string().describe("Estimated time to complete repair"),
  requiredExpertise: z.string().describe("Required expertise level"),
});

/**
 * Full diagnostic report schema - the final output of the troubleshooting workflow.
 */
export const diagnosticReportSchema = z.object({
  // Session metadata
  vehicleId: z.string().describe("The vehicle being diagnosed"),
  timestamp: z
    .string()
    .describe("ISO timestamp of when the diagnosis was performed"),
  sessionId: z.string().describe("Unique session identifier"),

  // Symptom input
  symptomDescription: z
    .string()
    .describe("Original symptom description from user"),
  affectedSystems: z
    .array(z.string())
    .describe("Systems identified as potentially affected"),

  // Diagnosis path
  diagnosticSteps: z
    .array(diagnosticStepSchema)
    .describe("Steps performed during diagnosis"),

  // Root cause
  rootCause: rootCauseSchema.describe("Identified root cause"),

  // Resolution
  resolution: resolutionSchema.describe("Resolution recommendation"),

  // Evidence
  evidenceTrail: z
    .array(z.string())
    .describe("Evidence gathered during diagnosis"),
});

// Type exports
export type DiagnosticStep = z.infer<typeof diagnosticStepSchema>;
export type RootCause = z.infer<typeof rootCauseSchema>;
export type Resolution = z.infer<typeof resolutionSchema>;
export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;

/**
 * Schema for the troubleshooting workflow input.
 */
export const troubleshootingInputSchema = z.object({
  symptomDescription: z
    .string()
    .describe("Description of the symptom or issue"),
  vehicleId: z
    .string()
    .default("leopard2")
    .describe("Vehicle ID being diagnosed"),
  componentHint: z
    .string()
    .optional()
    .describe("Optional hint about which component may be affected"),
  requireApproval: z
    .boolean()
    .default(false)
    .describe("Whether to require human approval"),
});

export type TroubleshootingInput = z.infer<typeof troubleshootingInputSchema>;

/**
 * Schema for hypothesis data during diagnosis.
 */
export const hypothesisSchema = z.object({
  id: z.string(),
  description: z.string(),
  likelihood: z.number().min(0).max(100),
  affectedComponent: z.string(),
  componentId: z.string().optional(),
  diagnosticActions: z.array(z.string()),
  supportingEvidence: z.array(z.string()),
});

export type Hypothesis = z.infer<typeof hypothesisSchema>;

/**
 * Schema for the workflow state.
 */
export const troubleshootingStateSchema = z.object({
  // Accumulated during diagnosis
  hypotheses: z.array(hypothesisSchema).default([]),
  currentHypothesisIndex: z.number().default(0),
  diagnosticSteps: z.array(diagnosticStepSchema).default([]),
  evidenceTrail: z.array(z.string()).default([]),

  // Confidence tracking
  rootCauseConfidence: z.number().default(0),
  iterationCount: z.number().default(0),
  maxIterations: z.number().default(10),

  // Knowledge from parallel searches
  relatedIssues: z.array(z.string()).default([]),
  componentDetails: z.record(z.unknown()).default({}),
  failureModes: z.array(z.string()).default([]),
});

export type TroubleshootingState = z.infer<typeof troubleshootingStateSchema>;
