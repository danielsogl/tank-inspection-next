/**
 * Guardrails and Processors for Vehicle Inspection Agents
 *
 * Processors provide safety and quality controls for agent interactions:
 * - Input processors: Validate/transform user input before LLM processing
 * - Output processors: Filter/modify LLM responses before delivery
 */

import {
  ModerationProcessor,
  PIIDetector,
  TokenLimiterProcessor,
} from '@mastra/core/processors';

/**
 * Input moderation processor - blocks harmful content before LLM processing.
 * Uses a lightweight model for fast classification.
 */
export const inputModerationProcessor = new ModerationProcessor({
  model: 'openai/gpt-4.1-mini',
  categories: ['hate', 'harassment', 'violence', 'self-harm'],
  threshold: 0.7,
  strategy: 'block',
  includeScores: false,
});

/**
 * PII detector for output - redacts sensitive information from responses.
 * Ensures no personal data leaks in agent responses.
 */
export const outputPIIProcessor = new PIIDetector({
  model: 'openai/gpt-4.1-mini',
  detectionTypes: ['email', 'phone', 'ssn', 'credit-card'],
  threshold: 0.6,
  strategy: 'redact',
  redactionMethod: 'mask',
  preserveFormat: true,
});

/**
 * Token limiter - prevents excessively long responses.
 * Truncates responses that exceed the limit.
 */
export const tokenLimiterProcessor = new TokenLimiterProcessor({
  limit: 4000,
  strategy: 'truncate',
  countMode: 'cumulative',
});

/**
 * Export processor configurations for different security levels.
 */
export const processorConfigs = {
  /**
   * Standard configuration - basic safety checks.
   */
  standard: {
    inputProcessors: [inputModerationProcessor],
    outputProcessors: [tokenLimiterProcessor],
  },

  /**
   * Enhanced configuration - includes PII detection.
   */
  enhanced: {
    inputProcessors: [inputModerationProcessor],
    outputProcessors: [outputPIIProcessor, tokenLimiterProcessor],
  },
} as const;
