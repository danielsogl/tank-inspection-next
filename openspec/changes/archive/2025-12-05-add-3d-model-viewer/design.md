## Context
The tank inspection application requires a 3D model viewer to display military vehicles. The old Angular application uses Babylon.js with a custom `TankScene` class that handles model loading, mesh picking, and highlighting. This implementation needs to be ported to React/Next.js using the `react-babylonjs` library for declarative scene management.

Key stakeholders: Developers integrating 3D visualization, users performing tank inspections via interactive model selection.

## Goals / Non-Goals
- Goals:
  - Render 3D vehicle models (OBJ format) in the inspector viewer area
  - Enable mesh selection with visual highlighting (agent highlights vs hover highlights)
  - Support 0...n vehicle models with ability to switch between them
  - Integrate mesh clicks with chat panel for contextual queries
  - Maintain responsive layout with proper canvas resizing

- Non-Goals:
  - Animation of vehicle parts (tracked for future)
  - Multi-model simultaneous rendering
  - Model editing capabilities
  - VR/AR support

## Decisions
- **Library choice: react-babylonjs**
  - Provides declarative React components for Babylon.js
  - Uses hooks like `useScene`, `useEngine`, `useBeforeRender` for imperative access
  - Model component with Suspense for async loading
  - Alternatives considered: Direct Babylon.js (more boilerplate), Three.js/react-three-fiber (different ecosystem, less suitable for OBJ)

- **Model format: OBJ with MTL**
  - Existing Leopard2 model is OBJ format (`leopard2.obj` + `leopard2.mtl`)
  - Babylon.js has built-in OBJ loader via `@babylonjs/loaders/OBJ`
  - Future: Consider converting to glTF for better performance

- **Component architecture:**
  - `ModelViewer` - Main component wrapping Engine/Scene
  - `TankModel` - Loads and renders a specific vehicle model
  - `useModelInteraction` - Custom hook for mesh selection/highlighting logic
  - Integrate with existing `Inspector` component replacing placeholder

- **Highlighting approach (ported from Angular):**
  - Agent highlights: Coral red (#FF594F), persistent until cleared
  - Hover highlights: Light blue (#4FC3FF), temporary
  - Use mesh outline rendering for visibility

## Risks / Trade-offs
- **Performance with large OBJ models**
  - Mitigation: Lazy loading with Suspense, consider LOD or model optimization

- **Client-side only rendering in Next.js**
  - Mitigation: Use `"use client"` directive, dynamic import with `ssr: false` if needed

- **Canvas resize handling**
  - Mitigation: Listen to resize events and call `engine.resize()`

## Migration Plan
1. Install Babylon.js dependencies
2. Copy Leopard2 model assets to `public/models/`
3. Create ModelViewer component with basic scene setup
4. Add mesh picking and highlighting
5. Integrate with Inspector component and chat panel
6. Test and verify responsive behavior

Rollback: Revert to placeholder if critical issues arise.

## Open Questions
- Should we preload models or load on demand?
- What camera controls are needed (orbit, zoom limits)?
- How to handle multiple vehicle types in the model registry?
