# Change: Add OpenAI Realtime Voice Chat

## Why

Users need a hands-free way to interact with the tank inspection agent while performing physical inspections. Voice interaction enables inspectors to ask questions and receive answers without interrupting their workflow. The existing voice button is a placeholder with no functionality.

## What Changes

- Integrate `@mastra/voice-openai-realtime@beta` package for real-time speech-to-speech capability
- Create a server-side API endpoint to establish WebSocket connections for OpenAI Realtime
- Implement client-side audio capture and playback using Web Audio API
- Enhance the VoiceButton component with state indicators (listening, thinking, responding)
- Display transcribed user speech and agent responses in the chat panel
- Support voice session interruption when user clicks the voice button during agent response
- Configure the tank agent with OpenAI Realtime voice provider

## Impact

- Affected specs: `agent-chat`
- Affected code:
  - `src/components/inspector/voice-button.tsx` (enhance with voice states and WebSocket connection)
  - `src/components/inspector/chat-panel.tsx` (display voice transcripts in conversation)
  - `src/mastra/agents/tank-agent.ts` (add voice provider configuration)
  - `src/app/api/voice/route.ts` (new - WebSocket proxy for OpenAI Realtime)
  - `src/hooks/use-realtime-voice.ts` (new - React hook for voice session management)
  - `package.json` (add `@mastra/voice-openai-realtime@beta` dependency)
