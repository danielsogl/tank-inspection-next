# agent-chat Specification

## Purpose
TBD - created by archiving change add-vehicle-inspection-agents. Update Purpose after archive.
## Requirements
### Requirement: General Inspection Agent

The application MUST provide a general inspection agent that handles user chat interactions and delegates vehicle-specific queries to specialized sub-agents.

#### Scenario: General query handling
- **WHEN** a user sends a general question (e.g., "What is this application for?")
- **THEN** the general inspection agent MUST respond directly without delegation
- **AND** the response MUST be contextually relevant to vehicle inspection

#### Scenario: Vehicle-specific query delegation
- **WHEN** a user asks a question specific to the selected vehicle (e.g., "What is the turret rotation speed?")
- **THEN** the general inspection agent MUST delegate to the appropriate vehicle-specific sub-agent
- **AND** the sub-agent's response MUST be returned to the user

#### Scenario: Agent model configuration
- **WHEN** the general inspection agent is initialized
- **THEN** it MUST use the `openai/gpt-5-mini` model
- **AND** it MUST have memory configured for conversation persistence

### Requirement: Tank Inspection Agent

The application MUST provide a tank-specific agent that handles queries related to tank vehicles (e.g., Leopard2).

#### Scenario: Tank-specific query response
- **WHEN** the tank agent receives a query about tank components, maintenance, or specifications
- **THEN** it MUST provide accurate, domain-specific information
- **AND** the response MUST reflect knowledge of the Leopard2 tank

#### Scenario: Tank agent model configuration
- **WHEN** the tank agent is initialized
- **THEN** it MUST use the `openai/gpt-5-mini` model

### Requirement: Inspection API Route

The inspection API route MUST integrate with the general inspection agent to process user messages.

#### Scenario: POST request processing
- **WHEN** a POST request is sent to `/api/inspection` with user messages
- **THEN** the request MUST be processed by the general inspection agent
- **AND** the response MUST be streamed back using `createUIMessageStreamResponse`

#### Scenario: GET request for message history
- **WHEN** a GET request is sent to `/api/inspection`
- **THEN** the conversation history MUST be retrieved from memory
- **AND** messages MUST be converted to AI SDK UI format

### Requirement: Conversation Memory

The application MUST maintain conversation history across chat interactions.

#### Scenario: Message persistence
- **WHEN** a user sends a message and receives a response
- **THEN** both messages MUST be stored in memory
- **AND** subsequent requests MUST have access to the conversation history

#### Scenario: Thread-based memory
- **WHEN** the agent processes messages
- **THEN** memory MUST be organized by thread ID (`inspection-chat`)
- **AND** memory MUST be associated with a resource ID for the user

### Requirement: Agent System Prompts

Each agent MUST be configured with a system prompt that defines its behavior and domain expertise.

#### Scenario: General agent system prompt
- **WHEN** the general inspection agent is created
- **THEN** its instructions MUST define its role as a vehicle inspection assistant
- **AND** instructions MUST specify delegation behavior for vehicle-specific queries

#### Scenario: Tank agent system prompt
- **WHEN** the tank agent is created
- **THEN** its instructions MUST define expertise in tank/armored vehicle inspection
- **AND** instructions MUST include knowledge of Leopard2 components and specifications

