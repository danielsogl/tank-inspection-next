"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  getDefaultVehicle,
  VEHICLES,
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
    () => getDefaultVehicle(),
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
    [selectedVehicle, vehicles, setSelectedVehicle],
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
