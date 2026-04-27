"use client";

import { Star } from "lucide-react";
import type { ChatHotel } from "@/app/api/chat/route";

type ChatHotelCardProps = {
  hotel: ChatHotel;
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `€${Math.round(amount)}`;
  }
}

export function ChatHotelCard({ hotel }: ChatHotelCardProps) {
  const stars = Math.min(5, Math.max(1, hotel.stars));

  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-border-default dark:bg-surface">
      {/* Decorative header strip */}
      <div className="flex h-16 items-center justify-center bg-gradient-to-r from-primary-50 to-primary-100 px-3 dark:from-secondary-700 dark:to-secondary-800">
        <div className="text-center">
          <p className="max-w-[280px] truncate text-xs font-semibold text-secondary-500 dark:text-white">
            {hotel.name}
          </p>
          <div className="mt-0.5 flex justify-center gap-0.5">
            {Array.from({ length: stars }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-gold-500 text-gold-500" />
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        <p className="truncate text-sm font-bold text-secondary-500 dark:text-white">{hotel.name}</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {hotel.city} · {hotel.nights} night{hotel.nights !== 1 ? "s" : ""}
        </p>

        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-secondary-500 dark:text-white">
                {formatPrice(hotel.pricePerNight, hotel.currency)}
              </span>
              <span className="text-xs text-text-secondary">/night</span>
            </div>
            <p className="text-[10px] text-text-muted">
              Total: {formatPrice(hotel.totalPrice, hotel.currency)}
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] text-text-secondary dark:bg-secondary-700">
            {formatDate(hotel.checkIn)} – {formatDate(hotel.checkOut)}
          </span>
        </div>
      </div>
    </div>
  );
}
