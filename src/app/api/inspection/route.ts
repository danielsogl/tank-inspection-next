import { mastra } from "@/mastra";
import { NextResponse, type NextRequest } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { createUIMessageStreamResponse } from "ai";

// Call tankAgent directly to eliminate routing layer latency (~500-1000ms savings)
// The inspectionAgent routing layer added an extra LLM call just for delegation
const tankAgent = mastra.getAgent("tankAgent");

export async function POST(req: Request) {
  const { messages, vehicleId = "leopard2" } = await req.json();

  // Create vehicle-specific thread ID for memory isolation
  const threadId = `${vehicleId}-inspection-chat`;

  // Stream directly from tankAgent (no routing overhead)
  const stream = await tankAgent.stream(messages, {
    memory: {
      thread: threadId,
      resource: "example-user-id",
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

  const memory = await tankAgent.getMemory();

  if (!memory) {
    return NextResponse.json([]);
  }

  const { messages } = await memory.recall({
    threadId,
    resourceId: "example-user-id",
  });

  const convertedMessages = convertMessages(messages).to("AIV5.UI");
  return NextResponse.json(convertedMessages);
}
