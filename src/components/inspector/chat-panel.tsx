"use client";

import { useEffect, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  className?: string;
  selectedPart?: string | null;
  onPartHandled?: () => void;
}

export function ChatPanel({ className, selectedPart, onPartHandled }: ChatPanelProps) {
  const [input, setInput] = useState<string>("");

  // When a part is selected, pre-fill the input with a question about it
  useEffect(() => {
    if (selectedPart) {
      setInput(`Tell me about the "${selectedPart}" part of the tank.`);
      onPartHandled?.();
    }
  }, [selectedPart, onPartHandled]);

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

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
        {messages.length > 0 && (
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
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageCircle className="h-12 w-12" />}
              title="Start a conversation"
              description="Ask questions about the tank inspection"
            />
          ) : (
            messages.map((message: any) => (
              <div key={message.id}>
                {message.parts?.map((part: any, i: number) => {
                  if (part.type === "text") {
                    return (
                      <Message key={`${message.id}-${i}`} from={message.role}>
                        <MessageContent>
                          {message.role === "user" ? (
                            part.text
                          ) : (
                            <MessageResponse>{part.text}</MessageResponse>
                          )}
                        </MessageContent>
                      </Message>
                    );
                  }
                  return null;
                })}
              </div>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card shrink-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInput(e.target.value)
              }
              placeholder="Ask about the tank inspection..."
              className="min-h-12 bg-secondary"
              disabled={status !== "ready"}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div />
            <PromptInputSubmit disabled={status !== "ready"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
