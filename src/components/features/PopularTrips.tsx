"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, RefreshCw, AlertCircle, Plane } from "lucide-react";
import { TripCard } from "@/components/results/TripCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCityImageByIata } from "@/lib/cityImages";
import { useUserLocation } from "@/hooks/useUserLocation";

// Specific Unsplash queries per IATA code
const CITY_QUERIES: Record<string, string> = {
  LHR: "London Big Ben city landmark",
  LON: "London Big Ben city landmark",
  CDG: "Paris Eiffel Tower city",
  FCO: "Rome Colosseum city",
  BCN: "Barcelona Sagrada Familia city",
  AMS: "Amsterdam canals city",
  IST: "Istanbul Bosphorus city",
  DXB: "Dubai skyline city",
  PRG: "Prague castle city",
  VIE: "Vienna Austria city",
  LIS: "Lisbon Portugal city",
  MAD: "Madrid Spain city",
  ATH: "Athens Acropolis city",
  BUD: "Budapest Parliament city",
  BER: "Berlin Brandenburg Gate city",
  WAW: "Warsaw Poland city",
  MXP: "Milan Italy city",
  MUC: "Munich Bavaria city",
  FRA: "Frankfurt Germany city",
  BRU: "Brussels Belgium city",
  CPH: "Copenhagen Denmark city",
  ARN: "Stockholm Sweden city",
  ZRH: "Zurich Switzerland city",
  DBV: "Dubrovnik Croatia city",
  JTR: "Santorini Greece island",
  DPS: "Bali Indonesia temple",
  BKK: "Bangkok Thailand temple",
  NRT: "Tokyo Japan city",
  JFK: "New York City skyline",
  SIN: "Singapore city skyline",
  RAK: "Marrakech Morocco medina",
  AYT: "Antalya Turkey coast",
  HER: "Crete Greece island",
  TFS: "Tenerife Spain island",
  KRK: "Krakow Poland city",
};

interface TripOffer {
  code: string;
  city: string;
  price: number;
  originalPrice: number;
  departureDate: string;
  returnDate: string;
  days: number;
  airline: string;
  isLive: boolean;
}

type FetchState = "idle" | "fetching" | "done" | "error";

export default function PopularTrips() {
  const location = useUserLocation();

  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const [apiError, setApiError] = useState("");
  const [cityImages, setCityImages] = useState<Record<string, string>>({});
  const [refreshTick, setRefreshTick] = useState(0);

  // Fetch Unsplash images in parallel for all offer codes
  const fetchCityImages = useCallback(async (codes: string[]) => {
    const entries = await Promise.all(
      codes.map(async (code) => {
        const query = CITY_QUERIES[code] || `${code} city travel`;
        try {
          const res = await fetch(
            `/api/unsplash?query=${encodeURIComponent(query)}`
          );
          if (!res.ok) return [code, null] as const;
          const data = await res.json();
          return [code, (data.url as string) || null] as const;
        } catch {
          return [code, null] as const;
        }
      })
    );
    const map: Record<string, string> = {};
    for (const [code, url] of entries) {
      if (url) map[code] = url;
    }
    setCityImages((prev) => ({ ...prev, ...map }));
  }, []);

  const fetchOffers = useCallback(
    async (iata: string) => {
      setFetchState("fetching");
      setApiError("");
      setCityImages({});
      try {
        const res = await fetch(`/api/popular-trips?origin=${iata}&limit=6`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "API error");
        const results: TripOffer[] = data.results || [];
        setOffers(results);
        if (results.length === 0 && data.error) {
          setApiError(data.error);
        }
        if (results.length > 0) {
          fetchCityImages(results.map((r) => r.code));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not load flight offers.";
        setApiError(msg);
        setOffers([]);
      } finally {
        setFetchState("done");
      }
    },
    [fetchCityImages]
  );

  // Fetch offers whenever IP-based IATA is resolved or user manually refreshes
  useEffect(() => {
    if (location.isLoading) return;
    fetchOffers(location.iataCode);
  }, [location.isLoading, location.iataCode, refreshTick, fetchOffers]);

  const handleRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const isLoading = location.isLoading || fetchState === "idle" || fetchState === "fetching";
  const originCity = location.airportCity || location.city || "Bucharest";
  const originIata = location.iataCode;

  return (
    <section className="py-10 lg:py-14 bg-neutral-50 dark:bg-surface-sunken">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8">

        {/* ── Header ── */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-h2 text-secondary-500">Popular Trips</h2>
            <div className="flex items-center gap-2 mt-1 h-5">
              {location.isLoading && (
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 animate-pulse text-primary-400" />
                  Detecting your location...
                </span>
              )}
              {!location.isLoading && fetchState === "fetching" && (
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5 animate-pulse text-primary-400" />
                  Loading live prices from {originCity}...
                </span>
              )}
              {!isLoading && offers.length > 0 && (
                <span className="text-xs text-text-secondary flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary-500" />
                  Live prices from{" "}
                  <strong className="ml-1">{originCity}</strong>
                </span>
              )}
              {!isLoading && offers.length === 0 && !apiError && (
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  From {originCity}
                </span>
              )}
            </div>
          </div>

          {fetchState === "done" && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-500 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          )}
        </div>

        {/* ── Loading skeletons ── */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border border-neutral-200 dark:border-border-default bg-white dark:bg-surface"
              >
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex justify-between items-end pt-2">
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error state ── */}
        {!isLoading && apiError && offers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-text-muted mb-4 opacity-50" />
            <p className="text-text-secondary mb-4 max-w-sm">{apiError}</p>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !apiError && offers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Plane className="h-10 w-10 text-text-muted mb-4 opacity-40" />
            <p className="text-text-secondary mb-4">
              No flights available from {originCity} right now.
            </p>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}

        {/* ── Results grid ── */}
        {!isLoading && offers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer, i) => (
              <div key={offer.code} className="stagger-item">
                <TripCard
                  id={`popular-${offer.code}`}
                  destination={offer.code}
                  destinationCity={offer.city}
                  origin={originIata}
                  originCity={originCity}
                  imageUrl={cityImages[offer.code] ?? getCityImageByIata(offer.code)}
                  days={offer.days}
                  departureDate={offer.departureDate}
                  returnDate={offer.returnDate}
                  originalPrice={offer.originalPrice}
                  discountedPrice={offer.price}
                  currency="EUR"
                  isDirect={i % 2 === 0}
                  travelers={2}
                  viewDealHref={`/plan?from=${originIata}&to=${offer.code}&days=${offer.days}&budget=${offer.price + 200}`}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
