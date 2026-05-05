"use client";

import { motion } from "framer-motion";
import { ChatDealCard } from "./ChatDealCard";
import { ChatFlightCard } from "./ChatFlightCard";
import { ChatHotelCard } from "./ChatHotelCard";
import type { ChatDeal, ChatFlight, ChatHotel } from "@/app/api/chat/route";

type MessageData = {
  deals?: ChatDeal[];
  flights?: ChatFlight[];
  hotels?: ChatHotel[];
};

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  data?: MessageData | null;
};

export function ChatMessage({ role, content, data }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      {/* Text bubble */}
      {content && (
        <div
          className={`max-w-[260px] lg:max-w-[400px] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm bg-primary-500 text-white"
              : "rounded-bl-sm bg-neutral-100 text-text-primary dark:bg-secondary-700 dark:text-white"
          }`}
        >
          {content}
        </div>
      )}

      {/* Deal cards */}
      {data?.deals && data.deals.length > 0 && (
        <div className="w-full space-y-2">
          {data.deals.map((deal, i) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
            >
              <ChatDealCard deal={deal} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Flight cards */}
      {data?.flights && data.flights.length > 0 && (
        <div className="w-full space-y-2">
          {data.flights.map((flight, i) => (
            <motion.div
              key={flight.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
            >
              <ChatFlightCard flight={flight} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Hotel cards */}
      {data?.hotels && data.hotels.length > 0 && (
        <div className="w-full space-y-2">
          {data.hotels.map((hotel, i) => (
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
            >
              <ChatHotelCard hotel={hotel} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
