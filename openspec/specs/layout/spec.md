# layout Specification

## Purpose
TBD - created by archiving change add-tank-inspection-layout. Update Purpose after archive.
## Requirements
### Requirement: Main Layout Structure

The application MUST display a grid-based layout with a sidebar rail and main content area.

#### Scenario: Layout renders correctly
- **WHEN** the application loads
- **THEN** a grid layout with sidebar rail (auto width) and main area (1fr) is displayed
- **AND** the layout has 1.5rem gap and 1rem padding
- **AND** the height is calc(100dvh - 2rem)

### Requirement: Sidebar Rail Navigation

The sidebar rail MUST provide vertical navigation with tooltips.

#### Scenario: Sidebar displays navigation elements
- **WHEN** the sidebar rail is rendered
- **THEN** a menu button is displayed at the top
- **AND** a home navigation icon with tooltip is displayed in the middle
- **AND** a user avatar and logout button are displayed at the bottom
- **AND** the sidebar has black background with #5c5c5c border

### Requirement: Top Bar Header

The top bar MUST display the application branding and current time.

#### Scenario: Top bar displays header content
- **WHEN** the top bar is rendered
- **THEN** a box icon and "Tank Inspection" title are displayed on the left
- **AND** the current time (HH:mm format) is displayed on the right
- **AND** the top bar has black background with #5c5c5c border

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

### Requirement: Color Theme

The application MUST use the Tank Inspection dark color scheme.

#### Scenario: Colors match design system
- **WHEN** the application renders
- **THEN** the background color is #363636
- **AND** the sidebar and top bar are black (#000000)
- **AND** the accent/primary color is coral red (#FF594F)
- **AND** the border color is #5c5c5c

