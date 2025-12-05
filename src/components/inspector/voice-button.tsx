"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type VoiceState, type VoiceMessage } from "@/hooks/use-realtime-voice";

interface VoiceButtonProps {
  className?: string;
  state: VoiceState;
  onStart: () => void;
  onStop: () => void;
  onInterrupt: () => void;
}

const stateConfig: Record<
  VoiceState,
  {
    icon: React.ComponentType<{ className?: string }>;
    tooltip: string;
    variant: "default" | "outline";
    animate?: boolean;
  }
> = {
  idle: {
    icon: MicOff,
    tooltip: "Start voice mode",
    variant: "outline",
  },
  connecting: {
    icon: Loader2,
    tooltip: "Connecting...",
    variant: "outline",
    animate: true,
  },
  listening: {
    icon: Mic,
    tooltip: "Listening...",
    variant: "default",
    animate: true,
  },
  thinking: {
    icon: Loader2,
    tooltip: "Thinking...",
    variant: "default",
    animate: true,
  },
  responding: {
    icon: Volume2,
    tooltip: "Speaking... (click to interrupt)",
    variant: "default",
    animate: true,
  },
};

export function VoiceButton({
  className,
  state,
  onStart,
  onStop,
  onInterrupt,
}: VoiceButtonProps) {
  const config = stateConfig[state];
  const Icon = config.icon;
  const isActive = state !== "idle";
  const isDisabled = state === "connecting";

  const handleClick = () => {
    switch (state) {
      case "idle":
        onStart();
        break;
      case "responding":
        onInterrupt();
        break;
      case "listening":
      case "thinking":
        onStop();
        break;
      // connecting state is disabled
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={config.variant}
            size="icon"
            disabled={isDisabled}
            className={cn(
              "z-10",
              "h-14 w-14 rounded-full",
              "shadow-lg transition-all duration-200",
              "border-2 border-border bg-card hover:bg-muted",
              isActive && "bg-primary hover:bg-primary/90 border-primary",
              state === "listening" && "animate-pulse",
              state === "responding" && "bg-green-600 hover:bg-green-700 border-green-600",
              className
            )}
            onClick={handleClick}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                config.animate && state === "connecting" && "animate-spin",
                config.animate && state === "thinking" && "animate-spin"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{config.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Re-export types for convenience
export type { VoiceState, VoiceMessage };
