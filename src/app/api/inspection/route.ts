import { mastra } from "@/mastra";
import { NextResponse, type NextRequest } from "next/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

// Get the vehicle inspection agent
const vehicleInspectionAgent = mastra.getAgent("vehicleInspectionAgent");

/** Generic refusal message - don't reveal security detection details */
const REFUSAL_MESSAGE =
  "I'm sorry, but I can't help with that request. Please ask a question about vehicle inspection, maintenance, or specifications.";

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

  // Use createUIMessageStream to intercept and sanitize security details
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const aiSdkStream = toAISdkStream(stream, { from: "agent" });
      const reader = aiSdkStream.getReader();

      try {
        while (true) {
          const { done, value: part } = await reader.read();
          if (done) break;

          // Check for tripwire (security block) - hide details from client
          // Type is "data-tripwire" (template literal type `data-${string}`)
          if (part.type === "data-tripwire") {
            // Replace with generic refusal - don't expose security details
            writer.write({
              type: "text-delta",
              delta: REFUSAL_MESSAGE,
              id: "refusal",
            });
            break; // Stop processing
          }

          writer.write(part);
        }
      } finally {
        reader.releaseLock();
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
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
