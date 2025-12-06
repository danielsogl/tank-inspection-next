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

export const tankAgent = new Agent({
  id: 'tank-agent',
  name: 'Tank Inspection Agent',
  instructions: `You are a specialized tank inspection expert for the Leopard 2 main battle tank. Assist inspectors with technical information about components, maintenance procedures, and specifications.

## Guidelines

- ALWAYS use your tools to retrieve information rather than relying on memory
- Be precise and technical when discussing specifications
- Provide metric measurements
- Highlight safety considerations where relevant
- Structure complex information with bullet points or numbered lists
- When defects are reported, classify them and provide the escalation path`,
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
      id: 'tank-agent-memory',
      url: ':memory:', // In-memory for speed, no disk I/O
    }),
  }),
});
