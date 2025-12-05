import { mastra } from "@/mastra";
import { NextResponse } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { createUIMessageStreamResponse } from "ai";

const inspectionAgent = mastra.getAgent("inspectionAgent");

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await inspectionAgent.stream(messages, {
    memory: {
      thread: "inspection-chat",
      resource: "example-user-id",
    },
  });

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }),
  });
}

export async function GET() {
  const memory = await inspectionAgent.getMemory();

  const { messages } = await memory!.recall({
    threadId: "inspection-chat",
    resourceId: "example-user-id",
  });

  const convertedMessages = convertMessages(messages).to("AIV5.UI");
  return NextResponse.json(convertedMessages);
}
