"use client";

import { ChevronDown } from "lucide-react";
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

  const handleValueChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
    }
  };

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
