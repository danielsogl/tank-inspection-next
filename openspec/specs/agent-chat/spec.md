# agent-chat Specification

## Purpose
TBD - created by archiving change add-vehicle-inspection-agents. Update Purpose after archive.
## Requirements
### Requirement: General Inspection Agent

The application MUST provide a general inspection agent that handles user chat interactions and delegates vehicle-specific queries to specialized sub-agents based on the selected vehicle.

#### Scenario: General query handling
- **WHEN** a user sends a general question (e.g., "What is this application for?")
- **THEN** the general inspection agent MUST respond directly without delegation
- **AND** the response MUST be contextually relevant to vehicle inspection

#### Scenario: Vehicle-specific query delegation
- **WHEN** a user asks a question specific to the selected vehicle
- **THEN** the general inspection agent MUST delegate to the vehicle's specialized sub-agent
- **AND** the sub-agent MUST be selected based on the current vehicle context
- **AND** the sub-agent's response MUST be returned to the user

#### Scenario: Agent model configuration
- **WHEN** the general inspection agent is initialized
- **THEN** it MUST use the `openai/gpt-4o-mini` model
- **AND** it MUST have memory configured for conversation persistence

#### Scenario: Dynamic agent resolution
- **WHEN** the general inspection agent receives a request with vehicle context
- **THEN** it MUST resolve the appropriate sub-agent dynamically based on the vehicle ID
- **AND** the sub-agents MUST be configured via a function that receives `requestContext`

### Requirement: Tank Inspection Agent

The application MUST provide a tank-specific agent that handles queries related to tank vehicles (e.g., Leopard2) using RAG-powered knowledge retrieval.

#### Scenario: Tank-specific query response
- **WHEN** the tank agent receives a query about tank components, maintenance, or specifications
- **THEN** it MUST use RAG tools to retrieve accurate, domain-specific information
- **AND** the response MUST reflect knowledge retrieved from the vector database
- **AND** it MUST fall back to base knowledge if RAG tools return no results

#### Scenario: Tank agent model configuration
- **WHEN** the tank agent is initialized
- **THEN** it MUST use the `openai/gpt-4o-mini` model

#### Scenario: Tank agent tool configuration
- **WHEN** the tank agent is initialized
- **THEN** it MUST have access to the `queryInspectionTool` for semantic search
- **AND** it MUST have access to the `getCheckpointTool` for checkpoint lookup
- **AND** it MUST have access to the `getComponentDetailsTool` for component specs
- **AND** it MUST have access to the `classifyDefectTool` for defect classification
- **AND** it MUST have access to the `getMaintenanceIntervalTool` for maintenance schedules

### Requirement: Inspection API Route

The inspection API route MUST integrate with the general inspection agent to process user messages with vehicle context.

#### Scenario: POST request processing with vehicle context
- **WHEN** a POST request is sent to `/api/inspection` with user messages and vehicleId
- **THEN** the request MUST extract the vehicleId from the request body
- **AND** the vehicleId MUST be passed to the agent via requestContext
- **AND** the response MUST be streamed back using `createUIMessageStreamResponse`

#### Scenario: GET request for message history
- **WHEN** a GET request is sent to `/api/inspection` with a vehicleId query parameter
- **THEN** the conversation history for that specific vehicle MUST be retrieved from memory
- **AND** messages MUST be converted to AI SDK UI format

### Requirement: Conversation Memory

The application MUST maintain conversation history isolated by vehicle selection.

#### Scenario: Vehicle-specific memory threads
- **WHEN** a user sends a message for a selected vehicle
- **THEN** the message MUST be stored in a vehicle-specific thread
- **AND** the thread ID MUST follow the pattern `{vehicleId}-inspection-chat`

#### Scenario: Thread isolation
- **WHEN** a user switches to a different vehicle
- **THEN** the new vehicle's conversation thread MUST be independent
- **AND** previous vehicle conversations MUST remain accessible in their respective threads

### Requirement: Agent System Prompts

Each agent MUST be configured with a system prompt that defines its behavior, domain expertise, and tool usage guidance.

#### Scenario: General agent system prompt
- **WHEN** the general inspection agent is created
- **THEN** its instructions MUST define its role as a vehicle inspection assistant
- **AND** instructions MUST specify delegation behavior for vehicle-specific queries

#### Scenario: Tank agent system prompt
- **WHEN** the tank agent is created
- **THEN** its instructions MUST define expertise in tank/armored vehicle inspection
- **AND** instructions MUST include guidance on using RAG tools for knowledge retrieval
- **AND** instructions MUST specify when to use each tool (semantic search vs direct lookup)
- **AND** instructions MUST include fallback behavior when tools return no results

### Requirement: Chat Clearing on Vehicle Switch

The chat interface MUST clear when the user switches vehicles.

#### Scenario: Clear chat on vehicle change
- **WHEN** the user selects a different vehicle
- **THEN** the chat panel MUST immediately clear all displayed messages
- **AND** the input field placeholder MUST update to reflect the new vehicle

#### Scenario: Preserve previous conversations in memory
- **WHEN** the chat is cleared due to a vehicle switch
- **THEN** the previous vehicle's conversation MUST remain stored in memory
- **AND** switching back to that vehicle MAY restore the conversation (future enhancement)

### Requirement: Vehicle Context in Chat Requests

The chat panel MUST include vehicle context in all API requests.

#### Scenario: Include vehicleId in messages
- **WHEN** a user sends a message from the chat panel
- **THEN** the API request MUST include the currently selected vehicleId
- **AND** the vehicleId MUST be obtained from the vehicle context

