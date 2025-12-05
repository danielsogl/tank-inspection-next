"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageCircle, X, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { VoiceButton } from "./voice-button";

interface InspectorProps {
  className?: string;
}

export function Inspector({ className }: InspectorProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div
      className={cn(
        "relative flex h-full w-full",
        "flex-col lg:flex-row",
        className
      )}
    >
      {/* Viewer Area - Placeholder for 3D Canvas */}
      <div
        className={cn(
          "flex-1 min-w-0 relative",
          "flex items-center justify-center",
          "bg-secondary rounded-lg border-2 border-border",
          "min-h-[50%] lg:min-h-0"
        )}
      >
        {/* Placeholder content */}
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Box className="h-16 w-16 opacity-50" />
          <span className="text-lg font-medium">3D Viewer</span>
          <span className="text-sm">Content area placeholder</span>
        </div>

        {/* Chat Toggle Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "absolute z-10",
                  "top-4 right-4 lg:top-4 lg:right-4",
                  "bottom-auto lg:bottom-auto",
                  "h-12 w-12 rounded-full",
                  "border-2 border-border bg-card hover:bg-muted",
                  "shadow-lg transition-all duration-200",
                  isChatOpen && "bg-primary hover:bg-primary/90 border-primary"
                )}
                onClick={() => setIsChatOpen(!isChatOpen)}
                aria-expanded={isChatOpen}
                aria-label="Toggle chat panel"
              >
                {isChatOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isChatOpen ? "Close chat" : "Open chat"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Chat Sidebar - Collapsible */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          "mt-4 lg:mt-0 lg:ml-4",
          isChatOpen
            ? "w-full lg:w-[380px] min-h-[50%] lg:min-h-0 h-auto lg:h-full opacity-100"
            : "w-0 h-0 lg:h-full opacity-0"
        )}
      >
        {isChatOpen && <ChatPanel className="h-full" />}
      </div>

      {/* Voice Button - Floating */}
      <VoiceButton
        className={cn(
          "transition-all duration-300",
          isChatOpen ? "right-[calc(380px+2rem)] lg:right-[calc(380px+2rem)]" : ""
        )}
      />
    </div>
  );
}
