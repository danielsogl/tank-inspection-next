## 1. Setup

- [x] 1.1 Install Babylon.js dependencies (`@babylonjs/core`, `react-babylonjs`, `@babylonjs/loaders`)
- [x] 1.2 Copy Leopard2 model assets (`leopard2.obj`, `leopard2.mtl`) to `public/models/`
- [x] 1.3 Verify TypeScript types and module resolution

## 2. Core Components

- [x] 2.1 Create `ModelViewer` component with Engine and Scene setup
- [x] 2.2 Create `TankModel` component for loading OBJ models with Suspense
- [x] 2.3 Configure ArcRotateCamera with appropriate defaults (orbit, zoom, target)
- [x] 2.4 Set up lighting (hemispheric light) and clear color matching theme

## 3. Interaction

- [x] 3.1 Implement mesh picking via `onMeshPicked` or action managers
- [x] 3.2 Add hover highlighting with light blue outline (#4FC3FF)
- [x] 3.3 Add agent/selection highlighting with coral red outline (#FF594F)
- [x] 3.4 Create `useModelInteraction` hook to manage highlight state

## 4. Integration

- [x] 4.1 Replace placeholder in `Inspector` component with `ModelViewer`
- [x] 4.2 Connect mesh selection to chat panel input (query about selected part)
- [x] 4.3 Handle canvas resize when chat panel opens/closes
- [x] 4.4 Ensure responsive layout (mobile column layout support)

## 5. Model Registry

- [x] 5.1 Create model registry/configuration for vehicle types (Leopard, Abrams, etc.)
- [x] 5.2 Add model switching capability (future vehicle support)
- [x] 5.3 Implement mesh-to-description mapping service

## 6. Validation

- [x] 6.1 Test model loading and rendering in development
- [x] 6.2 Test mesh picking and highlighting interactions
- [x] 6.3 Test responsive behavior across viewport sizes
- [x] 6.4 Verify build passes with new dependencies
