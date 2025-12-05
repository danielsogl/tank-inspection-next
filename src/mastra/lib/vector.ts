import { PgVector } from '@mastra/pg';

/**
 * Vector store configuration for Supabase (pgvector).
 *
 * The connection string should be set via the SUPABASE_DB_URL environment variable.
 * Format: postgresql://user:password@host:port/database
 *
 * Example for Supabase:
 * postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 */

// Singleton vector store instance - reused across all tool calls
let vectorStoreInstance: PgVector | null = null;

/**
 * Get the singleton vector store instance.
 * Creates it on first call and reuses for all subsequent calls.
 * This eliminates connection overhead per tool invocation.
 */
export function getVectorStore(): PgVector {
  if (vectorStoreInstance) {
    return vectorStoreInstance;
  }

  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    throw new Error(
      'SUPABASE_DB_URL environment variable is required for vector store initialization',
    );
  }

  vectorStoreInstance = new PgVector({
    id: 'inspection-vectors',
    connectionString,
  });

  return vectorStoreInstance;
}

/**
 * @deprecated Use getVectorStore() instead for connection pooling.
 * Creates a new vector store instance (kept for backward compatibility).
 */
export function createVectorStore() {
  return getVectorStore();
}

/**
 * Index configuration for inspection documents.
 * Using OpenAI's text-embedding-3-small which outputs 1536 dimensions.
 */
export const INSPECTION_INDEX_CONFIG = {
  indexName: 'inspection_documents',
  dimension: 1536,
  metric: 'cosine' as const,
};

// Re-export the metadata type for convenience
export type { InspectionChunkMetadata } from '../types/rag-data.types';
