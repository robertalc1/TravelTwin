"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Plane,
  Hotel,
  ArrowLeft,
  MapPin,
  Star,
  Calendar,
  Coffee,
  Sun,
  Moon,
  Utensils,
  UtensilsCrossed,
  Camera,
  ExternalLink,
  Lightbulb,
  Navigation,
} from "lucide-react";
import type { TripPackage } from "@/app/api/ai/plan-trip/route";
import AttractionPhotos from "@/components/AttractionPhotos";

const InteractiveMap = dynamic(
  () => import("@/components/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-2xl bg-neutral-100 dark:bg-surface-elevated animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-[3px] border-neutral-200 border-t-primary-500 animate-spin" />
        <p className="text-sm text-text-muted">Loading map...</p>
      </div>
    ),
  }
);

const timeIcons: Record<string, any> = {
  transport: Plane,
  sightseeing: Camera,
  dining: Utensils,
  accommodation: Hotel,
  default: MapPin,
};

function formatDuration(iso: string): string {
  if (!iso) return "";
  const h = iso.match(/(\d+)H/)?.[1];
  const m = iso.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
}

function formatTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso.slice(11, 16) || ""; }
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pkg, setPkg] = useState<TripPackage | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;

    // Try session storage first
    const stored = sessionStorage.getItem(`trip_${id}`);
    if (stored) {
      setPkg(JSON.parse(stored));
      return;
    }

    // Fallback: look in planResults
    const results = sessionStorage.getItem("planResults");
    if (results) {
      const { packages } = JSON.parse(results);
      const found = packages?.find((p: TripPackage) => p.id === id);
      if (found) setPkg(found);
      else router.push("/plan/results");
    } else {
      router.push("/plan");
    }
  }, [params, router]);


  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">✈️</div>
          <p className="text-text-secondary">Loading your itinerary...</p>
        </div>
      </div>
    );
  }

  const dest = pkg.destination;
  const ai = pkg.aiContent;
  const heroUrl = `https://images.unsplash.com/${dest.imageId}?w=1600&h=700&fit=crop&q=85`;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">

      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img src={heroUrl} alt={dest.city} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <Link
            href="/plan/results"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Link>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white">
            {pkg.nights} days in {dest.city}, {dest.country}
          </h1>
          {pkg.flight && (
            <p className="text-white/80 mt-2 text-lg">
              {formatTime(pkg.flight.departureTime)} – {formatTime(pkg.flight.arrivalTime)} ·{" "}
              {pkg.nights} nights · {formatDuration(pkg.flight.duration)}
            </p>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Itinerary */}
          <div className="lg:col-span-2 space-y-10">

            {/* Overview */}
            {ai?.description && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-3">Your Trip</h2>
                <p className="text-text-secondary leading-relaxed">{ai.description}</p>
              </section>
            )}

            {/* Flight info */}
            {pkg.flight && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-4">Your Itinerary</h2>
                <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-secondary-500">Outbound Flight</p>
                      <p className="text-sm text-text-muted">
                        {pkg.flight.airline} · {pkg.flight.stops === 0 ? "Direct" : `${pkg.flight.stops} stop`}
                      </p>
                    </div>
                    {pkg.flight.airline && (
                      <img
                        src={`https://pics.avs.io/100/40/${pkg.flight.airline}.png`}
                        alt={pkg.flight.airline}
                        className="ml-auto h-8 object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-xl font-bold text-secondary-500">{formatTime(pkg.flight.departureTime)}</p>
                      <p className="text-text-muted text-xs">{dest.iata === pkg.destination.iata ? "Origin" : "Dep."}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                      <span className="text-xs text-text-muted whitespace-nowrap">{formatDuration(pkg.flight.duration)}</span>
                      <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-secondary-500">{formatTime(pkg.flight.arrivalTime)}</p>
                      <p className="text-text-muted text-xs">{dest.city}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Hotel info */}
            {pkg.hotel && (
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-50 text-secondary-500">
                    <Hotel className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-secondary-500">{pkg.hotel.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: pkg.hotel.stars }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-xs text-text-muted ml-1">{pkg.hotel.stars} stars</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-500">{pkg.currency} {pkg.hotel.pricePerNight}/night</p>
                    <p className="text-xs text-text-muted">{pkg.nights} nights total</p>
                  </div>
                </div>
                {pkg.hotel.checkIn && (
                  <div className="flex gap-4 mt-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Check-in: {pkg.hotel.checkIn}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Check-out: {pkg.hotel.checkOut}</span>
                  </div>
                )}
              </div>
            )}

            {/* Day-by-Day Plan */}
            {ai?.dayByDay && ai.dayByDay.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-6">Day-by-Day Plan</h2>
                <div className="space-y-4">
                  {ai.dayByDay.map((day) => {
                    const MorningIcon = timeIcons[day.morning?.type] || timeIcons.default;
                    const AfternoonIcon = timeIcons[day.afternoon?.type] || timeIcons.default;
                    const EveningIcon = timeIcons[day.evening?.type] || timeIcons.default;
                    return (
                      <div key={day.day} className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden">
                        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-3">
                          <h3 className="font-bold text-white">Day {day.day}: {day.title}</h3>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-border-default">
                          {[
                            { label: "Morning", icon: Coffee, slot: day.morning },
                            { label: "Afternoon", icon: Sun, slot: day.afternoon },
                            { label: "Evening", icon: Moon, slot: day.evening },
                          ].map(({ label, icon: TimeIcon, slot }) => (
                            <div key={label} className="flex items-start gap-4 px-5 py-4">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-surface-elevated text-text-secondary shrink-0 mt-0.5">
                                <TimeIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
                                <p className="font-semibold text-secondary-500 text-sm">{slot?.activity}</p>
                                <p className="text-xs text-text-secondary mt-0.5">{slot?.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Top Attractions */}
            {ai?.topAttractions && ai.topAttractions.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-4">Top Attractions</h2>
                <AttractionPhotos
                  names={ai.topAttractions.map(a => a.name)}
                  city={dest.city}
                  descriptions={Object.fromEntries(ai.topAttractions.map(a => [a.name, a.description]))}
                  onSelectPlace={setSelectedPlace}
                  selectedPlace={selectedPlace}
                />
              </section>
            )}

            {/* Explore the City — Interactive Map */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary-500">Explore the City</h2>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(dest.city + (ai?.topAttractions?.[0]?.name ? ' ' + ai.topAttractions[0].name : ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Open in Google Maps
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
                {/* Left — Interactive Leaflet map (60%) */}
                <div className="lg:col-span-3 space-y-2 lg:sticky lg:top-24">
                  <InteractiveMap
                    centerLat={dest.latitude}
                    centerLon={dest.longitude}
                    cityName={dest.city}
                    attractions={ai?.topAttractions || []}
                    restaurants={ai?.topRestaurants || []}
                    cafes={ai?.topCafes || []}
                    selectedPlace={selectedPlace}
                    onSelectPlace={setSelectedPlace}
                  />
                  <p className="text-xs text-text-muted text-center">
                    {dest.city}, {dest.country} · {dest.latitude.toFixed(4)}°N, {dest.longitude.toFixed(4)}°E
                  </p>
                </div>

                {/* Right — Scrollable place list (40%) */}
                <div className="lg:col-span-2 max-h-[500px] overflow-y-auto space-y-4 pr-0.5">

                  {/* Attractions */}
                  {ai?.topAttractions && ai.topAttractions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-neutral-50 dark:bg-background py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Attractions</span>
                      </div>
                      <div className="space-y-1.5">
                        {ai.topAttractions.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedPlace(selectedPlace === a.name ? null : a.name)}
                            className={`relative w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                              selectedPlace === a.name
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200"
                                : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300 hover:bg-primary-50/50"
                            }`}
                          >
                            <p className="font-semibold text-secondary-500 text-sm pr-6">{a.name}</p>
                            <p className="text-xs text-text-muted capitalize mt-0.5">{a.category}</p>
                            <MapPin className={`absolute bottom-2.5 right-2.5 h-3.5 w-3.5 transition-all ${
                              selectedPlace === a.name ? "text-primary-500 opacity-100" : "text-text-muted opacity-0 group-hover:opacity-50"
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Restaurants */}
                  {ai?.topRestaurants && ai.topRestaurants.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-neutral-50 dark:bg-background py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Restaurants</span>
                      </div>
                      <div className="space-y-1.5">
                        {ai.topRestaurants.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedPlace(selectedPlace === r.name ? null : r.name)}
                            className={`relative w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                              selectedPlace === r.name
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200"
                                : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300 hover:bg-primary-50/50"
                            }`}
                          >
                            <div className="flex items-center justify-between pr-6">
                              <p className="font-semibold text-secondary-500 text-sm">{r.name}</p>
                              <span className="text-xs font-bold text-green-600 shrink-0">{r.priceRange}</span>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">{r.cuisine}</p>
                            <MapPin className={`absolute bottom-2.5 right-2.5 h-3.5 w-3.5 transition-all ${
                              selectedPlace === r.name ? "text-primary-500 opacity-100" : "text-text-muted opacity-0 group-hover:opacity-50"
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cafes */}
                  {ai?.topCafes && ai.topCafes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-neutral-50 dark:bg-background py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Cafes</span>
                      </div>
                      <div className="space-y-1.5">
                        {ai.topCafes.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedPlace(selectedPlace === c.name ? null : c.name)}
                            className={`relative w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                              selectedPlace === c.name
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200"
                                : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300 hover:bg-primary-50/50"
                            }`}
                          >
                            <p className="font-semibold text-secondary-500 text-sm pr-6">{c.name}</p>
                            <p className="text-xs text-text-muted mt-0.5">{c.specialty}</p>
                            <MapPin className={`absolute bottom-2.5 right-2.5 h-3.5 w-3.5 transition-all ${
                              selectedPlace === c.name ? "text-primary-500 opacity-100" : "text-text-muted opacity-0 group-hover:opacity-50"
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Local Tips */}
            {ai?.localTips && ai.localTips.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-4">Local Tips</h2>
                <div className="space-y-3">
                  {ai.localTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white dark:bg-surface rounded-xl border border-neutral-200 dark:border-border-default p-4">
                      <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-text-secondary">{tip}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Price sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6 shadow-md space-y-5">
              <h3 className="font-bold text-lg text-secondary-500">Price Summary</h3>

              {/* Total price */}
              <div className="text-center py-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
                <p className="text-xs text-text-muted mb-1">Total price</p>
                <p className="text-4xl font-extrabold text-primary-500">
                  {pkg.currency} {pkg.totalPrice.toLocaleString()}
                </p>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                {pkg.flight && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <Plane className="h-4 w-4" /> Roundtrip flight
                    </span>
                    <span className="font-semibold">{pkg.currency} {pkg.flight.price.toLocaleString()}</span>
                  </div>
                )}
                {pkg.hotel && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <Hotel className="h-4 w-4" /> Hotel included
                    </span>
                    <span className="font-semibold">{pkg.currency} {pkg.hotel.price.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <Calendar className="h-4 w-4" /> Duration
                  </span>
                  <span className="font-semibold">{pkg.nights} nights</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <MapPin className="h-4 w-4" /> Destination
                  </span>
                  <span className="font-semibold">{dest.city}</span>
                </div>
              </div>

              {/* Daily expenses estimate */}
              {ai?.estimatedDailyExpenses && (
                <div className="bg-neutral-50 dark:bg-surface-elevated rounded-xl p-4">
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Est. daily expenses</p>
                  {Object.entries(ai.estimatedDailyExpenses).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs mb-1.5">
                      <span className="text-text-muted capitalize">{key}</span>
                      <span className="font-medium">€{val}/day</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Book button */}
              <a
                href={`https://www.google.com/travel/flights?q=flights+to+${dest.city}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary-500 px-6 py-4 font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
              >
                Book Now <ExternalLink className="h-4 w-4" />
              </a>

              <p className="text-xs text-text-muted text-center">
                Prices shown are estimates. Final price may vary.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
