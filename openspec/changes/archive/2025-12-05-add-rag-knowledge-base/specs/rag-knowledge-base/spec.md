## ADDED Requirements

### Requirement: Vector Store Configuration

The application MUST provide a vector store configuration for Supabase pgvector integration.

#### Scenario: Vector store initialization
- **WHEN** the vector store is initialized
- **THEN** it MUST connect to Supabase using the `SUPABASE_DB_URL` environment variable
- **AND** it MUST use connection pooling with a maximum of 10 connections
- **AND** it MUST use a 30-second idle timeout

#### Scenario: Index configuration
- **WHEN** the inspection documents index is created
- **THEN** it MUST be named `inspection_documents`
- **AND** it MUST have a dimension of 1536 (OpenAI text-embedding-3-small)
- **AND** it MUST use cosine similarity metric

#### Scenario: Missing connection string
- **WHEN** the `SUPABASE_DB_URL` environment variable is not set
- **THEN** the vector store initialization MUST throw an error with a descriptive message

### Requirement: Inspection Chunk Metadata Schema

The application MUST define a metadata schema for storing inspection document chunks.

#### Scenario: Core metadata fields
- **WHEN** an inspection chunk is stored
- **THEN** it MUST include `vehicleType` (leopard2 or m1a2)
- **AND** it MUST include `sectionId` (A-F)
- **AND** it MUST include `sectionName`
- **AND** it MUST include `text` (original content)
- **AND** it MUST include `source` (file reference)
- **AND** it MUST include `dataType` (vehicle, checkpoint, component, defect, interval)

#### Scenario: Optional metadata fields
- **WHEN** an inspection chunk is stored
- **THEN** it MAY include `vehicleVariant` (A4, A5, A6, A6M, A7, A7V)
- **AND** it MAY include `checkpointNumber` and `checkpointName`
- **AND** it MAY include `crewRole` (driver, commander, gunner, loader)
- **AND** it MAY include `maintenanceLevel` (L1, L2, L3, L4)
- **AND** it MAY include `componentId` (e.g., mtu_mb873)
- **AND** it MAY include `priority` (critical, high, medium, low, info)
- **AND** it MAY include `estimatedTimeMin`

### Requirement: Query Inspection Tool

The application MUST provide a tool for agents to search the inspection vector database using Mastra's built-in `createVectorQueryTool()` from `@mastra/rag`.

#### Scenario: Basic semantic search
- **WHEN** an agent queries with a search string
- **THEN** the tool MUST embed the query using text-embedding-3-small
- **AND** it MUST return the top K most semantically similar results
- **AND** each result MUST include relevantContext, sources, and metadata

#### Scenario: Vehicle type filtering
- **WHEN** an agent queries with `vehicleType` filter
- **THEN** results MUST only include documents matching the specified vehicle type
- **AND** using "any" for vehicleType MUST return results from all vehicles

#### Scenario: Advanced filtering
- **WHEN** an agent provides filter parameters via enableFilter
- **THEN** results MUST be filtered by `vehicleVariant` if specified
- **AND** results MUST be filtered by `crewRole` if specified
- **AND** results MUST be filtered by `maintenanceLevel` if specified
- **AND** results MUST be filtered by `componentId` if specified
- **AND** results MUST be filtered by `priority` if specified
- **AND** results MUST be filtered by `dataType` if specified

#### Scenario: pgvector-specific configuration
- **WHEN** the tool is configured for pgvector
- **THEN** it MUST support `minScore` for similarity threshold
- **AND** it MUST support `ef` parameter for HNSW search accuracy
- **AND** it MUST support `probes` parameter for IVFFlat indexes

#### Scenario: Result count
- **WHEN** an agent queries with `topK` parameter
- **THEN** the tool MUST return at most `topK` results
- **AND** the default MUST be 10 results

### Requirement: Get Checkpoint Tool

The application MUST provide a tool for retrieving specific checkpoint details by number.

#### Scenario: Checkpoint lookup by number
- **WHEN** an agent requests a checkpoint by number and vehicle type
- **THEN** the tool MUST return the exact checkpoint if found
- **AND** the response MUST include checkpointNumber, sectionName, checkpointName, content, and role

#### Scenario: Checkpoint not found
- **WHEN** the requested checkpoint does not exist
- **THEN** the tool MUST return `found: false`
- **AND** the checkpoint field MUST be undefined

### Requirement: Component Details Tool

The application MUST provide a tool for retrieving detailed component specifications.

#### Scenario: Component lookup
- **WHEN** an agent requests component details by componentId
- **THEN** the tool MUST return the component name, category, and specifications

#### Scenario: Optional component data
- **WHEN** an agent requests component details with flags
- **THEN** it MAY include maintenance schedules if `includeMaintenanceSchedule` is true
- **AND** it MAY include monitoring points if `includeMonitoringPoints` is true
- **AND** it MAY include common failures if `includeCommonFailures` is true

### Requirement: Defect Classification Tool

The application MUST provide a tool for classifying defect priority based on description.

#### Scenario: Defect priority classification
- **WHEN** an agent provides a defect description
- **THEN** the tool MUST return a priority level (critical, high, medium, low, info)
- **AND** it MUST return the response time recommendation
- **AND** it MUST return the vehicle status implication
- **AND** it MUST return escalation guidance

#### Scenario: Keyword matching
- **WHEN** classifying a defect
- **THEN** the tool MUST match keywords from the defect taxonomy
- **AND** it MUST return matched keywords and confidence score

### Requirement: Maintenance Interval Tool

The application MUST provide a tool for retrieving maintenance interval information.

#### Scenario: Interval lookup
- **WHEN** an agent queries for maintenance intervals
- **THEN** the tool MUST return NATO standard intervals (L1, L2, L3, L4)
- **AND** each interval MUST include level, duration, executor, and tasks

### Requirement: Data Seeding Script

The application MUST provide a script for populating the vector database with inspection data.

#### Scenario: Structured data loading
- **WHEN** the seeding script is executed
- **THEN** it MUST load vehicle data from `data/leopard2-rag/vehicles/`
- **AND** it MUST load checkpoint data from `data/leopard2-rag/maintenance/sections/`
- **AND** it MUST load component data from `data/leopard2-rag/components/`
- **AND** it MUST load defect taxonomy from `data/leopard2-rag/defects/`
- **AND** it MUST load maintenance intervals from `data/leopard2-rag/maintenance/intervals.json`

#### Scenario: Embedding generation
- **WHEN** data chunks are prepared
- **THEN** the script MUST generate embeddings using OpenAI text-embedding-3-small
- **AND** it MUST batch embedding requests for efficiency

#### Scenario: Vector upsert
- **WHEN** embeddings are generated
- **THEN** the script MUST upsert vectors to the Supabase pgvector index
- **AND** it MUST include all metadata fields with each vector

#### Scenario: Seeding summary
- **WHEN** the seeding completes successfully
- **THEN** the script MUST output a summary of chunks by data type
- **AND** it MUST report the total number of vectors indexed

### Requirement: Database Schema

The Supabase database MUST have the pgvector extension and appropriate schema for vector storage.

#### Scenario: pgvector extension
- **WHEN** the database is configured
- **THEN** the pgvector extension MUST be enabled

#### Scenario: Vector table
- **WHEN** the vector index is created
- **THEN** the table MUST support vectors of dimension 1536
- **AND** it MUST have a HNSW or IVFFlat index for efficient similarity search
- **AND** it MUST store metadata as JSONB

### Requirement: Query Result Caching

The application MUST cache RAG query results to reduce latency and API costs.

#### Scenario: Cache hit
- **WHEN** an identical query with the same filters is executed within the TTL period
- **THEN** the cached result MUST be returned without calling the embedding API
- **AND** the cached result MUST be returned without querying the vector database

#### Scenario: Cache miss
- **WHEN** a query is not found in the cache
- **THEN** the query MUST be executed normally
- **AND** the result MUST be stored in the cache

#### Scenario: Cache TTL
- **WHEN** a cached entry exceeds the TTL (15 minutes)
- **THEN** the cache entry MUST be invalidated
- **AND** the next query MUST execute fresh

#### Scenario: Cache key generation
- **WHEN** a query is executed
- **THEN** the cache key MUST be generated from the query string and all filter parameters
- **AND** different filter combinations MUST result in different cache keys

### Requirement: M1A2 Abrams Data Support

The application MUST support M1A2 Abrams vehicle data alongside Leopard 2.

#### Scenario: M1A2 data seeding
- **WHEN** the seeding script is executed
- **THEN** it MUST load M1A2 Abrams placeholder data if available
- **AND** chunks MUST be tagged with `vehicleType: 'm1a2'`

#### Scenario: M1A2 query filtering
- **WHEN** an agent queries with `vehicleType: 'm1a2'`
- **THEN** results MUST only include M1A2-related documents
