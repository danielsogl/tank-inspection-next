/**
 * Memory Infrastructure for Semantic Recall
 *
 * Provides shared storage, vector store, and embedder for Memory instances.
 * Enables semantic search across conversation history.
 */

import { PgVector } from "@mastra/pg";
import { LibSQLStore } from "@mastra/libsql";
import { openai } from "@ai-sdk/openai";
import { EMBEDDING_MODEL } from "./models";

// Singleton instances
let memoryVectorStore: PgVector | null = null;
let memoryStorage: LibSQLStore | null = null;

/**
 * Get the singleton storage provider for Memory.
 * Uses LibSQL with file-based persistence.
 */
export function getMemoryStorage(): LibSQLStore {
  memoryStorage ??= new LibSQLStore({
    id: "memory-storage",
    url: "file:../mastra.db",
  });
  return memoryStorage;
}

/**
 * Get the singleton vector store for memory semantic recall.
 * Returns undefined if SUPABASE_DB_URL is not configured.
 *
 * Using a separate instance from the RAG vector store to keep
 * conversation embeddings isolated from document embeddings.
 */
export function getMemoryVectorStore(): PgVector | undefined {
  if (!process.env.SUPABASE_DB_URL) {
    return undefined;
  }

  memoryVectorStore ??= new PgVector({
    id: "memory-vectors",
    connectionString: process.env.SUPABASE_DB_URL,
  });

  return memoryVectorStore;
}

export function isSemanticRecallAvailable(): boolean {
  return !!process.env.SUPABASE_DB_URL;
}

export const memoryEmbedder = openai.embedding(EMBEDDING_MODEL);
