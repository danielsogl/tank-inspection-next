/**
 * Centralized model configuration for the Mastra application.
 * All AI model definitions are managed here for consistency and reusability.
 *
 * Mastra uses the format "provider/model" for language models.
 * @see https://mastra.ai/docs/v1/agents/overview
 */

import { openai } from '@ai-sdk/openai';
import type { ModelRouterModelId } from '@mastra/core/llm/model';

// ============================================================================
// AGENT / LANGUAGE MODELS
// ============================================================================

/**
 * Primary language model for agents.
 * GPT-5 is OpenAI's latest model offering improved reasoning and capabilities.
 */
export const AGENT_MODEL: ModelRouterModelId = 'openai/gpt-5';

/**
 * Mini variant for cost-effective operations.
 * Use for less complex tasks or high-volume operations.
 */
export const AGENT_MODEL_MINI: ModelRouterModelId = 'openai/gpt-5-mini';

/**
 * All available agent models for type safety.
 */
export const AGENT_MODELS = {
  /** Full GPT-5 model - best quality */
  GPT5: AGENT_MODEL,
  /** GPT-5 Mini - cost-effective option */
  GPT5_MINI: AGENT_MODEL_MINI,
} as const satisfies Record<string, ModelRouterModelId>;

export type AgentModel = (typeof AGENT_MODELS)[keyof typeof AGENT_MODELS];

// ============================================================================
// VOICE / REALTIME MODELS
// ============================================================================

/**
 * OpenAI Realtime model for voice interactions.
 * Used by the OpenAI Agents Realtime SDK.
 */
export const VOICE_MODEL = 'gpt-realtime' as const;

/**
 * All available voice models for type safety.
 */
export const VOICE_MODELS = {
  /** OpenAI GPT Realtime for voice */
  GPT_REALTIME: VOICE_MODEL,
} as const;

export type VoiceModel = (typeof VOICE_MODELS)[keyof typeof VOICE_MODELS];

// ============================================================================
// EMBEDDING MODELS
// ============================================================================

/**
 * Embedding model name for vector embeddings.
 * text-embedding-3-small outputs 1536 dimensions.
 */
export const EMBEDDING_MODEL_NAME = 'text-embedding-3-small' as const;

/**
 * Embedding model dimensions (required for vector store configuration).
 */
export const EMBEDDING_DIMENSIONS = 1536 as const;

/**
 * Get the configured embedding model instance from AI SDK.
 * Use this function to get the embedding model for generating embeddings.
 *
 * @returns The OpenAI embedding model instance
 *
 * @example
 * ```ts
 * const { embedding } = await embed({
 *   model: getEmbeddingModel(),
 *   value: 'text to embed',
 * });
 * ```
 */
export function getEmbeddingModel() {
  return openai.embedding(EMBEDDING_MODEL_NAME);
}

/**
 * All available embedding models for type safety.
 */
export const EMBEDDING_MODELS = {
  /** OpenAI text-embedding-3-small - 1536 dimensions, cost-effective */
  TEXT_EMBEDDING_3_SMALL: EMBEDDING_MODEL_NAME,
} as const;

export type EmbeddingModel = (typeof EMBEDDING_MODELS)[keyof typeof EMBEDDING_MODELS];

// ============================================================================
// DEFAULT EXPORTS FOR CONVENIENCE
// ============================================================================

/**
 * Default models configuration object.
 * Import this for a consolidated view of all model settings.
 */
export const MODELS = {
  agent: {
    default: AGENT_MODEL,
    mini: AGENT_MODEL_MINI,
  },
  voice: {
    default: VOICE_MODEL,
  },
  embedding: {
    default: EMBEDDING_MODEL_NAME,
    dimensions: EMBEDDING_DIMENSIONS,
    getInstance: getEmbeddingModel,
  },
} as const;
