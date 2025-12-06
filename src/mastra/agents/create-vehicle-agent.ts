import { Agent, type AgentConfig } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import type { VehicleConfig } from '@/lib/vehicles';
import {
  inputModerationProcessor,
  tokenLimiterProcessor,
} from '../processors';
import {
  getMemoryStorage,
  getMemoryVectorStore,
  memoryEmbedder,
} from '../lib/memory';
import { AGENT_MODEL, VOICE_MODEL, VOICE_SPEAKER } from '../lib/models';

/**
 * Creates a Memory instance with semantic recall if vector store is available.
 * Falls back to basic lastMessages-only memory otherwise.
 */
function createMemoryWithSemanticRecall(): Memory {
  const storage = getMemoryStorage();
  const vectorStore = getMemoryVectorStore();

  if (vectorStore) {
    return new Memory({
      storage,
      vector: vectorStore,
      embedder: memoryEmbedder,
      options: {
        lastMessages: 20,
        semanticRecall: {
          topK: 3,
          messageRange: { before: 2, after: 1 },
          scope: 'thread',
        },
      },
    });
  }

  // Fallback: No semantic recall if vector store not configured
  return new Memory({
    storage,
    options: {
      lastMessages: 20,
    },
  });
}

interface CreateVehicleAgentOptions {
  vehicle: VehicleConfig;
  tools: AgentConfig['tools'];
  additionalInstructions?: string;
  /** Enable guardrails (moderation, token limits). Defaults to true. */
  enableGuardrails?: boolean;
}

/**
 * Creates a shared voice provider configuration for real-time speech-to-speech.
 * Each agent gets its own instance to avoid state conflicts.
 */
function createVoiceProvider(): OpenAIRealtimeVoice {
  const voice = new OpenAIRealtimeVoice({
    model: VOICE_MODEL,
    speaker: VOICE_SPEAKER,
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
  enableGuardrails = true,
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
    model: AGENT_MODEL,
    tools,
    // Memory with semantic recall when vector store is available
    memory: createMemoryWithSemanticRecall(),
    voice: createVoiceProvider(),
    // Guardrails: input moderation and output token limiting
    ...(enableGuardrails && {
      inputProcessors: [inputModerationProcessor],
      outputProcessors: [tokenLimiterProcessor],
    }),
  });
}
