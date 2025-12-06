"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { MessageCircle, Trash2, Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { useVehicle } from "@/contexts/vehicle-context";
import { useRealtimeVoice, type VoiceMessage, type VoiceState } from "@/hooks/use-realtime-voice";
import { toast } from "sonner";

interface ChatPanelProps {
  className?: string;
  selectedPart?: string | null;
  onPartHandled?: () => void;
}

// Combined message type for unified display
interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isVoice: boolean;
  timestamp: Date;
  parts?: any[];
}

// Voice button configuration for different states
const voiceStateConfig: Record<
  VoiceState,
  {
    icon: React.ComponentType<{ className?: string }>;
    tooltip: string;
    animate?: boolean;
  }
> = {
  idle: {
    icon: MicOff,
    tooltip: "Start voice mode",
  },
  connecting: {
    icon: Loader2,
    tooltip: "Connecting...",
    animate: true,
  },
  listening: {
    icon: Mic,
    tooltip: "Listening... (click to pause)",
    animate: true,
  },
  thinking: {
    icon: Loader2,
    tooltip: "Thinking...",
    animate: true,
  },
  responding: {
    icon: Volume2,
    tooltip: "Speaking... (click to interrupt)",
    animate: true,
  },
  paused: {
    icon: MicOff,
    tooltip: "Voice paused (click to resume)",
  },
};

export function ChatPanel({
  className,
  selectedPart,
  onPartHandled,
}: ChatPanelProps) {
  const [input, setInput] = useState<string>("");
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const { selectedVehicle } = useVehicle();
  const previousVehicleIdRef = useRef(selectedVehicle.id);

  // Voice message handler
  const handleVoiceMessage = useCallback((message: VoiceMessage) => {
    setVoiceMessages((prev) => [...prev, message]);
  }, []);

  // Voice error handler
  const handleVoiceError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  // Realtime voice hook
  const {
    state: voiceState,
    start: startVoice,
    stop: stopVoice,
    interrupt: interruptVoice,
  } = useRealtimeVoice({
    onMessage: handleVoiceMessage,
    onError: handleVoiceError,
  });

  const isVoiceActive = voiceState !== "idle" && voiceState !== "paused";
  const isVoicePaused = voiceState === "paused";
  const isVoiceConnecting = voiceState === "connecting";

  // When a part is selected, pre-fill the input with a question about it
  useEffect(() => {
    if (selectedPart) {
      setInput(`Tell me about the "${selectedPart}" part of the ${selectedVehicle.name}.`);
      onPartHandled?.();
    }
  }, [selectedPart, onPartHandled, selectedVehicle.name]);

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/inspection",
      body: { vehicleId: selectedVehicle.id },
    }),
  });

  // Clear chat when vehicle changes
  useEffect(() => {
    if (previousVehicleIdRef.current !== selectedVehicle.id) {
      setMessages([]);
      setVoiceMessages([]);
      previousVehicleIdRef.current = selectedVehicle.id;
    }
  }, [selectedVehicle.id, setMessages]);

  const handleClearChat = () => {
    setMessages([]);
    setVoiceMessages([]);
  };

  // Handle voice button click
  const handleVoiceClick = () => {
    switch (voiceState) {
      case "idle":
      case "paused":
        startVoice();
        break;
      case "responding":
        interruptVoice();
        break;
      case "listening":
      case "thinking":
        stopVoice();
        break;
      // connecting state is disabled
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  // Combine text chat messages and voice messages, sorted by timestamp
  const allMessages = useMemo((): DisplayMessage[] => {
    // Convert text chat messages to display format
    const textMessages: DisplayMessage[] = messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.parts?.find((p: any) => p.type === "text")?.text || "",
      isVoice: false,
      timestamp: new Date(msg.createdAt || Date.now()),
      parts: msg.parts,
    }));

    // Convert voice messages to display format
    const voiceDisplayMessages: DisplayMessage[] = voiceMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      isVoice: true,
      timestamp: msg.timestamp,
      parts: [{ type: "text", text: msg.content }],
    }));

    // Combine and sort by timestamp
    return [...textMessages, ...voiceDisplayMessages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }, [messages, voiceMessages]);

  const hasMessages = allMessages.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "bg-secondary rounded-lg border-2 border-border overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="h-8 w-8 hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="p-4">
          {!hasMessages ? (
            <ConversationEmptyState
              icon={<MessageCircle className="h-12 w-12" />}
              title="Start a conversation"
              description={`Ask questions about the ${selectedVehicle.name} inspection`}
            />
          ) : (
            <>
              {allMessages.map((message) => (
                <div key={message.id}>
                  {message.parts?.map((part: any, i: number) => {
                    if (part.type === "text") {
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            {message.role === "user" ? (
                              <div className="flex items-start gap-2">
                                {message.isVoice && (
                                  <Mic className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                )}
                                <span>{part.text}</span>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                {message.isVoice && (
                                  <Mic className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                )}
                                <MessageResponse>{part.text}</MessageResponse>
                              </div>
                            )}
                          </MessageContent>
                        </Message>
                      );
                    }
                    // Handle tool parts (type starts with "tool-" or is "dynamic-tool")
                    if (part.type?.startsWith("tool-") || part.type === "dynamic-tool") {
                      return (
                        <Tool key={`${message.id}-${i}`} className="my-2">
                          <ToolHeader
                            title={part.toolName}
                            type={part.type}
                            state={part.state}
                          />
                          <ToolContent>
                            <ToolInput input={part.input} />
                            <ToolOutput
                              output={part.output}
                              errorText={part.errorText}
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
              {/* Thinking indicator - shows while agent is processing */}
              {(status === "submitted" || (status === "streaming" && (() => {
                const lastMessage = messages[messages.length - 1];
                const hasAssistantText = lastMessage?.role === "assistant" &&
                  lastMessage?.parts?.some((p: any) => p.type === "text" && p.text?.length > 0);
                return !hasAssistantText;
              })())) && (
                <Message from="assistant">
                  <MessageContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card shrink-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            {/* Voice state indicator */}
            {(isVoiceActive || isVoicePaused) && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border-b border-border">
                {voiceState === "listening" && (
                  <>
                    <Mic className="h-4 w-4 text-primary animate-pulse" />
                    <span>Listening...</span>
                  </>
                )}
                {voiceState === "thinking" && (
                  <>
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    <span>Thinking...</span>
                  </>
                )}
                {voiceState === "responding" && (
                  <>
                    <Volume2 className="h-4 w-4 text-green-600 animate-pulse" />
                    <span>Speaking...</span>
                  </>
                )}
                {voiceState === "connecting" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                )}
                {voiceState === "paused" && (
                  <>
                    <MicOff className="h-4 w-4 text-muted-foreground" />
                    <span>Voice paused</span>
                  </>
                )}
              </div>
            )}
            <PromptInputTextarea
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInput(e.target.value)
              }
              placeholder={
                isVoiceActive
                  ? "Voice mode active..."
                  : `Ask about the ${selectedVehicle.name} inspection...`
              }
              className="min-h-12 bg-secondary"
              disabled={status !== "ready" || isVoiceActive}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div />
            <div className="flex items-center gap-2">
              {/* Voice button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isVoiceActive || isVoicePaused ? "default" : "outline"}
                      size="icon"
                      disabled={isVoiceConnecting}
                      onClick={handleVoiceClick}
                      className={cn(
                        "h-9 w-9 rounded-full transition-all",
                        isVoiceActive && "bg-primary hover:bg-primary/90",
                        isVoicePaused && "bg-muted-foreground/50 hover:bg-muted-foreground/70",
                        voiceState === "listening" && "animate-pulse",
                        voiceState === "responding" && "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      {(() => {
                        const config = voiceStateConfig[voiceState];
                        const Icon = config.icon;
                        return (
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              config.animate && (voiceState === "connecting" || voiceState === "thinking") && "animate-spin"
                            )}
                          />
                        );
                      })()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {voiceStateConfig[voiceState].tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Submit button */}
              <PromptInputSubmit disabled={status !== "ready" || isVoiceActive} />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
