import { Agent } from '@mastra/core/agent';
import {
  queryInspectionTool,
  getCheckpointTool,
  classifyDefectTool,
  getComponentDetailsTool,
  getMaintenanceIntervalTool,
} from '../tools';

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
- For voice interactions, provide concise summaries
- When defects are reported, classify them and provide the escalation path`,
  model: 'openai/gpt-4o-mini',
  tools: {
    queryInspectionTool,
    getCheckpointTool,
    classifyDefectTool,
    getComponentDetailsTool,
    getMaintenanceIntervalTool,
  },
});
