# agent-chat Spec Delta

## ADDED Requirements

### Requirement: Voice Button States

The voice button MUST provide visual feedback indicating the current voice interaction state.

#### Scenario: Idle state display
- **WHEN** no voice session is active
- **THEN** the voice button MUST display a muted microphone icon
- **AND** the button MUST use the outline variant styling

#### Scenario: Connecting state display
- **WHEN** the voice session is being established
- **THEN** the voice button MUST display a loading indicator
- **AND** the button MUST be disabled to prevent multiple connection attempts

#### Scenario: Listening state display
- **WHEN** the voice session is active and capturing user audio
- **THEN** the voice button MUST display an active microphone icon
- **AND** the button MUST use the primary variant styling with a pulsing animation
- **AND** the tooltip MUST indicate "Listening..."

#### Scenario: Thinking state display
- **WHEN** the agent is processing the user's spoken input
- **THEN** the voice button MUST display a processing indicator
- **AND** the tooltip MUST indicate "Thinking..."

#### Scenario: Responding state display
- **WHEN** the agent is speaking a response
- **THEN** the voice button MUST display a speaker/audio wave icon
- **AND** the button MUST use distinct styling to indicate audio output
- **AND** the tooltip MUST indicate "Speaking..."

### Requirement: Voice Session Management

The application MUST manage voice session lifecycle including connection, streaming, and disconnection.

#### Scenario: Start voice session
- **WHEN** the user clicks the voice button while in idle state
- **THEN** the application MUST request microphone permission if not already granted
- **AND** the application MUST establish a WebSocket connection to the voice API
- **AND** the application MUST transition to listening state upon successful connection

#### Scenario: Stop voice session during listening
- **WHEN** the user clicks the voice button while in listening state
- **THEN** the application MUST stop audio capture
- **AND** the application MUST close the WebSocket connection
- **AND** the application MUST transition to idle state

#### Scenario: Interrupt agent response
- **WHEN** the user clicks the voice button while in responding state
- **THEN** the application MUST immediately stop audio playback
- **AND** the application MUST signal the server to cancel the current response
- **AND** the application MUST transition to idle state

#### Scenario: Handle connection failure
- **WHEN** the WebSocket connection fails to establish
- **THEN** the application MUST display an error message to the user
- **AND** the application MUST transition to idle state
- **AND** the application MUST allow retry attempts

#### Scenario: Handle microphone permission denied
- **WHEN** the user denies microphone permission
- **THEN** the application MUST display a message explaining voice requires microphone access
- **AND** the application MUST remain in idle state

### Requirement: Voice Transcription Display

The application MUST display voice transcriptions in the chat panel alongside text messages.

#### Scenario: Display user speech transcription
- **WHEN** the user speaks and their speech is transcribed
- **THEN** the transcription MUST appear in the chat panel as a user message
- **AND** the message MUST be visually marked as originating from voice input

#### Scenario: Display agent voice response as text
- **WHEN** the agent responds via voice
- **THEN** the response text MUST appear in the chat panel as an assistant message
- **AND** the message MUST be visually marked as a voice response
- **AND** the text MUST appear progressively as the agent speaks

#### Scenario: Voice and text message continuity
- **WHEN** the user switches between voice and text input
- **THEN** all messages MUST appear in chronological order in the same conversation
- **AND** the conversation context MUST be maintained across input modes

### Requirement: Voice Audio Playback

The application MUST play agent voice responses through the user's audio output device.

#### Scenario: Play agent audio response
- **WHEN** the agent generates a voice response
- **THEN** the audio MUST be played through the default audio output
- **AND** playback MUST start as soon as audio data is received (streaming)

#### Scenario: Stop audio on interruption
- **WHEN** the user interrupts the agent response
- **THEN** audio playback MUST stop immediately
- **AND** any buffered audio MUST be discarded

#### Scenario: Handle audio playback errors
- **WHEN** audio playback fails
- **THEN** the application MUST continue displaying the text transcription
- **AND** the application MUST log the error for debugging

### Requirement: Voice API Endpoint

The application MUST provide a WebSocket API endpoint for real-time voice communication.

#### Scenario: WebSocket connection establishment
- **WHEN** a client connects to the voice API endpoint
- **THEN** the server MUST upgrade the HTTP connection to WebSocket
- **AND** the server MUST initialize an OpenAI Realtime voice session
- **AND** the server MUST configure the voice provider with the tank agent's tools

#### Scenario: Audio data relay to OpenAI
- **WHEN** the server receives audio data from the client
- **THEN** the server MUST forward the audio to the OpenAI Realtime API
- **AND** the audio MUST be in the expected PCM format

#### Scenario: Voice response relay to client
- **WHEN** the OpenAI Realtime API generates audio response
- **THEN** the server MUST stream the audio data to the client
- **AND** the server MUST also send text transcription events

#### Scenario: WebSocket disconnection cleanup
- **WHEN** the WebSocket connection closes
- **THEN** the server MUST close the OpenAI Realtime session
- **AND** the server MUST release all associated resources

### Requirement: Tank Agent Voice Configuration

The tank agent MUST be configured with OpenAI Realtime voice provider for speech-to-speech capability.

#### Scenario: Voice provider initialization
- **WHEN** the tank agent is used for voice interaction
- **THEN** it MUST use the OpenAI Realtime voice provider
- **AND** the voice provider MUST have access to all tank agent tools
- **AND** the voice provider MUST use server-side voice activity detection

#### Scenario: Voice provider speaker configuration
- **WHEN** the voice provider generates speech
- **THEN** it MUST use the configured voice (e.g., "alloy", "echo")
- **AND** the voice MUST be consistent throughout the session
