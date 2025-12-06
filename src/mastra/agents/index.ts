// Vehicle-specific agents
export { leopard2Agent } from './leopard2-agent';
export { m1AbramsAgent } from './m1-abrams-agent';

// Agent factory and registry
export { createVehicleAgent } from './create-vehicle-agent';
export {
  getVehicleAgent,
  hasVehicleAgent,
  getSupportedVehicleIds,
  vehicleAgentRegistry,
} from './registry';
