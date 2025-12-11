import { createWorkflow } from "@mastra/core/workflows";
import {
  diagnosticReportSchema,
  troubleshootingInputSchema,
} from "./schemas/diagnostic-report.schema";
import {
  analyzeSymptomStep,
  approvalGateStep,
  diagnosticLoopStep,
  generateHypothesisStep,
  generateResolutionStep,
  getFailureModesStep,
  queryComponentsStep,
  searchKnowledgeBaseStep,
} from "./steps/troubleshooting";

/**
 * Troubleshooting Diagnostic Workflow
 *
 * This workflow guides systematic diagnosis of vehicle symptoms:
 *
 * 1. Analyze Symptom - Parse description, extract keywords, identify systems
 * 2. Parallel Knowledge Gathering:
 *    - Search knowledge base for related issues
 *    - Query component details
 *    - Get failure modes
 * 3. Generate Hypotheses - Rank probable causes by likelihood
 * 4. Diagnostic Loop - Interactive diagnosis with user input (suspend/resume)
 * 5. Optional Approval Gate - Human confirmation if required
 * 6. Generate Resolution - Create structured diagnostic report
 *
 * Workflow Patterns Used:
 * - Sequential (.then()) - Ordered step execution
 * - Parallel (.parallel()) - Concurrent knowledge base queries
 * - Suspend/Resume - Interactive diagnosis and approval gates
 */
export const troubleshootingWorkflow = createWorkflow({
  id: "troubleshooting-diagnostic",
  description: `Troubleshooting diagnostic workflow for vehicle symptoms.
Use this workflow when users report unusual sounds, smells, behaviors,
performance issues like overheating, power loss, or vibrations,
or ask "why is [component] doing [symptom]?"
The workflow analyzes symptoms, searches the knowledge base, generates hypotheses,
and returns a complete diagnostic report with root cause and resolution.`,
  inputSchema: troubleshootingInputSchema,
  outputSchema: diagnosticReportSchema,
})
  // Step 1: Analyze the symptom
  .then(analyzeSymptomStep)

  // Step 2: Parallel knowledge gathering
  .parallel([searchKnowledgeBaseStep, queryComponentsStep, getFailureModesStep])

  // Step 3: Generate hypotheses from gathered knowledge
  .then(generateHypothesisStep)

  // Step 4: Interactive diagnostic loop (may suspend for user input)
  .then(diagnosticLoopStep)

  // Step 5: Approval gate (handles both approval and pass-through internally)
  .then(approvalGateStep)

  // Step 6: Generate final resolution and report
  .then(generateResolutionStep)

  .commit();

// Export for registration
export { troubleshootingWorkflow as default };
