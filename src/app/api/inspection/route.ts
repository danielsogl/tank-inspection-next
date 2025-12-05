import { mastra } from "@/mastra";
import { NextResponse, type NextRequest } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createUIMessageStreamResponse } from "ai";

const inspectionAgent = mastra.getAgent("inspectionAgent");

export async function POST(req: Request) {
  const { messages, vehicleId = "leopard2" } = await req.json();

  // Create vehicle-specific thread ID for memory isolation
  const threadId = `${vehicleId}-inspection-chat`;

  // Create RequestContext with vehicleId
  const requestContext = new RequestContext<{ vehicleId: string }>();
  requestContext.set("vehicleId", vehicleId);

  const stream = await inspectionAgent.stream(messages, {
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

  const memory = await inspectionAgent.getMemory();

  const { messages } = await memory!.recall({
    threadId,
    resourceId: "example-user-id",
  });

  const convertedMessages = convertMessages(messages).to("AIV5.UI");
  return NextResponse.json(convertedMessages);
}
