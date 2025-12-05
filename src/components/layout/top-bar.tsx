"use client";

import { useEffect, useState } from "react";
import { Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { VehicleSelector } from "./vehicle-selector";

interface TopBarProps {
  title?: string;
  className?: string;
}

export function TopBar({ title = "Vehicle Inspection", className }: TopBarProps) {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={cn(
        "flex items-center justify-between",
        "bg-card border-2 border-border rounded-lg",
        "px-4 py-3 mb-4 shrink-0",
        className
      )}
    >
      {/* Left side - Logo and Title */}
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center text-2xl">
          <Box className="h-6 w-6" />
        </span>
        <span className="text-xl font-semibold">{title}</span>
      </div>

      {/* Right side - Vehicle Selector and Clock */}
      <div className="flex items-center gap-4">
        <VehicleSelector />
        <span className="text-sm tabular-nums text-muted-foreground">
          {currentTime}
        </span>
      </div>
    </header>
  );
}
