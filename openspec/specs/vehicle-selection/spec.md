# vehicle-selection Specification

## Purpose
TBD - created by archiving change add-vehicle-switching. Update Purpose after archive.
## Requirements
### Requirement: Vehicle Selector Component

The application MUST provide a vehicle selector component that allows users to switch between available vehicles.

#### Scenario: Display available vehicles
- **WHEN** the vehicle selector is rendered
- **THEN** it MUST display a list of all configured vehicles from the registry
- **AND** each vehicle MUST show its name

#### Scenario: Select a different vehicle
- **WHEN** a user selects a different vehicle from the selector
- **THEN** the selected vehicle MUST be stored in the application state
- **AND** all vehicle-aware components MUST update to reflect the new selection

#### Scenario: Current selection indicator
- **WHEN** the vehicle selector is displayed
- **THEN** it MUST visually indicate which vehicle is currently selected

### Requirement: Vehicle Context Provider

The application MUST provide a React context for managing vehicle selection state across components.

#### Scenario: Context provides vehicle state
- **WHEN** a component subscribes to the vehicle context
- **THEN** it MUST receive the currently selected vehicle
- **AND** it MUST receive a function to change the selected vehicle
- **AND** it MUST receive the list of all available vehicles

#### Scenario: Default vehicle selection
- **WHEN** the application loads and no vehicle is selected
- **THEN** the first vehicle in the registry MUST be selected by default

#### Scenario: Vehicle change notification
- **WHEN** the selected vehicle changes
- **THEN** all subscribed components MUST be notified of the change
- **AND** components MUST re-render with the new vehicle data

### Requirement: Vehicle Registry Extension

The vehicle registry MUST include agent configuration for each vehicle.

#### Scenario: Agent mapping in registry
- **WHEN** a vehicle is defined in the registry
- **THEN** it MUST include an `agentId` field that maps to a registered Mastra agent

#### Scenario: Retrieve all vehicles
- **WHEN** the application requests all vehicles
- **THEN** the registry MUST return an array of all configured vehicles

### Requirement: Vehicle Selector Placement

The vehicle selector MUST be accessible from the main application layout.

#### Scenario: Selector in top bar
- **WHEN** the application layout is rendered
- **THEN** the vehicle selector MUST be visible in the top bar area
- **AND** it MUST be accessible without opening additional panels

