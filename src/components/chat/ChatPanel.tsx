"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Plane, Sparkles } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useChatStore } from "@/stores/chatStore";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";
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

const WELCOME_EN: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I can find cheap flights, hotels, and travel deals for you. Where would you like to go?",
  data: null,
};

const WELCOME_RO: Message = {
  id: "welcome",
  role: "assistant",
  content: "Salut! Pot să-ți găsesc zboruri ieftine, hoteluri și oferte de călătorie. Unde ai vrea să mergi?",
  data: null,
};

// Two chips with realistic budget anchors — €200 chip is gone because the
// live homepage deal feed clusters at €400-€700 and the AI used to return
// "no results" on it.
const QUICK_PROMPTS_EN = [
  "City breaks under €400",
  "Beach destinations under €600",
];

const QUICK_PROMPTS_RO = [
  "City break sub €400",
  "Destinații de plajă sub €600",
];

export function ChatPanel() {
  const pathname = usePathname();
  const locale = useLocale();
  const { user } = useUser();
  const openAuthModal = useAuthModalStore(s => s.open);
  const isOpen = useChatStore(s => s.isOpen);
  const openChat = useChatStore(s => s.open);
  const closeChat = useChatStore(s => s.close);

  // Hide on the full-page route map — the floating button collides with
  // Google Maps' fullscreen control and the in-iframe controls.
  const hidden = pathname?.endsWith('/map') ?? false;
  const isRo = locale === "ro";
  const [messages, setMessages] = useState<Message[]>([isRo ? WELCOME_RO : WELCOME_EN]);
  const QUICK_PROMPTS = isRo ? QUICK_PROMPTS_RO : QUICK_PROMPTS_EN;
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

  // Keep the welcome message in sync with the active locale — if the user
  // switches language while the chat is empty, swap the welcome accordingly.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].id !== "welcome") return prev;
      return [isRo ? WELCOME_RO : WELCOME_EN];
    });
  }, [isRo]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      // Auth gate — open the same login popup used everywhere else.
      if (!user) {
        openAuthModal("login", pathname || `/${locale}`);
        return;
      }

      const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: text };
      setMessages(prev => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      // Build the page-aware context the backend uses to ground the model.
      let homepageDestinations: string[] = [];
      try {
        const raw = sessionStorage.getItem("homepage_destinations");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            homepageDestinations = parsed.filter((c): c is string => typeof c === "string");
          }
        }
      } catch { /* ignore */ }
      const tripMatch = pathname?.match(/\/trip\/([^/]+)/);
      const pageContext = {
        pathname: pathname || "",
        locale,
        userEmail: user.email ?? null,
        homepageDestinations,
        currentTripId: tripMatch?.[1] ?? null,
        userOriginIata: origin || "OTP",
      };

      try {
        const conversationMsgs = [...messages, userMsg]
          .filter(m => m.id !== "welcome")
          .map(m => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMsgs,
            pageContext,
          }),
        });

        if (res.status === 401) {
          openAuthModal("login", pathname || `/${locale}`);
          setIsLoading(false);
          return;
        }

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
            content: isRo
              ? "Ne pare rău, ceva nu a mers. Încearcă din nou."
              : "Sorry, something went wrong. Please try again.",
            data: null,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, origin, user, openAuthModal, pathname, locale, isRo]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  }

  const showQuickPrompts = messages.length === 1 && !isLoading;

  if (hidden) return null;

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
            aria-label={isRo ? "Deschide asistentul de călătorii" : "Open travel assistant"}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">{isRo ? "Întreabă AI" : "Ask AI"}</span>
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
                  <p className="text-[10px] text-text-muted">
                    {isRo ? "Găsește zboruri și oferte" : "Find flights & deals"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-700"
                aria-label={isRo ? "Închide chat" : "Close chat"}
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
                placeholder={isRo ? "Întreabă despre zboruri, hoteluri, oferte..." : "Ask about flights, hotels, deals..."}
                className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted dark:bg-secondary-700 dark:text-white"
                disabled={isLoading}
              />
              <button
                onClick={() => sendText(input)}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isRo ? "Trimite mesaj" : "Send message"}
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
