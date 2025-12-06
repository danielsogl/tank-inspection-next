import { NextResponse } from "next/server";
import { getVehicleById } from "@/lib/vehicles";

/**
 * Voice API endpoint that creates an ephemeral token for OpenAI Realtime API.
 * The client uses this token to establish a direct WebSocket connection to OpenAI.
 *
 * This approach keeps the API key secure on the server while allowing
 * real-time audio streaming directly between the client and OpenAI.
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  // Get vehicle ID from request body
  const body = await req.json().catch(() => ({}));
  const vehicleId = body.vehicleId || "leopard2";
  const vehicle = getVehicleById(vehicleId);

  const vehicleName = vehicle?.name || "military vehicle";
  const vehicleType = vehicle?.type || "combat vehicle";

  try {
    // Create an ephemeral token for the client to connect to OpenAI Realtime
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime",
        voice: "alloy",
        instructions: `You are a specialized inspection expert for the ${vehicleName} ${vehicleType}. Assist inspectors with technical information about components, maintenance procedures, and specifications.

## Guidelines

- Be precise and technical when discussing specifications
- Provide metric measurements
- Highlight safety considerations where relevant
- Keep voice responses concise and clear
- When defects are reported, classify their severity and provide the escalation path
- For complex questions, provide brief summaries suitable for voice interaction`,
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Realtime session error:", errorText);
      return NextResponse.json(
        { error: "Failed to create voice session" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.client_secret?.value,
      expiresAt: data.client_secret?.expires_at,
      vehicleId,
    });
  } catch (error) {
    console.error("Voice session error:", error);
    return NextResponse.json(
      { error: "Failed to initialize voice session" },
      { status: 500 }
    );
  }
}
