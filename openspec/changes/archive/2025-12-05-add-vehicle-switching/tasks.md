# Tasks: Add Vehicle Switching

## 1. Vehicle Registry Enhancement
- [x] 1.1 Extend `VehicleModel` interface to include `agentId` field
- [x] 1.2 Update `vehicleModels` array with agent mappings
- [x] 1.3 Add `getAllVehicles()` function to registry
- [x] 1.4 Add second sample vehicle (e.g., placeholder or different tank variant)

## 2. Vehicle Context Provider
- [x] 2.1 Create `VehicleContext` and `VehicleProvider` in `src/contexts/vehicle-context.tsx`
- [x] 2.2 Implement `useVehicle` hook exposing `selectedVehicle`, `setSelectedVehicle`, `vehicles`
- [x] 2.3 Wrap application with `VehicleProvider` in root layout or page

## 3. Vehicle Selector UI
- [x] 3.1 Create `VehicleSelector` component with dropdown/select UI
- [x] 3.2 Display vehicle name and optional icon/thumbnail
- [x] 3.3 Integrate `VehicleSelector` into `TopBar` component
- [x] 3.4 Style selector to match existing dark theme

## 4. Model Viewer Integration
- [x] 4.1 Update `ModelViewer` to accept `vehicleId` prop
- [x] 4.2 Subscribe to `VehicleContext` for selected vehicle
- [x] 4.3 Implement model unloading when vehicle changes
- [x] 4.4 Load new vehicle model on selection change
- [x] 4.5 Handle loading states during model transitions

## 5. Chat Panel Vehicle Awareness
- [x] 5.1 Update `ChatPanel` to receive/subscribe to selected vehicle
- [x] 5.2 Clear chat messages when vehicle changes
- [x] 5.3 Update placeholder text to reflect selected vehicle
- [x] 5.4 Pass `vehicleId` to API requests

## 6. API Route Enhancement
- [x] 6.1 Accept `vehicleId` in POST request body
- [x] 6.2 Construct vehicle-specific thread ID (`{vehicleId}-inspection-chat`)
- [x] 6.3 Pass `vehicleId` to agent via `requestContext`
- [x] 6.4 Update GET route to accept vehicleId query parameter

## 7. Dynamic Agent Configuration
- [x] 7.1 Create agent registry mapping vehicle IDs to agents
- [x] 7.2 Update `inspectionAgent` to use dynamic `agents` configuration
- [x] 7.3 Configure instructions to reference current vehicle context
- [x] 7.4 Ensure memory thread isolation per vehicle

## 8. Testing & Validation
- [x] 8.1 Verify vehicle switching clears chat and loads correct model
- [x] 8.2 Verify agent responds with vehicle-specific knowledge
- [x] 8.3 Verify memory is isolated between vehicles
- [x] 8.4 Test rapid vehicle switching (no race conditions)
- [x] 8.5 Test initial load defaults to first vehicle
