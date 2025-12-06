import { mastra } from "@/mastra";
import { NextResponse, type NextRequest } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { createUIMessageStreamResponse } from "ai";

// Call tankAgent directly to eliminate routing layer latency (~500-1000ms savings)
// The inspectionAgent routing layer added an extra LLM call just for delegation
const tankAgent = mastra.getAgent("tankAgent");

/**
 * Extract user ID from request headers or generate anonymous ID.
 * Supports common auth patterns: x-user-id header, authorization token, or cookie-based session.
 */
function getUserId(req: Request): string {
  // Check for explicit user ID header
  const userIdHeader = req.headers.get("x-user-id");
  if (userIdHeader) {
    return userIdHeader;
  }

  // Check for session ID from cookie (common pattern)
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/session[_-]?id=([^;]+)/i);
    if (sessionMatch) {
      return `session-${sessionMatch[1]}`;
    }
  }

  // Fall back to anonymous user with browser fingerprint from user-agent
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const fingerprint = Buffer.from(userAgent).toString("base64").slice(0, 16);
  return `anonymous-${fingerprint}`;
}

export async function POST(req: Request) {
  const { messages, vehicleId = "leopard2" } = await req.json();

  // Create vehicle-specific thread ID for memory isolation
  const threadId = `${vehicleId}-inspection-chat`;

  // Extract dynamic user ID from request
  const resourceId = getUserId(req);

  // Stream directly from tankAgent (no routing overhead)
  const stream = await tankAgent.stream(messages, {
    memory: {
      thread: threadId,
      resource: resourceId,
    },
  });

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }),
  });
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const vehicleId = searchParams.get("vehicleId") ?? "leopard2";
  const threadId = `${vehicleId}-inspection-chat`;

  // Extract dynamic user ID from request
  const resourceId = getUserId(req);

  const memory = await tankAgent.getMemory();

  if (!memory) {
    return NextResponse.json([]);
  }

  const { messages } = await memory.recall({
    threadId,
    resourceId,
  });

  const convertedMessages = convertMessages(messages).to("AIV5.UI");
  return NextResponse.json(convertedMessages);
}
