import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { tankAgent } from './tank-agent';
import { getVehicleById, DEFAULT_VEHICLE_ID } from '@/lib/vehicles';
import { AGENT_MODEL } from '../lib/models';

// Vehicle-specific agent registry mapping vehicleId to their specialized agent
const vehicleAgentRegistry: Record<string, Agent> = {
  'leopard2': tankAgent,
  'm1-abrams': tankAgent, // Using same agent for now, can be replaced with M1-specific agent
};

export const inspectionAgent = new Agent({
  id: 'inspection-agent',
  name: 'Vehicle Inspection Agent',
  instructions: ({ requestContext }) => {
    const vehicleId = (requestContext?.get('vehicleId') as string) || DEFAULT_VEHICLE_ID;
    const vehicle = getVehicleById(vehicleId) || { name: 'Unknown Vehicle', type: 'vehicle', agentId: 'vehicleAgent', description: '' };

    return `You are a professional vehicle inspection assistant. Your primary role is to help users inspect and understand the ${vehicle.name} (${vehicle.type}).

## Current Vehicle Context

You are currently assisting with the inspection of: **${vehicle.name}**
Vehicle Type: ${vehicle.type}

## Your Role

You serve as the main point of contact for all vehicle inspection queries. You can:
- Answer general questions about vehicle inspections and procedures
- Provide guidance on inspection best practices
- Explain common terminology and concepts
- Help users navigate the inspection application

## Delegation Rules

When a user asks about specific vehicle types, you MUST delegate to the appropriate specialized agent:

### ${vehicle.name} Queries → ${vehicle.agentId}
Delegate to the specialized agent for any questions about:
- ${vehicle.name} specifications, components, or systems
- Maintenance and inspection procedures
- Technical details specific to this vehicle
- Gun systems, fire control, or ammunition
- Powerpack, suspension, or mobility systems
- Crew compartments and turret operations

To delegate, use the ${vehicle.agentId} when you recognize the query is about ${vehicle.name}.

## Response Guidelines

1. For general inspection questions:
   - Answer directly with helpful, practical information
   - Keep responses clear and professional
   - Offer to provide more details if needed

2. For vehicle-specific questions:
   - Delegate to the appropriate specialized agent
   - Do not attempt to answer vehicle-specific technical questions yourself
   - Trust the specialized agent's expertise

3. For unclear queries:
   - Ask clarifying questions to understand the user's needs
   - Determine if the query is general or vehicle-specific

## Tone

- Professional but approachable
- Technically accurate
- Helpful and patient
- Clear and concise`;
  },
  model: AGENT_MODEL,
  agents: ({ requestContext }) => {
    const vehicleId = (requestContext?.get('vehicleId') as string) || DEFAULT_VEHICLE_ID;
    const vehicleAgent = vehicleAgentRegistry[vehicleId];
    const vehicle = getVehicleById(vehicleId);

    if (vehicleAgent && vehicle) {
      return { [vehicle.agentId]: vehicleAgent };
    }

    // Fallback to tankAgent if no specific agent found
    return { tankAgent };
  },
  memory: new Memory({
    storage: new LibSQLStore({
      id: 'inspection-memory',
      url: 'file:../mastra.db',
    }),
  }),
});
