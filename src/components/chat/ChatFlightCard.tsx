"use client";

import { Plane } from "lucide-react";
import { formatDuration } from "@/lib/hotelImages";
import type { ChatFlight } from "@/app/api/chat/route";

type ChatFlightCardProps = {
  flight: ChatFlight;
};

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

export function ChatFlightCard({ flight }: ChatFlightCardProps) {
  const logoUrl = `https://pics.avs.io/200/200/${flight.airlineCode}.png`;
  const durationStr = flight.duration ? formatDuration(flight.duration) : "";
  const stopsLabel =
    flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;

  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-border-default dark:bg-surface">
      <div className="mb-2 flex items-center gap-2">
        <img
          src={logoUrl}
          alt={flight.airlineCode}
          className="h-8 w-8 rounded object-contain"
          onError={e => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-semibold text-secondary-500 dark:text-white">
            <span className="truncate">{flight.originCity || flight.origin}</span>
            <Plane className="h-3 w-3 shrink-0 text-primary-500" />
            <span className="truncate">{flight.destinationCity || flight.destination}</span>
          </div>
          <p className="text-xs text-text-secondary">
            {durationStr ? `${durationStr} · ` : ""}
            {stopsLabel}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          {flight.departureTime && flight.arrivalTime && (
            <p className="text-xs text-text-secondary">
              {flight.departureTime} → {flight.arrivalTime}
            </p>
          )}
          <p className="text-[10px] text-text-muted">{flight.departureDate}</p>
        </div>
        <span className="text-base font-bold text-secondary-500 dark:text-white">
          {formatPrice(flight.price, flight.currency)}
        </span>
      </div>
    </div>
  );
}
