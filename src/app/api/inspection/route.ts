import { NextResponse, type NextRequest } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { createUIMessageStreamResponse } from "ai";
import { getVehicleAgent } from "@/mastra/agents/registry";

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
  try {
    const { messages, vehicleId = "leopard2" } = await req.json();

    // Get the appropriate agent for the vehicle (programmatic routing)
    const vehicleAgent = getVehicleAgent(vehicleId);

    // Create vehicle-specific thread ID for memory isolation
    const threadId = `${vehicleId}-inspection-chat`;

    // Extract dynamic user ID from request
    const resourceId = getUserId(req);

    // Stream from the vehicle-specific agent
    const stream = await vehicleAgent.stream(messages, {
      memory: {
        thread: threadId,
        resource: resourceId,
      },
    });

    return createUIMessageStreamResponse({
      stream: toAISdkStream(stream, { from: "agent" }),
    });
  } catch (error) {
    console.error("Inspection API POST error:", error);

    // Return structured error response
    return NextResponse.json(
      {
        error: "Failed to process inspection request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const vehicleId = searchParams.get("vehicleId") ?? "leopard2";

    // Get the appropriate agent for the vehicle
    const vehicleAgent = getVehicleAgent(vehicleId);

    const threadId = `${vehicleId}-inspection-chat`;

    // Extract dynamic user ID from request
    const resourceId = getUserId(req);

    const memory = await vehicleAgent.getMemory();

    if (!memory) {
      return NextResponse.json([]);
    }

    const { messages } = await memory.recall({
      threadId,
      resourceId,
    });

    const convertedMessages = convertMessages(messages).to("AIV5.UI");
    return NextResponse.json(convertedMessages);
  } catch (error) {
    console.error("Inspection API GET error:", error);

    return NextResponse.json(
      {
        error: "Failed to retrieve conversation history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
