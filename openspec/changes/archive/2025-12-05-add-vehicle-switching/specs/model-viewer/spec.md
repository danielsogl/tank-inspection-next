# model-viewer Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
