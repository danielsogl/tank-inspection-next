# Change: Add RAG Knowledge Base for Tank and Inspection Information

## Why

The current agents have hardcoded knowledge in their system prompts, limiting their ability to provide accurate, up-to-date, and detailed information about tank specifications, maintenance procedures, and inspection checkpoints. By implementing RAG (Retrieval-Augmented Generation) with Supabase pgvector, agents can access a comprehensive, searchable knowledge base of structured tank and inspection data, improving response accuracy and enabling advanced filtering by vehicle variant, crew role, maintenance level, and component.

## What Changes

### New Capabilities
- **RAG Knowledge Base**: New capability for vector storage and semantic search of inspection documents
- **Supabase pgvector Integration**: Vector database for storing and querying embedded documents using `@mastra/pg`
- **Agent RAG Tools**: Tools for agents to query the knowledge base with semantic search and metadata filtering
- **Data Seeding Pipeline**: Scripts to embed and store structured data from the reference application

### Modifications
- **Agent Configuration**: Update agents to use RAG tools for knowledge retrieval instead of hardcoded instructions
- **Supabase Configuration**: Enable vector extension and create necessary database schema

### Data Sources (from /Users/danielsogl/Developer/thinktecture/research/tank-inspection)
- Vehicle specifications (Leopard 2 A4-A7V variants)
- Maintenance sections (6 sections A-F with 34 checkpoints)
- Component data (engine, transmission, turret systems)
- Defect taxonomy (5-level priority classification)
- Maintenance intervals (NATO L1-L4 standards)

## Impact

- **Affected specs**: `agent-chat` (MODIFIED - agent tools and instructions)
- **New specs**: `rag-knowledge-base` (ADDED - vector store, tools, seeding)
- **Affected code**:
  - `src/mastra/` - New vector store and tools
  - `supabase/` - Database migrations for pgvector
  - `package.json` - New dependencies (`@mastra/pg`, `@mastra/rag`)
  - Agent definitions - Tool integration
- **New files**:
  - `src/mastra/lib/vector.ts` - Vector store configuration
  - `src/mastra/tools/` - RAG query tools
  - `src/mastra/scripts/seed-data.ts` - Data seeding script
  - `data/` - Structured JSON data (copied from reference)
  - `supabase/migrations/` - pgvector schema
