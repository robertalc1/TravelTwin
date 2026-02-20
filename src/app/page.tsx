"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Plane,
  Hotel,
  Compass,
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  Globe,
  Shield,
  Headphones,
  Star,
  Loader2,
  Calendar,
  ChevronDown,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";
import { Skeleton } from "@/components/ui/Skeleton";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { getHotelImage, formatPrice, formatDuration } from "@/lib/hotelImages";
import type { NormalizedFlight, NormalizedHotel, FlightInspiration } from "@/lib/supabase/types";

/* ── Static Data ── */
const timelineStages = [
  { label: "Inspire", completed: true, icon: "✨" },
  { label: "Search", completed: true, icon: "🔍" },
  { label: "Compare", completed: true, icon: "⚖️" },
  { label: "Book", completed: false, icon: "🎫" },
  { label: "Travel", completed: false, icon: "✈️" },
];

const trustItems = [
  { icon: Globe, label: "Worldwide Coverage", subtitle: "200+ countries & territories" },
  { icon: Shield, label: "Best Price Guarantee", subtitle: "Or we match it" },
  { icon: Headphones, label: "24/7 Support", subtitle: "Always here for you" },
  { icon: Star, label: "Live Pricing", subtitle: "Powered by Amadeus" },
];

const flightClasses = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First Class" },
];

const nightOptions = [1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30];

/* ── Live Trip Package Card ── */
interface LiveTripPackageProps {
  flight: NormalizedFlight;
  hotel?: NormalizedHotel;
  nights: number;
}

function LiveTripPackage({ flight, hotel, nights }: LiveTripPackageProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const hotelCost = hotel ? hotel.pricePerNight * nights : 0;
  const totalCost = flight.price + hotelCost;
  const hotelImg = hotel
    ? getHotelImage(hotel.name, hotel.cityName || hotel.cityCode, hotel.rating)
    : null;

  const isIataCode = /^[A-Z0-9]{2}$/.test(flight.airline);
  const airlineLogoUrl = isIataCode
    ? `https://pics.avs.io/200/200/${flight.airline}.png`
    : null;

  async function handleSave() {
    if (!user) { window.location.href = "/login"; return; }
    setSaving(true);
    try {
      await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: flight.destination,
          origin: flight.origin,
          outbound_flight: flight,
          hotel: hotel || null,
          total_cost: totalCost,
          days: nights,
          status: "planning",
        }),
      });
      setSaved(true);
    } catch { /* noop */ } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-radius-xl border border-border-default bg-surface overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-border-emphasis group">
      {/* Flight section */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 overflow-hidden shrink-0">
              {airlineLogoUrl ? (
                <img
                  src={airlineLogoUrl}
                  alt={flight.airline}
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = "none";
                  }}
                />
              ) : (
                <Plane className="h-4 w-4 text-white" />
              )}
            </div>
            <span className="text-sm font-semibold text-white/90">{flight.airlineName || flight.airline}</span>
            <SourceBadge source={flight.source} lastUpdated={flight.lastUpdated} />
          </div>
          <span className="font-mono text-xl font-bold text-white">
            {formatPrice(flight.price, flight.currency)}
          </span>
        </div>

        {/* Route row */}
        <div className="flex items-center gap-2">
          <div className="text-left">
            <p className="font-mono text-2xl font-bold text-white leading-none">
              {flight.departureTime || "—"}
            </p>
            <p className="font-mono text-xs font-semibold text-white/70 tracking-wider mt-0.5">
              {flight.origin}
            </p>
          </div>
          <div className="flex-1 flex items-center px-2">
            <div className="flex-1 relative">
              <div className="h-px bg-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary-700 px-1">
                <Plane className="h-3.5 w-3.5 text-white/70 rotate-90" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-white leading-none">
              {flight.arrivalTime || "—"}
            </p>
            <p className="font-mono text-xs font-semibold text-white/70 tracking-wider mt-0.5">
              {flight.destination}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-2">
          {flight.duration && (
            <Badge variant="neutral" className="!bg-white/10 !text-white/80 !border-white/10 text-[10px]">
              {formatDuration(flight.duration)}
            </Badge>
          )}
          <Badge
            variant={flight.stops === 0 ? "success" : "neutral"}
            className={flight.stops === 0 ? "text-[10px]" : "!bg-white/10 !text-white/80 !border-white/10 text-[10px]"}
          >
            {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
          </Badge>
          <Badge variant="neutral" className="!bg-white/10 !text-white/80 !border-white/10 text-[10px]">
            {flight.travelClass}
          </Badge>
        </div>
      </div>

      {/* Hotel section */}
      {hotel ? (
        <div className="flex gap-3 p-4 border-b border-border-default">
          {hotelImg && (
            <div className="shrink-0 w-20 h-16 rounded-radius-md overflow-hidden bg-neutral-100">
              <img
                src={hotelImg}
                alt={hotel.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{hotel.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {Array.from({ length: Math.min(5, Math.max(1, hotel.rating)) }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 text-gold-500 fill-gold-500" />
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-bold text-text-primary">
                  {formatPrice(hotel.pricePerNight, hotel.currency)}
                </p>
                <p className="text-[10px] text-text-muted">per night</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {hotel.cancellationPolicy?.toLowerCase().includes("free") && (
                <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 rounded px-1.5 py-0.5">
                  Free cancellation
                </span>
              )}
              <SourceBadge source={hotel.source} lastUpdated={hotel.lastUpdated} />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-border-default flex items-center gap-3 text-sm text-text-muted">
          <Hotel className="h-4 w-4 shrink-0" />
          <span>No hotels found for these dates. <Link href="/hotels" className="text-primary-500 hover:underline">Search hotels →</Link></span>
        </div>
      )}

      {/* Total + actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              {hotel ? `Flight + ${nights} night${nights > 1 ? "s" : ""} hotel` : "Flight only"}
            </p>
            <p className="font-mono text-2xl font-bold text-primary-500">
              {formatPrice(totalCost, flight.currency)}
            </p>
          </div>
          {hotel && (
            <div className="text-right text-xs text-text-muted">
              <p>Flight: {formatPrice(flight.price, flight.currency)}</p>
              <p>Hotel: {formatPrice(hotelCost, hotel.currency)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Link href={`/flights?from=${flight.origin}&to=${flight.destination}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Plane className="h-3.5 w-3.5" />
              Flights
            </Button>
          </Link>
          {hotel && (
            <Link href={`/hotels?city=${hotel.cityCode}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Hotel className="h-3.5 w-3.5" />
                Hotels
              </Button>
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-radius-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0",
              saved
                ? "bg-success/10 text-success border border-success/30"
                : "bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200 dark:bg-primary-500/10 dark:border-primary-500/30"
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inspiration Card ── */
function InspirationCard({
  dest,
  originIata,
}: {
  dest: FlightInspiration;
  originIata: string;
}) {
  return (
    <Link
      href={`/flights?from=${originIata}&to=${dest.destination}`}
      className="block rounded-radius-lg border border-border-default bg-surface p-4 hover:border-border-emphasis hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-lg font-bold text-primary-500">
          {dest.destination}
        </span>
        <SourceBadge source={dest.source} />
      </div>
      <p className="text-sm font-medium text-text-primary truncate mb-1">
        {dest.destinationCity !== dest.destination
          ? dest.destinationCity
          : dest.destination}
      </p>
      <div className="flex items-center justify-between">
        <span className="font-mono text-base font-bold text-accent-500">
          {formatPrice(dest.price, dest.currency)}
        </span>
        <span className="text-[10px] text-text-muted">{dest.departureDate}</span>
      </div>
      <div className="flex items-center gap-1 mt-2 text-primary-500 text-xs font-medium">
        Search <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

/* ── Results Skeleton ── */
function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-radius-xl border border-border-default bg-surface overflow-hidden"
        >
          <Skeleton className="h-36 rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-20 rounded-radius-md" />
          </div>
          <div className="p-4 border-t border-border-default space-y-2">
            <Skeleton className="h-8 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function Home() {
  const [departureIata, setDepartureIata] = useState("");
  const [departureDisplay, setDepartureDisplay] = useState("");
  const [destinationIata, setDestinationIata] = useState("");
  const [destinationDisplay, setDestinationDisplay] = useState("");
  const [nights, setNights] = useState("7");
  const [flightClass, setFlightClass] = useState("ECONOMY");

  const [liveFlights, setLiveFlights] = useState<NormalizedFlight[]>([]);
  const [liveHotels, setLiveHotels] = useState<NormalizedHotel[]>([]);
  const [inspirations, setInspirations] = useState<FlightInspiration[]>([]);
  const [searchMode, setSearchMode] = useState<"specific" | "inspiration" | null>(null);

  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [warning, setWarning] = useState("");

  // Compute check-in/check-out dates (1 week from now)
  function getDateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!departureIata) return;

    setSearching(true);
    setHasSearched(true);
    setLiveFlights([]);
    setLiveHotels([]);
    setInspirations([]);
    setWarning("");

    const checkIn = getDateOffset(7);
    const checkOut = getDateOffset(7 + parseInt(nights));

    try {
      if (destinationIata) {
        // Specific route: fetch flights + hotels in parallel
        setSearchMode("specific");
        const [flightsRes, hotelsRes] = await Promise.all([
          fetch(
            `/api/flights/live?origin=${departureIata}&destination=${destinationIata}&departureDate=${checkIn}&travelClass=${flightClass}`
          ),
          fetch(
            `/api/hotels/live?cityCode=${destinationIata}&checkInDate=${checkIn}&checkOutDate=${checkOut}`
          ),
        ]);
        const flightsData = await flightsRes.json();
        const hotelsData = await hotelsRes.json();
        setLiveFlights(flightsData.flights || []);
        setLiveHotels(hotelsData.hotels || []);
        const warnings = [flightsData.warning, hotelsData.warning]
          .filter(Boolean)
          .join(" ");
        if (warnings) setWarning(warnings);
      } else {
        // No destination: use flight inspiration
        setSearchMode("inspiration");
        const res = await fetch(
          `/api/flights/inspiration?origin=${departureIata}`
        );
        const data = await res.json();
        setInspirations(data.destinations || []);
        if (data.message) setWarning(data.message);
      }
    } catch {
      setWarning("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  // Build trip packages: pair each flight with the cheapest hotel
  const tripPackages = liveFlights.slice(0, 6).map((flight) => ({
    flight,
    hotel: liveHotels[0] ?? undefined,
  }));

  const resultsCount =
    searchMode === "specific"
      ? tripPackages.length
      : inspirations.length;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="main-content" className="flex-1">
        {/* ════════════════ HERO ════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500 pb-32 pt-16 lg:pt-24">
          {/* Background shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent-500/20 blur-[100px]" />
            <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-primary-300/15 blur-[80px]" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-gold-500/10 blur-[60px]" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
            {/* Hero text */}
            <div className="mx-auto max-w-3xl text-center mb-12 animate-fade-in-up">
              <Badge variant="accent" className="mb-6 text-sm px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Live Worldwide Travel Search
              </Badge>
              <h1 className="text-display text-white mb-6 !text-4xl md:!text-5xl lg:!text-[56px] lg:!leading-[64px]">
                Find your perfect{" "}
                <span className="relative">
                  <span className="text-accent-400">trip package</span>
                  <svg
                    className="absolute -bottom-1 left-0 w-full h-2 text-accent-400/40"
                    viewBox="0 0 200 8"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 7 Q50 0 100 5 T200 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </span>{" "}
                worldwide
              </h1>
              <p className="text-lg text-primary-100/90 max-w-xl mx-auto">
                Live flight + hotel search powered by Amadeus. Fly from
                anywhere to anywhere — set your departure city and let us find
                the best deals.
              </p>
            </div>

            {/* ── Search Form ── */}
            <form
              onSubmit={handleSearch}
              className="mx-auto max-w-5xl animate-fade-in-up"
              style={{ animationDelay: "150ms" }}
            >
              <div className="rounded-radius-xl bg-surface/95 backdrop-blur-xl p-4 shadow-xl border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Departure */}
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      From (Departure City) *
                    </label>
                    <LocationAutocomplete
                      value={departureIata}
                      displayValue={departureDisplay}
                      onSelect={(code, display) => {
                        setDepartureIata(code);
                        setDepartureDisplay(display);
                      }}
                      placeholder="e.g. Bucharest, London, Paris..."
                      icon="origin"
                    />
                  </div>

                  {/* Destination */}
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      To (Destination — optional)
                    </label>
                    <LocationAutocomplete
                      value={destinationIata}
                      displayValue={destinationDisplay}
                      onSelect={(code, display) => {
                        setDestinationIata(code);
                        setDestinationDisplay(display);
                      }}
                      placeholder="Anywhere or specific city..."
                      icon="destination"
                    />
                  </div>

                  {/* Nights */}
                  <div>
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      Nights
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                      <select
                        value={nights}
                        onChange={(e) => setNights(e.target.value)}
                        className="w-full appearance-none rounded-radius-md border border-border-default bg-surface-sunken pl-10 pr-8 py-3 text-sm font-medium text-text-primary hover:border-border-emphasis transition-colors focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                      >
                        {nightOptions.map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "night" : "nights"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Row 2: Class + Search */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      Flight Class
                    </label>
                    <div className="relative">
                      <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                      <select
                        value={flightClass}
                        onChange={(e) => setFlightClass(e.target.value)}
                        className="w-full appearance-none rounded-radius-md border border-border-default bg-surface-sunken pl-10 pr-8 py-3 text-sm font-medium text-text-primary hover:border-border-emphasis transition-colors focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                      >
                        {flightClasses.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full h-auto py-3"
                      disabled={searching || !departureIata}
                    >
                      {searching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {!departureIata && (
                  <p className="text-xs text-text-muted mt-2 px-1">
                    💡 Type your departure city above to search worldwide flights
                    {!destinationIata && " (leave destination empty to discover cheapest options)"}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 60"
              fill="none"
              className="w-full text-background"
            >
              <path
                d="M0 60L60 52C120 44 240 28 360 20C480 12 600 12 720 16C840 20 960 28 1080 32C1200 36 1320 36 1380 36L1440 36V60H0Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </section>

        {/* ════════════════ SEARCH RESULTS ════════════════ */}
        {hasSearched && (
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              {/* Warning banner */}
              {warning && (
                <div className="mb-6 flex items-start gap-3 rounded-radius-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {warning}
                </div>
              )}

              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-overline text-accent-500 mb-2">
                    {searchMode === "inspiration"
                      ? "INSPIRATION — CHEAPEST FLIGHTS"
                      : "LIVE RESULTS"}
                  </p>
                  <h2 className="text-h2 text-text-primary">
                    {searching
                      ? "Searching live prices..."
                      : resultsCount > 0
                        ? searchMode === "inspiration"
                          ? `${resultsCount} Destinations from ${departureDisplay}`
                          : `${resultsCount} Trip Package${resultsCount !== 1 ? "s" : ""} Found`
                        : "No Results Found"}
                  </h2>
                  {!searching && (
                    <p className="text-body text-text-tertiary mt-2 max-w-lg">
                      {searchMode === "specific"
                        ? `${departureDisplay} → ${destinationDisplay} · ${nights} night${parseInt(nights) > 1 ? "s" : ""} hotel included`
                        : `Cheapest destinations from ${departureDisplay} — click any card to search flights`}
                    </p>
                  )}
                </div>
                {hasSearched && !searching && (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Zap className="h-3.5 w-3.5 text-accent-500" />
                    <span>Powered by Amadeus Live API</span>
                  </div>
                )}
              </div>

              {searching ? (
                <ResultsSkeleton />
              ) : searchMode === "specific" && tripPackages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tripPackages.map(({ flight, hotel }, i) => (
                    <div key={`${flight.id}-${i}`} className="stagger-item">
                      <LiveTripPackage
                        flight={flight}
                        hotel={hotel}
                        nights={parseInt(nights)}
                      />
                    </div>
                  ))}
                </div>
              ) : searchMode === "inspiration" && inspirations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {inspirations.slice(0, 12).map((dest, i) => (
                    <div key={`${dest.destination}-${i}`} className="stagger-item">
                      <InspirationCard dest={dest} originIata={departureIata} />
                    </div>
                  ))}
                </div>
              ) : (
                !searching && (
                  <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                    <Compass className="h-12 w-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-h4 text-text-primary mb-2">
                      No results found
                    </h3>
                    <p className="text-body text-text-muted max-w-md mx-auto mb-6">
                      {warning ||
                        "Try different cities, dates, or flight class. Live search requires valid IATA city codes."}
                    </p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <Link href="/flights">
                        <Button variant="outline" size="sm">
                          <Plane className="h-4 w-4" />
                          Advanced Flight Search
                        </Button>
                      </Link>
                      <Link href="/explore">
                        <Button variant="outline" size="sm">
                          <Compass className="h-4 w-4" />
                          Explore Destinations
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* ════════════════ TRUST BAR ════════════════ */}
        <section className="py-8 border-b border-border-subtle">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trustItems.map(({ icon: Icon, label, subtitle }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-radius-lg bg-primary-50 text-primary-500 dark:bg-primary-50/10 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {label}
                    </p>
                    <p className="text-xs text-text-muted">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════ JOURNEY TIMELINE ════════════════ */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <p className="text-overline text-accent-500 mb-2">HOW IT WORKS</p>
              <h2 className="text-h2 text-text-primary mb-4">
                Your journey, stamped and tracked
              </h2>
              <p className="text-body-lg text-text-tertiary">
                From first inspiration to boarding pass — we track every
                milestone of your trip with our signature Journey Timeline.
              </p>
            </div>

            <div className="flex justify-center">
              <JourneyTimeline stages={timelineStages} />
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Choose Your Origin",
                  desc: "Type any city worldwide as your departure. Our Amadeus-powered search finds real flights from your airport in seconds.",
                },
                {
                  step: "2",
                  title: "Explore or Specify",
                  desc: "Leave destination blank to see cheapest options from your city, or enter a specific destination for full flight + hotel packages.",
                },
                {
                  step: "3",
                  title: "Book the Best Deal",
                  desc: "Compare live-priced packages, save your favorites, and book with full confidence in real, up-to-date pricing.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center px-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-radius-full bg-accent-50 text-accent-500 font-display font-bold text-lg dark:bg-accent-500/15">
                    {step}
                  </div>
                  <h3 className="text-h5 text-text-primary mb-2">{title}</h3>
                  <p className="text-body-sm text-text-tertiary">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════ CTA ════════════════ */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent-500/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary-300/10 blur-[80px]" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mb-4">
              Ready to discover your next adventure?
            </h2>
            <p className="text-lg text-primary-100/80 mb-8 max-w-xl mx-auto">
              Search live flights and hotels worldwide. Real prices, real
              availability — powered by Amadeus.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/explore">
                <Button
                  variant="primary"
                  size="lg"
                  className="!bg-accent-500 hover:!bg-accent-600 !text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Explore Destinations
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="!border-white/25 !text-white hover:!bg-white/10"
                >
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
      <div className="h-16 lg:hidden" />
    </div>
  );
}
