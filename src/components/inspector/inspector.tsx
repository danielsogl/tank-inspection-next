"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { VoiceButton } from "./voice-button";

// Dynamic import for ModelViewer to disable SSR (Babylon.js requires browser APIs)
const ModelViewer = dynamic(
  () => import("@/components/model-viewer").then((mod) => mod.ModelViewer),
  { ssr: false }
);

interface InspectorProps {
  className?: string;
}

export function Inspector({ className }: InspectorProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const handleMeshClick = useCallback((meshName: string) => {
    setSelectedPart(meshName);
    // Open chat panel when a part is clicked
    setIsChatOpen(true);
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-full w-full overflow-hidden",
        "flex-col lg:flex-row",
        className
      )}
    >
      {/* Viewer Area - 3D Model Canvas */}
      <div
        className={cn(
          "relative min-w-0",
          "bg-secondary rounded-lg border-2 border-border overflow-hidden",
          // When chat is closed on mobile, take full height. When open, share height.
          isChatOpen ? "flex-1 min-h-[40%]" : "flex-1",
          // On large screens, always take remaining space
          "lg:flex-1 lg:h-full"
        )}
      >
        {/* 3D Model Viewer */}
        <ModelViewer
          className="w-full h-full"
          onMeshClick={handleMeshClick}
        />

        {/* Chat Toggle Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "absolute z-10",
                  "top-4 right-4",
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

        {/* Voice Button - Inside viewer area */}
        <VoiceButton className="absolute bottom-4 right-4" />
      </div>

      {/* Chat Sidebar - Collapsible */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          "mt-4 lg:mt-0 lg:ml-4",
          isChatOpen
            ? "w-full lg:w-[380px] flex-1 lg:flex-none h-auto lg:h-full opacity-100"
            : "w-0 h-0 opacity-0 pointer-events-none"
        )}
      >
        {isChatOpen && (
          <ChatPanel
            className="h-full"
            selectedPart={selectedPart}
            onPartHandled={() => setSelectedPart(null)}
          />
        )}
      </div>
    </div>
  );
}
