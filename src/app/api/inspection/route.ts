import { mastra } from "@/mastra";
import { NextResponse, type NextRequest } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createUIMessageStreamResponse } from "ai";

// Get the vehicle inspection agent
const vehicleInspectionAgent = mastra.getAgent("vehicleInspectionAgent");

export async function POST(req: Request) {
  const { messages, vehicleId = "leopard2" } = await req.json();

  // Create vehicle-specific thread ID for memory isolation
  const threadId = `${vehicleId}-inspection-chat`;

  // Create request context with vehicle ID for dynamic agent instructions and tool context
  const requestContext = new RequestContext<{ vehicleId: string }>();
  requestContext.set("vehicleId", vehicleId);

  // Stream from the vehicle inspection agent with vehicle context
  const stream = await vehicleInspectionAgent.stream(messages, {
    memory: {
      thread: threadId,
      resource: "example-user-id",
    },
    requestContext,
  });

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }),
  });
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const vehicleId = searchParams.get("vehicleId") ?? "leopard2";
  const threadId = `${vehicleId}-inspection-chat`;

  const memory = await vehicleInspectionAgent.getMemory();

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
