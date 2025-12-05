## MODIFIED Requirements

### Requirement: Tank Inspection Agent

The application MUST provide a tank-specific agent that handles queries related to tank vehicles (e.g., Leopard2) using RAG-powered knowledge retrieval.

#### Scenario: Tank-specific query response
- **WHEN** the tank agent receives a query about tank components, maintenance, or specifications
- **THEN** it MUST use RAG tools to retrieve accurate, domain-specific information
- **AND** the response MUST reflect knowledge retrieved from the vector database
- **AND** it MUST fall back to base knowledge if RAG tools return no results

#### Scenario: Tank agent model configuration
- **WHEN** the tank agent is initialized
- **THEN** it MUST use the `openai/gpt-5-mini` model

#### Scenario: Tank agent tool configuration
- **WHEN** the tank agent is initialized
- **THEN** it MUST have access to the `queryInspectionTool` for semantic search
- **AND** it MUST have access to the `getCheckpointTool` for checkpoint lookup
- **AND** it MUST have access to the `getComponentDetailsTool` for component specs
- **AND** it MUST have access to the `classifyDefectTool` for defect classification
- **AND** it MUST have access to the `getMaintenanceIntervalTool` for maintenance schedules

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
