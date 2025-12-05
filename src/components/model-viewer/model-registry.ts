import {
  VEHICLES,
  getVehicleById,
  getDefaultVehicle,
  type VehicleConfig,
} from "@/lib/vehicles";

// Re-export VehicleConfig as VehicleModel for backwards compatibility
export type VehicleModel = VehicleConfig;

// Map VehicleConfig to the format expected by ModelViewer
export interface VehicleModelView {
  id: string;
  name: string;
  rootUrl: string;
  sceneFilename: string;
  description?: string;
  agentId: string;
}

function toVehicleModelView(config: VehicleConfig): VehicleModelView {
  return {
    id: config.id,
    name: config.name,
    rootUrl: config.model.rootUrl,
    sceneFilename: config.model.sceneFilename,
    description: config.description,
    agentId: config.agentId,
  };
}

export function getVehicleModel(id: string): VehicleModelView | undefined {
  const config = getVehicleById(id);
  return config ? toVehicleModelView(config) : undefined;
}

export function getDefaultVehicleModel(): VehicleModelView {
  return toVehicleModelView(getDefaultVehicle());
}

export function getAllVehicles(): VehicleModelView[] {
  return VEHICLES.map(toVehicleModelView);
}
