"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Plane, Sparkles } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useChatStore } from "@/stores/chatStore";
import type { ChatDeal, ChatFlight, ChatHotel } from "@/app/api/chat/route";

type MessageData = {
  deals?: ChatDeal[];
  flights?: ChatFlight[];
  hotels?: ChatHotel[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: MessageData | null;
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I can find cheap flights, hotels, and travel deals for you. Where would you like to go?",
  data: null,
};

const QUICK_PROMPTS = [
  "Cheap flights from my city",
  "Beach destinations in Europe",
  "City breaks under €200",
];

export function ChatPanel() {
  const isOpen = useChatStore(s => s.isOpen);
  const openChat = useChatStore(s => s.open);
  const closeChat = useChatStore(s => s.close);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { iataCode: origin } = useUserLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: text };
      setMessages(prev => {
        const updated = [...prev, userMsg];
        // Build conversation for API (exclude welcome message)
        return updated;
      });
      setInput("");
      setIsLoading(true);

      try {
        // Capture current messages for the API call
        const conversationMsgs = [...messages, userMsg]
          .filter(m => m.id !== "welcome")
          .map(m => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMsgs,
            origin: origin || "OTP",
          }),
        });

        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: data.message || data.content || "",
            data: data.data || null,
          },
        ]);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
            data: null,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, origin]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  }

  const showQuickPrompts = messages.length === 1 && !isLoading;

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="chat-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={openChat}
            className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-primary-500 px-4 py-3 text-white shadow-lg transition-all duration-200 hover:bg-primary-600 hover:shadow-xl lg:bottom-8 lg:right-8"
            aria-label="Open travel assistant"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Ask AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[380px] h-[min(520px,calc(100dvh-180px))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-border-default dark:bg-surface lg:bottom-8 lg:right-8 lg:max-w-[520px] lg:h-[min(680px,calc(100dvh-120px))]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-border-default">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500">
                  <Plane className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-secondary-500 dark:text-white">TravelTwin AI</p>
                  <p className="text-[10px] text-text-muted">Find flights &amp; deals</p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-700"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  data={msg.data}
                />
              ))}

              {isLoading && (
                <div className="flex items-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-neutral-100 px-3.5 py-2.5 dark:bg-secondary-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            {showQuickPrompts && (
              <div className="shrink-0 flex flex-wrap gap-1.5 px-3 pb-2">
                {QUICK_PROMPTS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendText(q)}
                    className="rounded-full bg-neutral-100 px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-neutral-200 hover:text-text-primary dark:bg-secondary-700 dark:hover:bg-secondary-600 dark:text-text-secondary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="shrink-0 flex items-center gap-2 border-t border-neutral-200 px-3 py-2.5 dark:border-border-default">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about flights, hotels, deals..."
                className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted dark:bg-secondary-700 dark:text-white"
                disabled={isLoading}
              />
              <button
                onClick={() => sendText(input)}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
