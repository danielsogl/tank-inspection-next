"use client";

import { RealtimeAgent, RealtimeSession } from "@openai/agents-realtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_INSTRUCTIONS, VOICE_MODEL } from "@/mastra/lib/voice-config";

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "responding"
  | "paused";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isVoice: boolean;
  timestamp: Date;
}

interface UseRealtimeVoiceOptions {
  onMessage?: (message: VoiceMessage) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: VoiceState) => void;
}

interface UseRealtimeVoiceReturn {
  state: VoiceState;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  disconnect: () => void;
  interrupt: () => void;
}

/**
 * React hook for real-time voice interaction using OpenAI Agents SDK.
 *
 * The SDK automatically handles:
 * - Microphone capture
 * - Audio playback
 * - WebRTC connection (in browser)
 * - Audio encoding/decoding
 */
export function useRealtimeVoice(
  options: UseRealtimeVoiceOptions = {},
): UseRealtimeVoiceReturn {
  const { onMessage, onError, onStateChange } = options;

  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<RealtimeSession | null>(null);

  // Update state and notify
  const updateState = useCallback(
    (newState: VoiceState) => {
      setState(newState);
      onStateChange?.(newState);
    },
    [onStateChange],
  );

  // Start or resume voice session
  const start = useCallback(async () => {
    // If paused, just unmute to resume
    if (state === "paused" && sessionRef.current) {
      sessionRef.current.mute(false);
      updateState("listening");
      return;
    }

    // Only start new session from idle state
    if (state !== "idle") {
      return;
    }

    setError(null);
    updateState("connecting");

    try {
      // Get ephemeral API key from our backend
      const tokenResponse = await fetch("/api/voice", { method: "POST" });
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || "Failed to get voice session token");
      }

      const { apiKey } = await tokenResponse.json();
      if (!apiKey) {
        throw new Error("No API key received from server");
      }

      // Create agent with tank inspection instructions
      const agent = new RealtimeAgent({
        name: "Tank Inspector",
        instructions: VOICE_INSTRUCTIONS,
      });

      // Create session - automatically handles audio I/O in browser
      const session = new RealtimeSession(agent, {
        model: VOICE_MODEL,
      });
      sessionRef.current = session;

      // Listen for transport events to track state and transcripts
      // The '*' event receives a single TransportEvent object with a 'type' property
      session.transport.on("*", (event) => {
        // Handle state changes based on Realtime API events
        switch (event.type) {
          case "input_audio_buffer.speech_started":
            updateState("listening");
            break;

          case "input_audio_buffer.speech_stopped":
            updateState("thinking");
            break;

          case "response.created":
            updateState("responding");
            break;

          case "response.done":
            updateState("listening");
            break;

          // User's transcribed speech
          case "conversation.item.input_audio_transcription.completed":
            if (event.transcript) {
              onMessage?.({
                id: event.item_id || crypto.randomUUID(),
                role: "user",
                content: event.transcript,
                isVoice: true,
                timestamp: new Date(),
              });
            }
            break;

          // Assistant's transcribed response
          case "response.output_audio_transcript.done":
            if ("transcript" in event && event.transcript) {
              onMessage?.({
                id: crypto.randomUUID(),
                role: "assistant",
                content: event.transcript as string,
                isVoice: true,
                timestamp: new Date(),
              });
            }
            break;

          case "error": {
            const errorMessage =
              (event.error as { message?: string })?.message ||
              "An error occurred";
            setError(errorMessage);
            onError?.(errorMessage);
            break;
          }
        }
      });

      // Connect - automatically starts microphone and speaker in browser
      await session.connect({ apiKey });
      updateState("listening");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start voice session";
      setError(errorMessage);
      onError?.(errorMessage);
      updateState("idle");
    }
  }, [state, updateState, onMessage, onError]);

  // Pause voice session (mute but keep connection alive)
  const stop = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.mute(true);
      // Also interrupt any ongoing response
      sessionRef.current.interrupt();
    }
    updateState("paused");
  }, [updateState]);

  // Fully disconnect the voice session
  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    updateState("idle");
  }, [updateState]);

  // Interrupt current response
  const interrupt = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.interrupt();
    }
    updateState("listening");
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
    };
  }, []);

  return {
    state,
    error,
    start,
    stop,
    disconnect,
    interrupt,
  };
}
