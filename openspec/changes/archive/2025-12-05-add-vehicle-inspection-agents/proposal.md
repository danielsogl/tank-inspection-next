# Change: Add Vehicle Inspection AI Agents

## Why

Users need to interact with an AI assistant optimized for the currently selected vehicle model. The system requires a hierarchical agent architecture where a general agent handles common queries and delegates vehicle-specific tasks to specialized sub-agents. This enables accurate, context-aware responses tailored to each vehicle type while maintaining a consistent chat experience through the existing UI.

## What Changes

- Add a general inspection agent that handles all user interactions via the chat interface
- Add vehicle-specific agents (starting with tank/Leopard2) that the general agent delegates to for vehicle-specific queries
- Create new `/api/inspection` route for the inspection agent
- Configure agents with system prompts only (no tools initially - tools will be added later)
- Use `openai/gpt-5-mini` model for all agents
- Update `src/components/inspector/chat-panel.tsx` to use the new `/api/inspection` route
- Remove old demo components and weather agent after migration:
  - `src/app/chat/page.tsx` (demo page)
  - `src/app/api/chat/route.ts` (old route)
  - `src/mastra/agents/weather-agent.ts`
  - `src/mastra/tools/weather-tool.ts`
  - `src/mastra/workflows/weather-workflow.ts`

## Impact

- Affected specs: New `agent-chat` capability
- Affected code:
  - `src/mastra/agents/` - New agent definitions
  - `src/mastra/index.ts` - Agent registration, remove weather agent
  - `src/app/api/inspection/route.ts` - New API route for inspection agent
  - `src/components/inspector/chat-panel.tsx` - Update to use `/api/inspection`
- Removed code:
  - `src/app/chat/` - Demo chat page (no longer needed)
  - `src/app/api/chat/` - Old chat route
  - `src/mastra/agents/weather-agent.ts`
  - `src/mastra/tools/weather-tool.ts`
  - `src/mastra/workflows/weather-workflow.ts`
- Related specs: `model-viewer` (agent highlighting integration), `layout` (chat panel)
