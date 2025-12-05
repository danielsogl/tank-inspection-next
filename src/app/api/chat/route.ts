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
  
  // Retrieve messages from the thread using recall()
  const { messages } = await memory!.recall({
    threadId: "weather-chat",
    resourceId: "example-user-id",
  });

  const convertedMessages = convertMessages(messages).to("AIV5.UI");
  return NextResponse.json(convertedMessages);
}
