import { NextResponse } from "next/server";
import { VOICE_MODEL } from "@/mastra/lib/voice-config";

/**
 * Voice API endpoint that creates an ephemeral API key for OpenAI Realtime API.
 * The client uses this key with the OpenAI Agents SDK to establish a WebRTC connection.
 *
 * This approach keeps the API key secure on the server while allowing
 * real-time audio streaming directly between the client and OpenAI.
 */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Create an ephemeral client secret for the browser to connect via WebRTC
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: VOICE_MODEL,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI client secret error:", errorText);
      return NextResponse.json(
        { error: "Failed to create voice session" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Response format: { value: "ek_...", expires_at: ... }
    return NextResponse.json({
      apiKey: data.value,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    console.error("Voice session error:", error);
    return NextResponse.json(
      { error: "Failed to initialize voice session" },
      { status: 500 }
    );
  }
}
