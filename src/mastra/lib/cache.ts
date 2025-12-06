import { embed } from 'ai';
import { getEmbeddingModel } from './models';

/**
 * Simple in-memory cache for RAG query results and embeddings.
 * Implements a TTL-based cache to reduce embedding API calls and improve latency.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
}

/**
 * Creates a simple in-memory cache with TTL support.
 * @param ttlMs Time-to-live in milliseconds (default: 15 minutes)
 */
export function createQueryCache<T>(ttlMs = 15 * 60 * 1000) {
  const cache = new Map<string, CacheEntry<T>>();
  const stats: CacheStats = { hits: 0, misses: 0 };

  /**
   * Generate a cache key from query and filter parameters.
   */
  function generateKey(query: string, filters?: Record<string, unknown>): string {
    const filterStr = filters ? JSON.stringify(filters, Object.keys(filters).sort()) : '';
    return `${query}|${filterStr}`;
  }

  /**
   * Get a value from the cache.
   * Returns undefined if not found or expired.
   */
  function get(key: string): T | undefined {
    const entry = cache.get(key);

    if (!entry) {
      stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      stats.misses++;
      return undefined;
    }

    stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache.
   */
  function set(key: string, value: T): void {
    cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Clear all entries from the cache.
   * Call this when reseeding data.
   */
  function clear(): void {
    cache.clear();
    stats.hits = 0;
    stats.misses = 0;
  }

  /**
   * Get cache statistics.
   */
  function getStats(): CacheStats & { size: number; hitRate: number } {
    const total = stats.hits + stats.misses;
    return {
      ...stats,
      size: cache.size,
      hitRate: total > 0 ? stats.hits / total : 0,
    };
  }

  /**
   * Remove expired entries from the cache.
   */
  function cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
      }
    }
  }

  return {
    generateKey,
    get,
    set,
    clear,
    getStats,
    cleanup,
  };
}

// Global cache instance for RAG queries
export const ragQueryCache = createQueryCache<{
  results: unknown[];
  totalFound: number;
}>();

// Global cache instance for embeddings (longer TTL since embeddings don't change)
const embeddingCache = createQueryCache<number[]>(60 * 60 * 1000); // 1 hour TTL

/**
 * Get a cached embedding or generate a new one.
 * This eliminates redundant OpenAI embedding API calls (~400ms each).
 *
 * @param query The text to embed
 * @returns The embedding vector
 */
export async function getCachedEmbedding(query: string): Promise<number[]> {
  const cacheKey = embeddingCache.generateKey(query);
  const cached = embeddingCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
  });

  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

/**
 * Get embedding cache statistics for monitoring.
 */
export function getEmbeddingCacheStats() {
  return embeddingCache.getStats();
}
