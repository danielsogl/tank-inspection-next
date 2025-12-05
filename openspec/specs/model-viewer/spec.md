# model-viewer Specification

## Purpose
TBD - created by archiving change add-3d-model-viewer. Update Purpose after archive.
## Requirements
### Requirement: 3D Scene Rendering
The application MUST render a Babylon.js 3D scene within the inspector viewer area.

#### Scenario: Scene initializes correctly
- **WHEN** the ModelViewer component mounts
- **THEN** a Babylon.js Engine and Scene are created
- **AND** an ArcRotateCamera is configured for orbit control
- **AND** a hemispheric light provides scene illumination
- **AND** the scene background is transparent to match the application theme

#### Scenario: Canvas resizes with container
- **WHEN** the viewer container resizes (e.g., chat panel opens/closes)
- **THEN** the Babylon.js engine MUST resize to fit the new dimensions
- **AND** the aspect ratio is maintained correctly

### Requirement: Vehicle Model Loading

The application MUST load and display 3D vehicle models based on the selected vehicle.

#### Scenario: Model loads for selected vehicle
- **WHEN** a vehicle is selected in the application
- **THEN** the OBJ file and associated MTL file for that vehicle MUST be loaded asynchronously
- **AND** a loading indicator MUST be displayed during loading
- **AND** the model MUST appear in the scene once loaded

#### Scenario: Model loading error
- **WHEN** a model fails to load (file not found, parse error)
- **THEN** an error message MUST be displayed to the user
- **AND** the scene MUST remain functional without the model

#### Scenario: Model centered in view
- **WHEN** a model is loaded
- **THEN** the camera MUST target the model center
- **AND** the camera radius MUST be set to fit the model in view

### Requirement: Mesh Picking and Selection
The application MUST allow users to select individual mesh parts of the vehicle model.

#### Scenario: Mesh click selects part
- **WHEN** a user clicks on a mesh in the 3D viewer
- **THEN** the clicked mesh MUST be identified
- **AND** a selection event MUST be emitted with the mesh name
- **AND** the selected mesh MUST be visually highlighted

#### Scenario: Click on empty space
- **WHEN** a user clicks on empty space (no mesh)
- **THEN** no selection event is emitted
- **AND** existing selection state remains unchanged

### Requirement: Hover Highlighting
The application MUST provide visual feedback when hovering over mesh parts.

#### Scenario: Mouse enters mesh
- **WHEN** the mouse pointer enters a mesh boundary
- **THEN** the mesh MUST display a light blue outline (#4FC3FF)
- **AND** the outline width MUST be 0.08

#### Scenario: Mouse leaves mesh
- **WHEN** the mouse pointer leaves a mesh boundary
- **THEN** the hover outline MUST be removed
- **AND** if the mesh has an agent highlight, that highlight MUST be restored

### Requirement: Agent Highlighting
The application MUST support persistent highlighting of meshes triggered by agent/chat interactions.

#### Scenario: Agent highlights parts
- **WHEN** the chat agent identifies relevant vehicle parts
- **THEN** the specified meshes MUST display a coral red outline (#FF594F)
- **AND** the outline width MUST be 0.12
- **AND** highlights MUST persist until explicitly cleared or replaced

#### Scenario: Agent clears highlights
- **WHEN** new agent highlights are set
- **THEN** previous agent highlights MUST be cleared
- **AND** only the new set of meshes MUST be highlighted

#### Scenario: Hover does not override agent highlight
- **WHEN** a mesh has an agent highlight and the user hovers over it
- **THEN** the agent highlight color MUST remain visible
- **AND** when the user stops hovering, the agent highlight MUST remain unchanged

### Requirement: Chat Integration
The application MUST integrate mesh selection with the chat panel.

#### Scenario: Selection triggers chat query
- **WHEN** a user clicks a mesh part
- **THEN** the mesh name MUST be mapped to a human-readable description
- **AND** a query MUST be populated in the chat input (e.g., "Tell me about [part name]")

### Requirement: Model Registry

The application MUST support a registry of available vehicle models with agent associations.

#### Scenario: Multiple model types supported
- **WHEN** configuring the model viewer
- **THEN** a list of available vehicle models MUST be accessible
- **AND** each model entry MUST include: id, name, file path, description, and agentId

#### Scenario: Model switching
- **WHEN** a different vehicle is selected via the vehicle context
- **THEN** the current model MUST be unloaded
- **AND** the new model MUST be loaded and displayed
- **AND** the camera MUST reset to fit the new model

### Requirement: Vehicle Context Integration

The model viewer MUST integrate with the vehicle context to respond to vehicle changes.

#### Scenario: Subscribe to vehicle context
- **WHEN** the model viewer component mounts
- **THEN** it MUST subscribe to the vehicle context
- **AND** it MUST load the model for the currently selected vehicle

#### Scenario: React to vehicle changes
- **WHEN** the selected vehicle changes in the context
- **THEN** the model viewer MUST automatically load the new vehicle's model
- **AND** the viewer MUST handle the transition gracefully with appropriate loading states

### Requirement: Model Unloading

The model viewer MUST properly unload models when switching vehicles.

#### Scenario: Clean model disposal
- **WHEN** switching from one vehicle to another
- **THEN** the previous model's meshes MUST be disposed from the scene
- **AND** the previous model's materials MUST be released
- **AND** no memory leaks SHALL occur during model switching

#### Scenario: Scene reset on unload
- **WHEN** the current model is unloaded
- **THEN** any agent highlights on the previous model MUST be cleared
- **AND** the selected part state MUST be reset

