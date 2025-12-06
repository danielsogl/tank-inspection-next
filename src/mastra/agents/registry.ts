import type { Agent } from '@mastra/core/agent';
import { leopard2Agent } from './leopard2-agent';
import { m1AbramsAgent } from './m1-abrams-agent';

/**
 * Central registry of all vehicle-specific inspection agents.
 *
 * Programmatic routing (this approach) vs Mastra Agent Networks:
 * - Zero latency: No LLM call needed for routing (~500-1000ms saved)
 * - Deterministic: Vehicle selection is known from UI
 * - Voice compatible: Works seamlessly with real-time voice
 * - Testable: Easy to unit test routing logic
 */
export const vehicleAgentRegistry: Record<string, Agent> = {
  leopard2: leopard2Agent,
  'm1-abrams': m1AbramsAgent,
};

/**
 * Get the appropriate agent for a vehicle ID.
 * Falls back to leopard2 if no agent is found.
 */
export function getVehicleAgent(vehicleId: string): Agent {
  const agent = vehicleAgentRegistry[vehicleId];
  if (!agent) {
    console.warn(
      `No agent found for vehicle: ${vehicleId}, falling back to leopard2`
    );
    return vehicleAgentRegistry.leopard2;
  }
  return agent;
}

/**
 * Check if an agent exists for a given vehicle ID.
 */
export function hasVehicleAgent(vehicleId: string): boolean {
  return vehicleId in vehicleAgentRegistry;
}

/**
 * Get all supported vehicle IDs that have agents.
 */
export function getSupportedVehicleIds(): string[] {
  return Object.keys(vehicleAgentRegistry);
}
