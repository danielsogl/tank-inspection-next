# Design: OpenAI Realtime Voice Chat

## Context

The tank inspection application has a placeholder VoiceButton component that toggles a visual state but has no actual voice functionality. Users performing physical inspections need hands-free interaction with the AI assistant. Mastra v1 beta provides `@mastra/voice-openai-realtime@beta` for real-time speech-to-speech capability using OpenAI's Realtime API over WebSockets.

### Stakeholders
- Inspectors performing tank inspections (end users)
- Frontend (Next.js React components)
- Backend (Mastra agent with voice provider)

### Constraints
- OpenAI Realtime API requires WebSocket connections
- Browser audio capture requires user permission and secure context (HTTPS)
- Audio must be processed as PCM Int16Array format for OpenAI Realtime
- Voice sessions should integrate with existing chat UI for visibility

## Goals / Non-Goals

### Goals
- Enable real-time voice conversations with the tank inspection agent
- Display both user speech transcriptions and agent responses in the chat panel
- Provide clear visual feedback for voice states (idle, listening, thinking, responding)
- Allow users to interrupt agent responses by clicking the voice button
- Integrate with existing agent tools (RAG knowledge base, checkpoint lookup, etc.)

### Non-Goals
- Push-to-talk mode (using continuous VAD instead)
- Offline voice recognition
- Multi-language support (English only for now)
- Voice authentication/speaker identification

## Decisions

### Decision 1: Server-Side Voice Provider with Client Audio Relay

**What**: The OpenAI Realtime voice provider runs on the server (Mastra agent), while the client captures/plays audio and relays it via WebSocket.

**Why**:
- Keeps API keys secure on the server
- Leverages Mastra's agent tools which are only available server-side
- Allows the voice provider to use the same tools as the text chat

**Alternatives considered**:
- Client-side direct connection to OpenAI: Would expose API keys and prevent tool usage
- Separate voice-only agent: Would duplicate tool configuration and lose context

### Decision 2: WebSocket API Route for Audio Streaming

**What**: Create a Next.js API route that upgrades HTTP connections to WebSocket for bidirectional audio streaming.

**Why**:
- WebSockets provide low-latency bidirectional communication required for real-time voice
- Next.js 14+ supports WebSocket upgrade in API routes
- Matches OpenAI Realtime API's WebSocket-based architecture

**Alternatives considered**:
- Server-Sent Events (SSE): One-directional, can't send audio from client
- Polling: Too high latency for real-time audio

### Decision 3: Web Audio API for Browser Audio Handling

**What**: Use Web Audio API with MediaRecorder for capture and AudioContext for playback.

**Why**:
- Native browser API, no additional dependencies
- Supports required audio formats (PCM)
- Works across modern browsers

**Alternatives considered**:
- Third-party audio libraries: Unnecessary complexity for basic capture/playback

### Decision 4: Voice State Machine

**What**: Implement a state machine for voice UI states: `idle` | `connecting` | `listening` | `thinking` | `responding`

**Why**:
- Clear user feedback during voice interaction
- Prevents invalid state transitions
- Simplifies UI logic

### Decision 5: Shared Message Display

**What**: Voice transcriptions appear in the same chat panel as text messages, marked with a voice indicator.

**Why**:
- Maintains conversation continuity between voice and text
- Users can review what was said/heard
- Consistent UI pattern

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │ VoiceButton  │────▶│ useRealtime  │────▶│ WebSocket Client │ │
│  │ (UI States)  │     │ Voice Hook   │     │ (Audio Stream)   │ │
│  └──────────────┘     └──────────────┘     └────────┬─────────┘ │
│         │                    │                      │           │
│         │              ┌─────▼─────┐                │           │
│         │              │ ChatPanel │                │           │
│         │              │(Messages) │                │           │
│         │              └───────────┘                │           │
└─────────│───────────────────────────────────────────│───────────┘
          │                                           │
          │ (click events)                            │ (ws://)
          ▼                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Server                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 /api/voice (WebSocket)                    │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │              OpenAIRealtimeVoice                    │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │  │   │
│  │  │  │ connect()│  │  send()  │  │  on('speaking') │   │  │   │
│  │  │  │          │  │ (audio)  │  │  on('writing')  │   │  │   │
│  │  │  └──────────┘  └──────────┘  └─────────────────┘   │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                          │                                │   │
│  │                          ▼                                │   │
│  │              ┌───────────────────────┐                   │   │
│  │              │      Tank Agent       │                   │   │
│  │              │  (tools, memory)      │                   │   │
│  │              └───────────────────────┘                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| WebSocket connection drops | Implement reconnection logic with exponential backoff |
| Browser audio permission denied | Show clear error message, fallback to text-only |
| High latency on slow networks | Use server-side VAD to reduce round trips |
| OpenAI API rate limits | Implement connection pooling and session reuse |
| Audio playback conflicts | Stop current audio when new response starts |

## Migration Plan

1. Add `@mastra/voice-openai-realtime@beta` dependency
2. Create voice API route with WebSocket support
3. Implement `useRealtimeVoice` hook
4. Update VoiceButton with state management
5. Integrate voice transcripts with ChatPanel
6. Configure tank agent with voice provider

**Rollback**: Remove voice API route and revert VoiceButton to placeholder state.

## Open Questions

- Should voice sessions persist across page reloads? (Initial answer: No, fresh session each time)
- Should we implement voice activity visualization (waveform)? (Defer to future enhancement)
- Memory/thread integration: Should voice conversations use the same thread as text chat? (Yes, for continuity)
