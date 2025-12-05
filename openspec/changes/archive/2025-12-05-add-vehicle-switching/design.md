# Design: Vehicle Switching Architecture

## Context

The tank inspection application needs to support multiple vehicle types, each with its own 3D model and specialized AI agent. The system must dynamically load the correct agent based on the selected vehicle while maintaining conversation isolation between vehicles.

**Stakeholders:** End users, application developers
**Constraints:** Must work with existing Mastra SDK patterns, maintain chat memory isolation, support future vehicle additions

## Goals / Non-Goals

### Goals
- Enable users to switch between vehicles via a UI selector
- Dynamically load the appropriate AI agent based on selected vehicle
- Clear chat history when switching vehicles to avoid context confusion
- Load the correct 3D model for each vehicle
- Maintain vehicle-specific conversation threads in memory

### Non-Goals
- Supporting multiple vehicles in a single conversation
- Real-time multi-vehicle comparison features
- Vehicle data persistence across sessions (beyond chat history)

## Decisions

### 1. Agent Selection Strategy: Dynamic via Registry + requestContext

**Decision:** Use a vehicle-agent registry that maps vehicle IDs to their specialized agents. The inspection agent will dynamically delegate to the correct sub-agent using Mastra's `agents` configuration with `requestContext`.

**Rationale:**
- Mastra supports dynamic agent resolution via functions that receive `requestContext`
- This allows passing vehicle context from the API route to the agent layer
- Keeps agent definitions separate and maintainable
- No need for complex routing logic - Mastra handles delegation

**Alternative considered:** Single monolithic agent with vehicle-specific instructions
- Rejected: Would require extremely long system prompts and reduce maintainability

**Alternative considered:** Separate API routes per vehicle
- Rejected: Would require duplicated code and complicate frontend routing

### 2. State Management: React Context for Vehicle Selection

**Decision:** Create a `VehicleContext` React context to manage the currently selected vehicle across components.

**Rationale:**
- Inspector, ChatPanel, and ModelViewer all need access to selected vehicle
- Centralizes vehicle state management
- Enables clean prop drilling avoidance
- Supports future features like vehicle metadata display

### 3. Memory Thread Strategy: Vehicle-Prefixed Threads

**Decision:** Use thread IDs prefixed with vehicle ID: `{vehicleId}-inspection-chat`

**Rationale:**
- Isolates conversations per vehicle
- Enables easy memory recall for specific vehicle sessions
- Compatible with existing Mastra memory patterns
- Allows future features like "resume previous vehicle conversation"

### 4. Chat Clearing: Client-Side Reset + New Thread

**Decision:** When switching vehicles, clear chat UI state immediately and start a new memory thread.

**Rationale:**
- Provides instant UI feedback to users
- Previous vehicle conversations remain in memory (not deleted)
- New thread ensures clean context for the new vehicle's agent

### 5. Vehicle Registry Architecture

**Decision:** Extend the existing `model-registry.ts` to include agent mappings:

```typescript
interface VehicleConfig {
  id: string;
  name: string;
  rootUrl: string;
  sceneFilename: string;
  description?: string;
  agentId: string;  // Maps to registered Mastra agent
}
```

**Rationale:**
- Single source of truth for vehicle configuration
- Easy to add new vehicles
- Clear relationship between models and agents

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Agent not found for vehicle | Validation at startup; fallback to general agent |
| Memory accumulation for many vehicles | Implement memory cleanup strategy (future) |
| Complex state synchronization | Use React context with clear update patterns |

## Data Flow

```
User selects vehicle (UI)
    ↓
VehicleContext updates selectedVehicle
    ↓
├── ModelViewer: Loads new 3D model
├── ChatPanel: Clears messages, updates input placeholder
└── API calls: Include vehicleId in request body
        ↓
    API Route: Sets requestContext with vehicleId
        ↓
    inspectionAgent: Dynamically resolves sub-agents
        ↓
    Vehicle-specific agent handles query
```

## Open Questions

- Should we support resuming previous vehicle conversations? (Deferred to future enhancement)
- Should vehicle selection persist in localStorage? (Recommend: yes, but not critical for MVP)
