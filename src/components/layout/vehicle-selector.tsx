"use client";

import { useEffect, useState } from "react";
import { useVehicle } from "@/contexts/vehicle-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VehicleSelector() {
  const { selectedVehicle, vehicles, setSelectedVehicle } = useVehicle();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleValueChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
    }
  };

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted) {
    return (
      <div className="w-[180px] h-9 bg-secondary border border-border rounded-md animate-pulse" />
    );
  }

  return (
    <Select value={selectedVehicle.id} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px] bg-secondary border-border">
        <SelectValue placeholder="Select vehicle" />
      </SelectTrigger>
      <SelectContent>
        {vehicles.map((vehicle) => (
          <SelectItem key={vehicle.id} value={vehicle.id}>
            {vehicle.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
