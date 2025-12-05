"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "responding";

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
  interrupt: () => void;
}

export function useRealtimeVoice(
  options: UseRealtimeVoiceOptions = {}
): UseRealtimeVoiceReturn {
  const { onMessage, onError, onStateChange } = options;

  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentResponseIdRef = useRef<string | null>(null);
  const currentTranscriptRef = useRef<string>("");

  // Update state and notify
  const updateState = useCallback(
    (newState: VoiceState) => {
      setState(newState);
      onStateChange?.(newState);
    },
    [onStateChange]
  );

  // Convert Float32Array to Int16Array for sending to OpenAI
  const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  // Convert Int16Array to Float32Array for playback
  const int16ToFloat32 = (int16Array: Int16Array): Float32Array => {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
    }
    return float32Array;
  };

  // Base64 encode Int16Array
  const encodeAudioData = (int16Array: Int16Array): string => {
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  };

  // Base64 decode to Int16Array
  const decodeAudioData = (base64: string): Int16Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  };

  // Play audio from queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    const audioContext = audioContextRef.current;

    if (!audioContext) {
      isPlayingRef.current = false;
      return;
    }

    while (playbackQueueRef.current.length > 0) {
      const audioData = playbackQueueRef.current.shift()!;
      const float32Data = int16ToFloat32(audioData);

      // OpenAI Realtime API outputs 24kHz audio
      const audioBuffer = audioContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;

    // If we finished playing and no more audio, we may return to listening
    if (state === "responding" && playbackQueueRef.current.length === 0) {
      updateState("listening");
    }
  }, [state, updateState]);

  // Stop all audio playback
  const stopPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // Handle WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "session.created":
            updateState("listening");
            break;

          case "input_audio_buffer.speech_started":
            // User started speaking - clear any pending playback
            stopPlayback();
            if (state === "responding") {
              // Interrupt the response
              wsRef.current?.send(JSON.stringify({ type: "response.cancel" }));
            }
            updateState("listening");
            break;

          case "input_audio_buffer.speech_stopped":
            updateState("thinking");
            break;

          case "conversation.item.input_audio_transcription.completed":
            // User's speech was transcribed
            if (data.transcript) {
              const message: VoiceMessage = {
                id: data.item_id || crypto.randomUUID(),
                role: "user",
                content: data.transcript,
                isVoice: true,
                timestamp: new Date(),
              };
              onMessage?.(message);
            }
            break;

          case "response.created":
            currentResponseIdRef.current = data.response?.id;
            currentTranscriptRef.current = "";
            updateState("responding");
            break;

          case "response.audio.delta":
            // Audio chunk received
            if (data.delta) {
              const audioData = decodeAudioData(data.delta);
              playbackQueueRef.current.push(audioData);
              playNextAudio();
            }
            break;

          case "response.audio_transcript.delta":
            // Progressive transcript of assistant's response
            if (data.delta) {
              currentTranscriptRef.current += data.delta;
            }
            break;

          case "response.audio_transcript.done":
          case "response.done":
            // Response completed - emit the full transcript as a message
            if (currentTranscriptRef.current) {
              const message: VoiceMessage = {
                id: currentResponseIdRef.current || crypto.randomUUID(),
                role: "assistant",
                content: currentTranscriptRef.current,
                isVoice: true,
                timestamp: new Date(),
              };
              onMessage?.(message);
              currentTranscriptRef.current = "";
            }
            break;

          case "error":
            const errorMessage = data.error?.message || "An error occurred";
            setError(errorMessage);
            onError?.(errorMessage);
            break;
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    },
    [onMessage, onError, state, updateState, stopPlayback, playNextAudio]
  );

  // Start voice session
  const start = useCallback(async () => {
    if (state !== "idle") {
      return;
    }

    setError(null);
    updateState("connecting");

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // Get ephemeral token from our API
      const tokenResponse = await fetch("/api/voice", { method: "POST" });
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || "Failed to get voice session token");
      }

      const { token } = await tokenResponse.json();
      if (!token) {
        throw new Error("No token received from server");
      }

      // Create AudioContext for both capture and playback
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Connect to OpenAI Realtime API
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        ["realtime", `openai-insecure-api-key.${token}`, "openai-beta.realtime-v1"]
      );
      wsRef.current = ws;

      ws.onopen = () => {
        // Session will be configured by the server based on our API call
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        const errorMessage = "WebSocket connection error";
        setError(errorMessage);
        onError?.(errorMessage);
        updateState("idle");
      };

      ws.onclose = () => {
        updateState("idle");
      };

      // Set up audio capture using AudioWorklet
      await audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
              class AudioProcessor extends AudioWorkletProcessor {
                constructor() {
                  super();
                  this.buffer = [];
                }

                process(inputs) {
                  const input = inputs[0];
                  if (input.length > 0) {
                    const channelData = input[0];
                    // Accumulate samples
                    for (let i = 0; i < channelData.length; i++) {
                      this.buffer.push(channelData[i]);
                    }

                    // Send chunks of ~100ms (2400 samples at 24kHz)
                    if (this.buffer.length >= 2400) {
                      this.port.postMessage(new Float32Array(this.buffer));
                      this.buffer = [];
                    }
                  }
                  return true;
                }
              }

              registerProcessor('audio-processor', AudioProcessor);
            `,
            ],
            { type: "application/javascript" }
          )
        )
      );

      const workletNode = new AudioWorkletNode(audioContext, "audio-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const int16Data = floatTo16BitPCM(event.data);
          const base64Audio = encodeAudioData(int16Data);

          wsRef.current.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio,
            })
          );
        }
      };

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      sourceNode.connect(workletNode);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start voice session";
      setError(errorMessage);
      onError?.(errorMessage);
      updateState("idle");
      cleanup();
    }
  }, [state, updateState, onError, handleMessage]);

  // Cleanup resources
  const cleanup = useCallback(() => {
    stopPlayback();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    currentTranscriptRef.current = "";
    currentResponseIdRef.current = null;
  }, [stopPlayback]);

  // Stop voice session
  const stop = useCallback(() => {
    cleanup();
    updateState("idle");
  }, [cleanup, updateState]);

  // Interrupt current response
  const interrupt = useCallback(() => {
    stopPlayback();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "response.cancel" }));
    }

    updateState("listening");
  }, [stopPlayback, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    error,
    start,
    stop,
    interrupt,
  };
}
