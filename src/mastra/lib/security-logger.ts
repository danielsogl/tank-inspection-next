/**
 * Security-aware logger wrapper for Mastra.
 *
 * Extends PinoLogger to intercept processor-related error logs and reformat them
 * as expected security events rather than unhandled errors.
 *
 * Also patches console.error to intercept Mastra's internal error logging
 * for security processor blocks.
 */

import type { LogLevel } from "@mastra/loggers";
import { PinoLogger } from "@mastra/loggers";

/** Patterns that indicate security processor blocks (expected behavior) */
const SECURITY_BLOCK_PATTERNS = [
  "tripwire",
  "prompt injection",
  "prompt-injection-detector",
  "moderation",
  "content flagged",
  "system-prompt-scrubber",
  "pii-detector",
] as const;

/** Pattern to detect Mastra workflow error logs */
const WORKFLOW_ERROR_PATTERN = /^Error executing step.*processor/i;

/**
 * Checks if a log message or data indicates a security block.
 */
function isSecurityBlock(message: string, data?: unknown): boolean {
  const messageStr = message.toLowerCase();
  const dataStr =
    typeof data === "object" && data !== null
      ? JSON.stringify(data).toLowerCase()
      : String(data || "").toLowerCase();

  return SECURITY_BLOCK_PATTERNS.some(
    (pattern) => messageStr.includes(pattern) || dataStr.includes(pattern)
  );
}

/**
 * Extract a clean security reason from the error message/data.
 */
function extractSecurityReason(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("prompt injection")) {
    return "Prompt injection attempt blocked";
  }
  if (lowerMessage.includes("moderation")) {
    return "Content moderation triggered";
  }
  if (lowerMessage.includes("pii")) {
    return "PII detected and handled";
  }
  if (lowerMessage.includes("system-prompt")) {
    return "System prompt leak prevented";
  }
  if (lowerMessage.includes("tripwire")) {
    return "Security guardrail triggered";
  }

  return "Security check blocked request";
}

/**
 * A logger that extends PinoLogger and reformats security processor blocks
 * to look like intentional security events rather than errors.
 */
export class SecurityAwareLogger extends PinoLogger {
  private static consolePatched = false;
  private static originalConsoleError: typeof console.error;

  constructor(options: { name: string; level?: LogLevel }) {
    super({
      name: options.name,
      level: options.level ?? "info",
    });

    // Patch console.error to intercept Mastra's internal error logging
    this.patchConsole();
  }

  /**
   * Patches console.error to intercept security-related errors from Mastra's
   * internal workflow engine and log them as informational security events.
   */
  private patchConsole(): void {
    if (SecurityAwareLogger.consolePatched) return;

    SecurityAwareLogger.originalConsoleError = console.error;
    const logger = this;

    console.error = function (...args: unknown[]) {
      const firstArg = args[0];

      // Check if this is a Mastra workflow error for a security processor
      if (typeof firstArg === "string") {
        const isWorkflowError = WORKFLOW_ERROR_PATTERN.test(firstArg);
        const isSecurityRelated = isSecurityBlock(firstArg, args[1]);

        if (isWorkflowError && isSecurityRelated) {
          // Log as clean security event instead of raw error
          logger.info(`[Security] ${extractSecurityReason(firstArg)}`);
          return;
        }
      }

      // Pass through other console.error calls
      SecurityAwareLogger.originalConsoleError.apply(console, args);
    };

    SecurityAwareLogger.consolePatched = true;
  }

  override error(message: string, data?: Record<string, unknown>): void {
    // Check if this is a security processor block
    if (isSecurityBlock(message, data)) {
      // Log as info-level security event instead of error
      super.info(`[Security] ${extractSecurityReason(message)}`);
      return;
    }

    // Pass through other errors normally
    super.error(message, data);
  }
}
