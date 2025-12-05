# Change: Add 3D Model Viewer with Babylon.js

## Why
The tank inspection application needs an interactive 3D model viewer to display military vehicles (Leopard, Abrams, etc.) allowing users to inspect and select specific parts for detailed information. The current placeholder in the inspector component needs to be replaced with a functional Babylon.js-powered viewer.

## What Changes
- Add Babylon.js integration via `react-babylonjs` for declarative 3D rendering in React/Next.js
- Create a ModelViewer component that renders 3D tank/vehicle models
- Support loading 0...n vehicle models (OBJ format initially, with Leopard2 as first model)
- Implement mesh picking/selection with visual highlighting
- Integrate selection events with the chat panel for contextual queries
- Copy Leopard2 model assets from the old Angular application

## Impact
- Affected specs: `layout` (MODIFIED - adds model viewer to inspector), new `model-viewer` capability
- Affected code: `src/components/inspector/inspector.tsx`, new model viewer components
- New dependencies: `@babylonjs/core`, `react-babylonjs`, `@babylonjs/loaders`
