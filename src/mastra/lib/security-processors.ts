/**
 * Security processors for the Vehicle Inspection Agent.
 *
 * These processors provide layered defense against:
 * - Prompt injection attacks
 * - Jailbreak attempts
 * - PII exposure
 * - System prompt disclosure
 *
 * @see https://mastra.ai/docs/v1/agents/guardrails
 */

import {
  ModerationProcessor,
  PIIDetector,
  PromptInjectionDetector,
  SystemPromptScrubber,
  UnicodeNormalizer,
} from "@mastra/core/processors";

import { SECURITY_MODEL } from "./models";

/**
 * Input processors - run BEFORE messages are sent to the LLM.
 *
 * Processing order:
 * 1. UnicodeNormalizer - sanitize text, prevent obfuscation attacks
 * 2. PromptInjectionDetector - block injection/jailbreak attempts
 * 3. PIIDetector - redact personal data from user input
 * 4. ModerationProcessor - block inappropriate content
 */
export const inputProcessors = [
  // 1. Normalize unicode to prevent obfuscation attacks
  new UnicodeNormalizer({
    stripControlChars: true,
    collapseWhitespace: true,
    preserveEmojis: false, // Military context - no emojis needed
    trim: true,
  }),

  // 2. Detect and block prompt injection attempts
  new PromptInjectionDetector({
    model: SECURITY_MODEL,
    detectionTypes: [
      "injection",
      "jailbreak",
      "system-override",
      "role-manipulation",
      "tool-exfiltration",
    ],
    threshold: 0.6, // Internal use - moderate threshold to reduce false positives
    strategy: "block",
    includeScores: true,
  }),

  // 3. Redact PII from user input
  new PIIDetector({
    model: SECURITY_MODEL,
    detectionTypes: ["email", "phone", "ssn", "api-key", "credit-card"],
    threshold: 0.5,
    strategy: "redact",
    redactionMethod: "mask",
    preserveFormat: true,
    includeDetections: true,
  }),

  // 4. Content moderation - block inappropriate content
  new ModerationProcessor({
    model: SECURITY_MODEL,
    categories: ["hate", "harassment", "violence"],
    threshold: 0.6,
    strategy: "block",
    includeScores: true,
  }),
];

/**
 * Output processors - run AFTER the LLM generates a response.
 *
 * Processing order:
 * 1. SystemPromptScrubber - prevent system prompt disclosure
 * 2. PIIDetector - redact any PII in the response
 */
export const outputProcessors = [
  // 1. Prevent system prompt disclosure
  new SystemPromptScrubber({
    model: SECURITY_MODEL,
    strategy: "redact",
    redactionMethod: "placeholder",
    placeholderText: "[CLASSIFIED]",
    includeDetections: true,
  }),

  // 2. Redact any PII that might appear in output
  new PIIDetector({
    model: SECURITY_MODEL,
    detectionTypes: ["email", "phone", "ssn", "api-key"],
    threshold: 0.5,
    strategy: "redact",
    redactionMethod: "mask",
  }),
];
