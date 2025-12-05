"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  VEHICLES,
  getDefaultVehicle,
  type VehicleConfig,
} from "@/lib/vehicles";

interface VehicleContextValue {
  selectedVehicle: VehicleConfig;
  vehicles: VehicleConfig[];
  setSelectedVehicle: (vehicle: VehicleConfig) => void;
}

const VehicleContext = createContext<VehicleContextValue | null>(null);

interface VehicleProviderProps {
  children: ReactNode;
}

export function VehicleProvider({ children }: VehicleProviderProps) {
  const vehicles = VEHICLES;
  const [selectedVehicle, setSelectedVehicleState] = useState<VehicleConfig>(
    () => getDefaultVehicle()
  );

  const setSelectedVehicle = useCallback((vehicle: VehicleConfig) => {
    setSelectedVehicleState(vehicle);
  }, []);

  const value = useMemo(
    () => ({
      selectedVehicle,
      vehicles,
      setSelectedVehicle,
    }),
    [selectedVehicle, vehicles, setSelectedVehicle]
  );

  return (
    <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>
  );
}

export function useVehicle(): VehicleContextValue {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error("useVehicle must be used within a VehicleProvider");
  }
  return context;
}
