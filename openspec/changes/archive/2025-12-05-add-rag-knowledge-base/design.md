## Context

The current tank inspection agents have vehicle knowledge embedded directly in their system prompts. This approach:
- Limits the amount of knowledge that can be included
- Makes updates difficult (requires code changes)
- Prevents semantic search and filtering
- Cannot scale to multiple vehicle types with detailed specifications

The reference application (`/Users/danielsogl/Developer/thinktecture/research/tank-inspection`) has a complete RAG implementation using Supabase pgvector that can be adapted for this project.

## Goals / Non-Goals

### Goals
- Enable agents to retrieve relevant tank/inspection information via semantic search
- Support filtering by vehicle type, variant, crew role, maintenance level, component, and priority
- Store vector embeddings in Supabase using pgvector extension
- Provide a data seeding pipeline for initial and future data population
- Maintain backward compatibility with existing agent behavior

### Non-Goals
- Real-time data synchronization (manual seeding is sufficient)
- Full-text search fallback (semantic search only)
- User-facing RAG admin interface
- Multi-tenancy or access control on vector data

## Decisions

### Decision 1: Use Supabase pgvector for Vector Storage

**What**: Use `@mastra/pg` with Supabase's pgvector extension for vector storage.

**Why**:
- Supabase is already configured in the project
- pgvector is mature and well-supported
- `@mastra/pg` provides a clean abstraction compatible with Mastra agents
- No additional infrastructure required

**Alternatives considered**:
- Pinecone: Adds external dependency and cost
- LibSQL: Current memory store, but not optimized for vector similarity
- In-memory: Not persistent, unsuitable for production

### Decision 2: OpenAI text-embedding-3-small for Embeddings

**What**: Use `text-embedding-3-small` model (1536 dimensions) for generating embeddings.

**Why**:
- Cost-effective for high-volume embeddings
- Sufficient quality for domain-specific technical content
- Same model as reference application, ensuring compatibility
- Standard dimension (1536) is well-optimized in pgvector

**Alternatives considered**:
- text-embedding-3-large: Higher quality but more expensive and larger dimensions
- Cohere/Voyage: Would require additional API setup

### Decision 3: Structured Metadata Schema

**What**: Use a comprehensive metadata schema for filtering:
```typescript
interface InspectionChunkMetadata {
  vehicleType: 'leopard2' | 'm1a2';
  vehicleVariant?: string;  // A4, A5, A6, A7, etc.
  sectionId: string;        // A-F
  sectionName: string;
  checkpointNumber?: number;
  checkpointName?: string;
  crewRole?: 'driver' | 'commander' | 'gunner' | 'loader';
  maintenanceLevel?: 'L1' | 'L2' | 'L3' | 'L4';
  componentId?: string;     // mtu_mb873, renk_hswl354
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  estimatedTimeMin?: number;
  dataType: 'vehicle' | 'checkpoint' | 'component' | 'defect' | 'interval';
  text: string;
  source: string;
}
```

**Why**:
- Enables precise filtering without full semantic search
- Matches reference application schema for data compatibility
- Supports role-based and context-aware queries

### Decision 4: Tool-Based RAG Access Using Mastra Built-in Tools

**What**: Use Mastra's built-in `createVectorQueryTool()` from `@mastra/rag` for semantic search, with custom tools for domain-specific operations.

**Why**:
- `createVectorQueryTool()` provides production-ready semantic search with filtering
- Supports pgvector-specific configurations (minScore, ef, probes)
- Built-in reranking capabilities
- Reduces custom code and maintenance burden
- Agent decides when to query based on user question

**Tools to implement**:
1. `createVectorQueryTool()` (built-in) - Semantic search with metadata filters, reranking
2. `getCheckpointTool` (custom) - Direct checkpoint lookup by number
3. `getComponentDetailsTool` (custom) - Component specifications with maintenance/failures
4. `classifyDefectTool` (custom) - Defect priority classification
5. `getMaintenanceIntervalTool` (custom) - Maintenance schedule lookup

**Mastra Client SDK**:
The client SDK (`@mastra/client-js`) provides `mastraClient.getVector()` for client-side vector operations, useful for future enhancements like direct UI-based search.

### Decision 5: Copy Structured Data from Reference

**What**: Copy the `data/leopard2-rag/` directory from the reference application.

**Why**:
- Comprehensive structured data already exists
- Maintains consistency between projects
- Includes vehicles, components, checkpoints, defects, intervals
- Well-organized JSON format

### Decision 6: Include M1 Abrams Placeholder Data

**What**: Include the M1A2 Abrams placeholder data from the reference application alongside Leopard 2 data.

**Why**:
- Maintains feature parity with reference application
- Prepares infrastructure for future M1A2 enhancements
- Vehicle switching already supports both vehicle types
- Placeholder data is better than no data for demo purposes

### Decision 7: Voice-Compatible RAG Access

**What**: RAG tools work seamlessly during voice interactions.

**Why**:
- Voice users need the same knowledge access as text users
- Tools should return data in a format agents can summarize for speech
- No special voice-specific tool variants needed; agent handles summarization

**Implementation notes**:
- Tools return structured data that agents can verbalize
- Agent instructions should guide concise responses in voice mode
- Tool results are not read directly to user; agent synthesizes response

### Decision 8: Query Result Caching

**What**: Implement caching for RAG query results to reduce latency and costs.

**Why**:
- Frequently asked questions benefit from cached responses
- Reduces OpenAI embedding API calls
- Improves response latency for repeated queries
- Cost savings on embedding generation

**Implementation approach**:
- In-memory cache with TTL (time-to-live) of 15 minutes
- Cache key: hash of query + filter parameters
- Cache invalidation on data reseed
- Optional: persistent cache using Supabase for cross-instance sharing

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase connection issues | Agent queries fail | Graceful fallback to hardcoded knowledge, connection pooling |
| Embedding cost | Increased API costs | Use text-embedding-3-small, batch embeddings, cache results |
| Data staleness | Outdated responses | Document seeding process, version data files |
| Query latency | Slower responses | Connection pooling, index optimization, limit topK |
| Schema evolution | Breaking changes | Use versioned metadata, backward-compatible migrations |

## Migration Plan

### Phase 1: Infrastructure Setup
1. Enable pgvector extension in Supabase
2. Create vector table schema via migration
3. Add `@mastra/pg` and `@mastra/rag` dependencies

### Phase 2: Data Population
1. Copy `data/leopard2-rag/` from reference application
2. Create and run seeding script
3. Verify embeddings in Supabase

### Phase 3: Tool Implementation
1. Implement vector store wrapper (`lib/vector.ts`)
2. Create RAG tools with Zod schemas
3. Add tools to agent configurations

### Phase 4: Agent Updates
1. Update agent instructions to reference tools
2. Remove/reduce hardcoded knowledge
3. Test query accuracy

### Rollback
- Delete vector table to remove all embeddings
- Remove tools from agent configuration
- Restore full hardcoded instructions

## Resolved Questions

1. **M1 Abrams Data**: Include placeholder data as-is (Decision 6)
2. **Voice Compatibility**: RAG tools work with voice; agent handles summarization (Decision 7)
3. **Caching Strategy**: Implement in-memory caching with 15-minute TTL (Decision 8)
