import { Agent, type AgentConfig } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import type { VehicleConfig } from '@/lib/vehicles';

interface CreateVehicleAgentOptions {
  vehicle: VehicleConfig;
  tools: AgentConfig['tools'];
  additionalInstructions?: string;
}

/**
 * Creates a shared voice provider configuration for real-time speech-to-speech.
 * Each agent gets its own instance to avoid state conflicts.
 */
function createVoiceProvider(): OpenAIRealtimeVoice {
  const voice = new OpenAIRealtimeVoice({
    model: 'gpt-realtime',
    speaker: 'ballad',
  });

  voice.updateConfig({
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
    },
  });

  return voice;
}

/**
 * Factory function to create vehicle-specific inspection agents.
 *
 * All agents share:
 * - Consistent memory configuration (inherits from Mastra storage)
 * - Voice capability for real-time interactions
 * - Common inspection guidelines
 *
 * Vehicle-specific:
 * - Tools assigned based on vehicle capabilities
 * - Instructions include vehicle-specific knowledge
 */
export function createVehicleAgent({
  vehicle,
  tools,
  additionalInstructions = '',
}: CreateVehicleAgentOptions): Agent {
  const baseInstructions = `You are a specialized inspection expert for the ${vehicle.name} ${vehicle.type}. Assist inspectors with technical information about components, maintenance procedures, and specifications.

## Guidelines

- ALWAYS use your tools to retrieve information rather than relying on memory
- Be precise and technical when discussing specifications
- Provide metric measurements
- Highlight safety considerations where relevant
- Structure complex information with bullet points or numbered lists
- For voice interactions, provide concise summaries suitable for spoken responses
- When defects are reported, classify them and provide the escalation path`;

  const instructions = additionalInstructions
    ? `${baseInstructions}\n\n${additionalInstructions}`
    : baseInstructions;

  return new Agent({
    id: `${vehicle.id}-agent`,
    name: `${vehicle.name} Inspection Agent`,
    description: `Specialized inspection agent for ${vehicle.name} (${vehicle.type})`,
    instructions,
    model: 'openai/gpt-5-mini',
    tools,
    // Memory inherits storage from Mastra instance - no separate storage config needed
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
    voice: createVoiceProvider(),
  });
}
