## MODIFIED Requirements

### Requirement: Inspector Container Layout

The inspector MUST provide a flexible layout with 3D model viewer area and collapsible chat.

#### Scenario: Inspector displays viewer and chat
- **WHEN** the inspector is rendered
- **THEN** a 3D model viewer area takes the remaining space (flex: 1)
- **AND** the model viewer renders a Babylon.js scene with vehicle models
- **AND** a chat toggle button is displayed in the top-right corner
- **AND** a voice mode button is displayed in the bottom-right corner

#### Scenario: Chat sidebar collapses by default
- **WHEN** the page loads initially
- **THEN** the chat sidebar is collapsed (width: 0)
- **AND** clicking the toggle button opens the chat sidebar to 380px width

#### Scenario: Responsive layout adapts to mobile
- **WHEN** the viewport width is less than 900px
- **THEN** the inspector switches to column layout
- **AND** viewer and chat each take 50% height

#### Scenario: Viewer resizes when chat toggles
- **WHEN** the chat panel opens or closes
- **THEN** the 3D viewer canvas MUST resize to fit the available space
- **AND** the Babylon.js engine resize method MUST be called
