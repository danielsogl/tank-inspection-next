# Tasks: Add OpenAI Realtime Voice Chat

## 1. Dependencies & Configuration

- [x] 1.1 Install `@mastra/voice-openai-realtime@beta` package
- [x] 1.2 Verify `OPENAI_API_KEY` environment variable is available for realtime API

## 2. Voice API Endpoint

- [x] 2.1 Create `/api/voice/route.ts` with ephemeral token generation for client-side WebSocket
- [x] 2.2 Initialize OpenAI Realtime session with tank agent instructions
- [x] 2.3 Configure voice provider settings (VAD, speaker, transcription)
- [x] 2.4 Client connects directly to OpenAI Realtime API using ephemeral token
- [x] 2.5 Audio streaming handled directly between client and OpenAI
- [x] 2.6 Text transcription events forwarded via WebSocket events
- [x] 2.7 Handle WebSocket disconnection and cleanup in client hook

## 3. Client-Side Voice Hook

- [x] 3.1 Create `src/hooks/use-realtime-voice.ts` hook
- [x] 3.2 Implement WebSocket connection management to OpenAI Realtime API
- [x] 3.3 Implement microphone access and audio capture using Web Audio API (AudioWorklet)
- [x] 3.4 Implement audio playback for agent responses (24kHz PCM)
- [x] 3.5 Implement voice state machine (idle, connecting, listening, thinking, responding)
- [x] 3.6 Expose transcription events for chat integration via onMessage callback
- [x] 3.7 Implement session interruption (stop capture/playback, cancel response)
- [x] 3.8 Handle errors (connection failure, permission denied)

## 4. Voice Button Enhancement

- [x] 4.1 Integrate `useRealtimeVoice` hook into VoiceButton component via props
- [x] 4.2 Implement visual states for each voice state (icons, colors, animations)
- [x] 4.3 Update tooltip content based on current state
- [x] 4.4 Handle click actions for state transitions (start, stop, interrupt)
- [x] 4.5 Add loading/disabled state during connection

## 5. Chat Panel Integration

- [x] 5.1 Accept voice transcription events from parent Inspector component
- [x] 5.2 Display user speech transcriptions as user messages with voice indicator
- [x] 5.3 Display agent voice responses as assistant messages with voice indicator
- [x] 5.4 Add visual indicator (Mic icon) for voice-originated messages
- [x] 5.5 Ensure voice messages integrate with existing message history (sorted by timestamp)

## 6. Tank Agent Voice Configuration

- [x] 6.1 Import and configure OpenAIRealtimeVoice in tank-agent.ts
- [x] 6.2 Configure voice activity detection settings
- [x] 6.3 Set default speaker voice (alloy)

## 7. Testing & Validation

- [x] 7.1 TypeScript compilation passes (npx tsc --noEmit)
- [x] 7.2 Production build passes (npm run build)
- [ ] 7.3 Test microphone permission flow (manual testing required)
- [ ] 7.4 Test voice session start/stop cycle (manual testing required)
- [ ] 7.5 Test agent response interruption (manual testing required)
- [ ] 7.6 Test transcription display in chat (manual testing required)
- [ ] 7.7 Test voice/text message interleaving (manual testing required)
- [ ] 7.8 Test connection error handling (manual testing required)
- [ ] 7.9 Test audio playback on different browsers (manual testing required)
