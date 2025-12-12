"use client";

import { MessageCircle, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";

// Dynamic import for ModelViewer to disable SSR (Babylon.js requires browser APIs)
const ModelViewer = dynamic(
  () => import("@/components/model-viewer").then((mod) => mod.ModelViewer),
  { ssr: false },
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
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {/* Viewer Area - 3D Model Canvas - Always full size */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-secondary rounded-lg border-2 border-border overflow-hidden",
        )}
      >
        {/* 3D Model Viewer */}
        <ModelViewer className="w-full h-full" onMeshClick={handleMeshClick} />

        {/* Chat Toggle Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "absolute z-30",
                  "top-4",
                  isChatOpen ? "right-[396px]" : "right-4",
                  "h-12 w-12 rounded-full",
                  "border-2 border-border bg-card hover:bg-muted",
                  "shadow-lg transition-all duration-300",
                  isChatOpen && "bg-primary hover:bg-primary/90 border-primary",
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

      {/* Chat Sidebar - Overlay positioned */}
      <div
        className={cn(
          "absolute z-20 transition-all duration-300 ease-in-out",
          "top-0 bottom-0 right-0",
          "lg:w-[380px] w-full max-w-[380px]",
          isChatOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none",
        )}
      >
        <ChatPanel
          className="h-full"
          selectedPart={selectedPart}
          onPartHandled={() => setSelectedPart(null)}
        />
      </div>
    </div>
  );
}
