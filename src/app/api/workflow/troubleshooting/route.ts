import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra';

/**
 * POST /api/workflow/troubleshooting
 *
 * Start a new troubleshooting diagnostic workflow.
 *
 * Request body:
 * {
 *   symptomDescription: string; // Required: Description of the symptom
 *   vehicleId?: string;         // Optional: Vehicle ID (default: 'leopard2')
 *   componentHint?: string;     // Optional: Hint about affected component
 *   requireApproval?: boolean;  // Optional: Whether to require human approval (default: false)
 * }
 *
 * Response:
 * - For immediate completion: { status: 'success', result: DiagnosticReport }
 * - For suspended workflow: { status: 'suspended', runId: string, step: string, suspendPayload: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { symptomDescription, vehicleId, componentHint, requireApproval } = body;

    if (!symptomDescription || typeof symptomDescription !== 'string') {
      return NextResponse.json(
        { error: 'symptomDescription is required and must be a string' },
        { status: 400 },
      );
    }

    const workflow = mastra.getWorkflow('troubleshootingWorkflow');
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 500 });
    }

    const run = await workflow.createRun();

    const result = await run.start({
      inputData: {
        symptomDescription,
        vehicleId: vehicleId || 'leopard2',
        componentHint,
        requireApproval: requireApproval ?? false,
      },
    });

    if (result.status === 'suspended') {
      // Workflow is waiting for user input
      const suspendedSteps = result.suspended || [];
      const suspendedStep = suspendedSteps[0];
      const stepId = Array.isArray(suspendedStep) ? suspendedStep[suspendedStep.length - 1] : suspendedStep;
      const stepResult = stepId ? result.steps[stepId as keyof typeof result.steps] : null;

      return NextResponse.json({
        status: 'suspended',
        runId: run.runId,
        step: stepId,
        suspendPayload: stepResult && 'suspendPayload' in stepResult ? stepResult.suspendPayload : null,
        message: 'Workflow suspended - awaiting user input',
      });
    }

    if (result.status === 'failed') {
      return NextResponse.json(
        {
          status: 'failed',
          error: 'Workflow execution failed',
          details: result,
        },
        { status: 500 },
      );
    }

    // Workflow completed successfully
    return NextResponse.json({
      status: 'success',
      runId: run.runId,
      result: result.result,
    });
  } catch (error) {
    console.error('Troubleshooting workflow error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute troubleshooting workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/workflow/troubleshooting?runId=xxx
 *
 * Get the status of a workflow run.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    // Get the current snapshot/state
    const storage = mastra.getStorage();
    if (!storage) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const snapshot = await storage.loadWorkflowSnapshot({
      runId,
      workflowName: 'troubleshooting-diagnostic',
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Workflow run not found' }, { status: 404 });
    }

    return NextResponse.json({
      runId,
      status: snapshot.status,
      result: snapshot.result,
      context: snapshot.context,
    });
  } catch (error) {
    console.error('Get workflow status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get workflow status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/workflow/troubleshooting
 *
 * Resume a suspended workflow with user input.
 *
 * Request body:
 * {
 *   runId: string;       // Required: The workflow run ID
 *   step: string;        // Required: The step to resume
 *   resumeData: object;  // Required: Data to pass to the resumed step
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const { runId, step, resumeData } = body;

    if (!runId || !step || !resumeData) {
      return NextResponse.json(
        { error: 'runId, step, and resumeData are required' },
        { status: 400 },
      );
    }

    const workflow = mastra.getWorkflow('troubleshootingWorkflow');
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 500 });
    }

    // Create run instance with existing runId
    const run = await workflow.createRun({ runId });

    // Resume the workflow
    const result = await run.resume({
      step,
      resumeData,
    });

    if (result.status === 'suspended') {
      // Workflow suspended again (e.g., next diagnostic step)
      const suspendedSteps = result.suspended || [];
      const suspendedStep = suspendedSteps[0];
      const stepId = Array.isArray(suspendedStep) ? suspendedStep[suspendedStep.length - 1] : suspendedStep;
      const stepResult = stepId ? result.steps[stepId as keyof typeof result.steps] : null;

      return NextResponse.json({
        status: 'suspended',
        runId,
        step: stepId,
        suspendPayload: stepResult && 'suspendPayload' in stepResult ? stepResult.suspendPayload : null,
        message: 'Workflow suspended - awaiting next input',
      });
    }

    if (result.status === 'failed') {
      return NextResponse.json(
        {
          status: 'failed',
          error: 'Workflow resume failed',
          details: result,
        },
        { status: 500 },
      );
    }

    // Workflow completed
    return NextResponse.json({
      status: 'success',
      runId,
      result: result.result,
    });
  } catch (error) {
    console.error('Resume workflow error:', error);
    return NextResponse.json(
      {
        error: 'Failed to resume workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
