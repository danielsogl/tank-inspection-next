"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  className?: string;
}

export function VoiceButton({ className }: VoiceButtonProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "default" : "outline"}
            size="icon"
            className={cn(
              "absolute bottom-4 right-4 z-10",
              "h-14 w-14 rounded-full",
              "shadow-lg transition-all duration-200",
              "border-2 border-border",
              isActive && "bg-primary hover:bg-primary/90 border-primary",
              className
            )}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isActive ? "Stop voice mode" : "Start voice mode"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
