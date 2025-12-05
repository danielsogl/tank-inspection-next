## Context

The tank inspection application needs an AI chat assistant that can answer questions about the currently selected vehicle model. The architecture must support multiple vehicle types while maintaining a consistent user experience through the existing chat interface.

### Stakeholders
- End users inspecting vehicles
- Developers extending the system with new vehicle types

### Constraints
- Must work with existing chat UI components (ai-elements)
- Must integrate with Mastra framework and AI SDK
- No tools in initial implementation (system prompts only)
- Must persist conversation history using Mastra memory

## Goals / Non-Goals

### Goals
- Provide accurate, vehicle-specific responses based on the selected model
- Enable extensibility for adding new vehicle types
- Maintain conversation context across interactions
- Leverage Mastra's agent network pattern for delegation

### Non-Goals
- Tool integration (deferred to future iteration)
- Voice capabilities
- Multi-model selection in UI (uses currently selected model from 3D viewer)

## Decisions

### Decision: Use Mastra Agent Networks for Delegation

The general inspection agent will use Mastra's `agents` property to register vehicle-specific sub-agents. When the user asks a vehicle-specific question, the general agent's system prompt instructs it to delegate to the appropriate sub-agent.

**Rationale**: This pattern is well-supported by Mastra, enables clear separation of concerns, and allows for easy addition of new vehicle types.

**Alternative considered**: Single agent with dynamic system prompts based on vehicle type. Rejected because it doesn't scale well and mixes concerns.

### Decision: System Prompts Only (No Tools)

The initial implementation uses only system prompts to guide agent behavior. Tools will be added in a subsequent iteration.

**Rationale**: Reduces initial complexity and allows validation of the agent architecture before adding tool integrations.

### Decision: Use `openai/gpt-5-mini` Model

All agents will use the `openai/gpt-5-mini` model for consistent behavior and cost efficiency.

**Rationale**: User requirement. The model provides good performance for the inspection domain at a reasonable cost.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Chat UI (chat-panel.tsx)                   │
│         Inspector component in layout spec              │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              API Route (/api/inspection)                │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              General Inspection Agent                   │
│  - Handles general queries                              │
│  - Routes vehicle-specific queries to sub-agents        │
│  - Memory: thread-based conversation history            │
└─────────────────────────┬───────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│     Tank Agent        │   │   Future: Other       │
│  (Leopard2 specific)  │   │   Vehicle Agents      │
└───────────────────────┘   └───────────────────────┘
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Agent delegation may add latency | Monitor response times; optimize prompts if needed |
| Sub-agent context may be lost | Ensure proper message passing between agents |
| Vehicle-specific knowledge may be incomplete | Iterate on system prompts based on user feedback |

## Migration Plan

1. Create new agents alongside existing weather agent
2. Update API route to use new inspection agent
3. Test thoroughly before removing weather agent
4. Rollback: Revert API route to use weather agent if issues arise

## Open Questions

- How should the currently selected vehicle model be passed to the agent? (Currently assumed from context)
- Should conversation history be per-vehicle or global? (Initially: global per user session)
