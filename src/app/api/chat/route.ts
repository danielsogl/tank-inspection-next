import { mastra } from "@/mastra";
import { NextResponse } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { createUIMessageStreamResponse } from "ai";

const weatherAgent = mastra.getAgent("weatherAgent");

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await weatherAgent.stream(messages, {
    memory: {
      thread: "weather-chat",
      resource: "example-user-id",
    },
  });

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }),
  });
}

export async function GET() {
  const memory = await weatherAgent.getMemory();
  
  // Query messages from the thread
  // @ts-expect-error - Memory.query() exists in runtime but types are not yet updated in beta
  const { uiMessages } = await memory!.query({
    threadId: "weather-chat",
    resourceId: "example-user-id",
  });

  const convertedMessages = convertMessages(uiMessages).to("AIV5.UI");
  return NextResponse.json(convertedMessages);
}
