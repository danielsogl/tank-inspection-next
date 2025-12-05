# Change: Add Vehicle Switching Capability

## Why

The application currently only supports a single vehicle (Leopard 2) with a hardcoded agent configuration. Users need the ability to switch between different vehicles, which should clear the chat history and load the appropriate 3D model and specialized inspection agent dynamically.

## What Changes

- **ADDED** Vehicle selector UI component in the top bar or sidebar for switching between available vehicles
- **ADDED** Dynamic agent selection based on selected vehicle using Mastra's `requestContext` feature
- **MODIFIED** Model viewer to load the selected vehicle's 3D model
- **MODIFIED** Chat panel to clear conversation history when vehicle changes
- **MODIFIED** API route to accept vehicle context and route to appropriate agent
- **MODIFIED** Memory threads to be vehicle-specific for conversation isolation

## Impact

- Affected specs:
  - `vehicle-selection` (new capability)
  - `agent-chat` (modified for vehicle context)
  - `model-viewer` (modified for vehicle switching)
- Affected code:
  - `src/components/layout/top-bar.tsx` or `sidebar-rail.tsx` (vehicle selector UI)
  - `src/components/inspector/inspector.tsx` (vehicle state management)
  - `src/components/inspector/chat-panel.tsx` (chat clearing on vehicle change)
  - `src/components/model-viewer/model-viewer.tsx` (dynamic model loading)
  - `src/components/model-viewer/model-registry.ts` (extended vehicle registry)
  - `src/mastra/agents/` (dynamic agent registry and selection)
  - `src/app/api/inspection/route.ts` (vehicle-aware agent routing)
