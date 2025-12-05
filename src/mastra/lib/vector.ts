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
export function createVectorStore() {
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    throw new Error(
      'SUPABASE_DB_URL environment variable is required for vector store initialization',
    );
  }

  return new PgVector({
    id: 'inspection-vectors',
    connectionString,
  });
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
