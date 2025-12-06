/**
 * Centralized Model Configuration
 *
 * All model identifiers used across the application.
 * Update these constants to switch models globally.
 *
 * Model format: 'provider/model-name'
 * @see https://mastra.ai/docs/models for available models
 */

import type { openai } from "@ai-sdk/openai";
import type { MastraModelConfig } from "@mastra/core/llm";
import type { Realtime } from "openai-realtime-api";
type OpenAIEmbeddingModelId = Parameters<typeof openai.embedding>[0];

// ============================================================================
// Application Model Configuration
// ============================================================================

/**
 * Primary model for agent reasoning and responses.
 * Used by vehicle inspection agents.
 */
export const AGENT_MODEL: MastraModelConfig = "openai/gpt-5-mini";

/**
 * Lightweight model for guardrails and moderation.
 * Used by input/output processors for fast classification.
 */
export const GUARDRAIL_MODEL: MastraModelConfig = "openai/gpt-5-nano";

/**
 * Ultra-fast model for input moderation.
 * Optimized for low-latency content classification.
 */
export const MODERATION_MODEL: MastraModelConfig = "openai/gpt-5-nano";

/**
 * Embedding model for semantic memory recall.
 * text-embedding-3-small: 1536 dimensions, cost-efficient.
 */
export const EMBEDDING_MODEL: OpenAIEmbeddingModelId = "text-embedding-3-small";

/**
 * Voice model for real-time speech interactions.
 */
export const VOICE_MODEL = "gpt-realtime" as const;

/**
 * Voice speaker for text-to-speech.
 */
export const VOICE_SPEAKER: Realtime.Voice = "ballad";
