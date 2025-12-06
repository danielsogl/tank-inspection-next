import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import {
  queryInspectionTool,
  getCheckpointTool,
  classifyDefectTool,
  getComponentDetailsTool,
  getMaintenanceIntervalTool,
} from '../tools';
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

## Guidelines

- ALWAYS use your tools to retrieve information rather than relying on memory
- Be precise and technical when discussing specifications
- Provide metric measurements
- Highlight safety considerations where relevant
- Structure complex information with bullet points or numbered lists
- When defects are reported, classify them and provide the escalation path
- Focus on ${vehicle.name}-specific information when querying the knowledge base`;
  },
  model: AGENT_MODEL,
  tools: {
    queryInspectionTool,
    getCheckpointTool,
    classifyDefectTool,
    getComponentDetailsTool,
    getMaintenanceIntervalTool,
  },
  // Use in-memory storage for faster access (no disk I/O overhead)
  memory: new Memory({
    storage: new LibSQLStore({
      id: 'vehicle-inspection-agent-memory',
      url: ':memory:', // In-memory for speed, no disk I/O
    }),
  }),
});
