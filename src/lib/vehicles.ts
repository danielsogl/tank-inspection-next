// Shared vehicle configuration used across frontend and backend

export interface VehicleConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  agentId: string;
  model: {
    rootUrl: string;
    sceneFilename: string;
  };
}

export const VEHICLES: VehicleConfig[] = [
  {
    id: "leopard2",
    name: "Leopard 2",
    description: "German main battle tank",
    type: "Main Battle Tank",
    agentId: "leopard2Agent",
    model: {
      rootUrl: "/models/",
      sceneFilename: "leopard2.obj",
    },
  },
  {
    id: "m1-abrams",
    name: "M1 Abrams",
    description: "American main battle tank",
    type: "Main Battle Tank",
    agentId: "m1AbramsAgent",
    model: {
      rootUrl: "/models/",
      sceneFilename: "leopard2.obj", // Using same model as placeholder
    },
  },
];

export const DEFAULT_VEHICLE_ID = "leopard2";

export function getVehicleById(id: string): VehicleConfig | undefined {
  return VEHICLES.find((v) => v.id === id);
}

export function getDefaultVehicle(): VehicleConfig {
  return VEHICLES.find((v) => v.id === DEFAULT_VEHICLE_ID) ?? VEHICLES[0];
}

export function getAllVehicleIds(): string[] {
  return VEHICLES.map((v) => v.id);
}
