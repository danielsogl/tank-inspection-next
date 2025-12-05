export interface VehicleModel {
  id: string;
  name: string;
  rootUrl: string;
  sceneFilename: string;
  description?: string;
}

export const vehicleModels: VehicleModel[] = [
  {
    id: "leopard2",
    name: "Leopard 2",
    rootUrl: "/models/",
    sceneFilename: "leopard2.obj",
    description: "German main battle tank",
  },
];

export function getVehicleModel(id: string): VehicleModel | undefined {
  return vehicleModels.find((model) => model.id === id);
}

export function getDefaultVehicleModel(): VehicleModel {
  return vehicleModels[0];
}
