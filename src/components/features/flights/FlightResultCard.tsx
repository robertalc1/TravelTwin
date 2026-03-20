"use client";

import { Plane, Clock, ArrowRight } from "lucide-react";
import { getCityImageByIata } from "@/lib/cityImages";
import { formatDuration } from "@/lib/hotelImages";
import { SourceBadge } from "@/components/ui/SourceBadge";
import type { NormalizedFlight } from "@/lib/supabase/types";

interface FlightResultCardProps {
    flight: NormalizedFlight;
}

function formatPrice(price: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    } catch {
        return `${currency} ${Math.round(price)}`;
    }
}

export function FlightResultCard({ flight }: FlightResultCardProps) {
    const destImage = getCityImageByIata(flight.destination, flight.id);
    const airlineLogoUrl = `https://pics.avs.io/200/200/${flight.airline}.png`;
    const durationDisplay = formatDuration(flight.duration) || flight.duration;

    function handleViewDetails() {
        try {
            sessionStorage.setItem(`flightView_${flight.id}`, JSON.stringify(flight));
        } catch { /* ignore */ }
        window.location.href = `/flights/${flight.id}`;
    }

    return (
        <div className="group rounded-xl overflow-hidden bg-white dark:bg-surface border border-neutral-200 dark:border-border-default transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            {/* Hero image */}
            <div className="relative aspect-[16/9] overflow-hidden">
                <img
                    src={destImage}
                    alt={flight.destinationCity || flight.destination}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=500&fit=crop";
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Route overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="text-white">
                        <p className="text-xs text-white/70">
                            {flight.originCity || flight.origin}
                        </p>
                        <div className="flex items-center gap-2 text-lg font-bold">
                            <span>{flight.origin}</span>
                            <ArrowRight className="h-4 w-4 text-white/70" />
                            <span>{flight.destination}</span>
                        </div>
                        <p className="text-xs text-white/70">
                            {flight.destinationCity || flight.destination}
                        </p>
                    </div>
                    {flight.stops === 0 && (
                        <span className="rounded-md bg-success px-2 py-1 text-xs font-bold text-white shadow">
                            Direct
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Airline row */}
                <div className="flex items-center gap-2 mb-3">
                    <img
                        src={airlineLogoUrl}
                        alt={flight.airlineName || flight.airline}
                        className="h-6 w-6 object-contain rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="text-sm font-medium text-text-primary">
                        {flight.airlineName || flight.airline}
                    </span>
                    <div className="ml-auto">
                        <SourceBadge source={flight.source} lastUpdated={flight.lastUpdated} />
                    </div>
                </div>

                {/* Times row */}
                <div className="flex items-center justify-between mb-3 text-sm">
                    <div className="text-center">
                        <p className="text-lg font-bold text-text-primary">{flight.departureTime}</p>
                        <p className="text-xs text-text-muted">{flight.departureDate}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-1 px-3">
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                            <Clock className="h-3 w-3" />
                            {durationDisplay}
                        </div>
                        <div className="w-full flex items-center gap-1">
                            <div className="h-px flex-1 bg-border-default" />
                            <Plane className="h-3 w-3 text-primary-500" />
                            <div className="h-px flex-1 bg-border-default" />
                        </div>
                        <p className="text-xs text-text-muted">
                            {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-text-primary">{flight.arrivalTime}</p>
                        <p className="text-xs text-text-muted">{flight.arrivalDate}</p>
                    </div>
                </div>

                {/* Price + CTA */}
                <div className="flex items-end justify-between pt-2 border-t border-border-default">
                    <div>
                        <p className="text-2xl font-bold text-primary-600">
                            {formatPrice(flight.price, flight.currency)}
                        </p>
                        <p className="text-xs text-text-muted">per person · {flight.travelClass || "Economy"}</p>
                    </div>
                    <button
                        onClick={handleViewDetails}
                        className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-600 hover:shadow-md active:scale-[0.98]"
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
}
