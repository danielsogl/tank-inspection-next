import { createVehicleAgent } from './create-vehicle-agent';
import { getVehicleById } from '@/lib/vehicles';
import {
  queryInspectionTool,
  getCheckpointTool,
  classifyDefectTool,
  getComponentDetailsTool,
  getMaintenanceIntervalTool,
} from '../tools';

const vehicle = getVehicleById('leopard2');

if (!vehicle) {
  throw new Error('Leopard 2 vehicle configuration not found');
}

// Leopard 2 specific tools - all inspection tools are applicable
const leopard2Tools = {
  queryInspectionTool,
  getCheckpointTool,
  classifyDefectTool,
  getComponentDetailsTool,
  getMaintenanceIntervalTool,
};

export const leopard2Agent = createVehicleAgent({
  vehicle,
  tools: leopard2Tools,
  additionalInstructions: `## Leopard 2 Specific Knowledge

- German main battle tank manufactured by Krauss-Maffei Wegmann
- Engine: MTU MB 873 Ka-501 diesel engine producing 1500 HP
- Transmission: RENK HSWL 354 automatic transmission
- Combat weight: approximately 62.3 tonnes (A7V variant)
- Variants: A4, A5, A6, A6M, A7, A7V
- Main armament: Rheinmetall 120mm L/55 smoothbore gun
- Maximum speed: 68 km/h on road, 50 km/h cross-country
- Operational range: 550 km on road

When providing information about the Leopard 2, always reference the specific variant if known, as specifications vary significantly between versions.`,
});
