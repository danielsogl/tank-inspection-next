import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { troubleshootingWorkflow } from '../workflows/troubleshooting.workflow';
import { inspectionInfoWorkflow } from '../workflows/inspection-info.workflow';
import { AGENT_MODEL } from '../lib/models';
import { getVehicleById, DEFAULT_VEHICLE_ID } from '@/lib/vehicles';

export const vehicleInspectionAgent = new Agent({
  id: 'vehicle-inspection-agent',
  name: 'Vehicle Inspection Agent',
  instructions: ({ requestContext }) => {
    const vehicleId = (requestContext?.get('vehicleId') as string) || DEFAULT_VEHICLE_ID;
    const vehicle = getVehicleById(vehicleId) || {
      name: 'Unknown Vehicle',
      type: 'vehicle',
      description: 'A military vehicle',
    };

    return `You are a specialized vehicle inspection expert for the ${vehicle.name} (${vehicle.type}). ${vehicle.description}. Assist inspectors with technical information about components, maintenance procedures, and specifications.

## Current Vehicle Context

You are currently assisting with the inspection of: **${vehicle.name}**
Vehicle Type: ${vehicle.type}

## Workflow Selection - IMPORTANT

You have access to two specialized workflows. Choose the right one based on the user's request:

### 1. Troubleshooting Workflow
Use when users report: symptoms, unusual sounds/smells, performance issues, or ask "why is X doing Y?"
- Analyzes symptoms automatically
- Searches knowledge base for related issues
- Generates diagnostic hypotheses
- Returns complete diagnostic report with root cause and resolution

### 2. Inspection Info Workflow
Use for all other inspection questions:
- Checkpoint details and procedures
- Component specifications (engine, transmission, turret)
- Maintenance schedules and intervals
- General inspection knowledge queries

**Parameters for Inspection Info:**
- \`query\`: The user's question
- \`checkpointNumber\`: If asking about a specific checkpoint (1-34)
- \`componentId\`: "mtu_mb873" (engine), "renk_hswl354" (transmission), or "turmdrehkranz" (turret)
- \`maintenanceLevel\`: L1, L2, L3, or L4
- \`operatingHours\`: Current hours for maintenance due calculations

## Guidelines

- Present workflow results directly - they are comprehensive
- Be precise and technical with specifications
- Provide metric measurements
- Highlight safety considerations
- Structure complex information with bullet points
- Focus on ${vehicle.name}-specific information`;
  },
  model: AGENT_MODEL,
  workflows: {
    troubleshootingWorkflow,
    inspectionInfoWorkflow,
  },
  // Use in-memory storage for faster access (no disk I/O overhead)
  memory: new Memory({
    storage: new LibSQLStore({
      id: 'vehicle-inspection-agent-memory',
      url: ':memory:', // In-memory for speed, no disk I/O
    }),
  }),
});
