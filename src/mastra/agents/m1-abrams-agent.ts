import { createVehicleAgent } from './create-vehicle-agent';
import { getVehicleById } from '@/lib/vehicles';
import {
  queryInspectionTool,
  getCheckpointTool,
  classifyDefectTool,
  getComponentDetailsTool,
  getMaintenanceIntervalTool,
} from '../tools';

const vehicle = getVehicleById('m1-abrams');

if (!vehicle) {
  throw new Error('M1 Abrams vehicle configuration not found');
}

// M1 Abrams uses the same inspection tools
// In the future, M1-specific tools can be added here
const m1AbramsTools = {
  queryInspectionTool,
  getCheckpointTool,
  classifyDefectTool,
  getComponentDetailsTool,
  getMaintenanceIntervalTool,
};

export const m1AbramsAgent = createVehicleAgent({
  vehicle,
  tools: m1AbramsTools,
  additionalInstructions: `## M1 Abrams Specific Knowledge

- American main battle tank manufactured by General Dynamics Land Systems
- Engine: Honeywell AGT1500 gas turbine engine producing 1500 HP
- Transmission: Allison X-1100-3B automatic transmission
- Combat weight: approximately 73.6 tonnes (M1A2 SEPv3)
- Variants: M1, M1A1, M1A2, M1A2 SEP, M1A2 SEPv2, M1A2 SEPv3, M1A2C
- Main armament: M256 120mm smoothbore gun (L/44)
- Maximum speed: 67 km/h on road, 40 km/h cross-country
- Operational range: 426 km on road

The gas turbine engine requires different maintenance procedures compared to diesel engines. Pay special attention to air filtration and fuel quality requirements.`,
});
