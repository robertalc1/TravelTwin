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
  TrendingDown,
  Star,
  Loader2,
  DollarSign,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { TripRecommendation } from "@/lib/supabase/types";

/* ── Static Data ── */
const timelineStages = [
  { label: "Inspire", completed: true, icon: "✨" },
  { label: "Search", completed: true, icon: "🔍" },
  { label: "Compare", completed: true, icon: "⚖️" },
  { label: "Book", completed: false, icon: "🎫" },
  { label: "Travel", completed: false, icon: "✈️" },
];

const trustItems = [
  { icon: Globe, label: "9 Brazilian Cities", subtitle: "Nationwide coverage" },
  { icon: Shield, label: "Best Price Guarantee", subtitle: "Or we match it" },
  { icon: Headphones, label: "24/7 Support", subtitle: "Always here for you" },
  { icon: Star, label: "271K+ Flights", subtitle: "In our database" },
];

const flightTypes = [
  { value: "economic", label: "Economic" },
  { value: "premium", label: "Premium" },
  { value: "firstClass", label: "First Class" },
];

const dayOptions = [1, 2, 3, 4];

/* ── Trip Card Component ── */
function TripCard({ trip, budget }: { trip: TripRecommendation; budget: number }) {
  return (
    <div className="group rounded-radius-xl border border-border-default bg-surface overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-border-emphasis">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              {trip.destination}
            </h3>
            <p className="text-sm text-primary-100">
              {trip.outboundFlight.from} → {trip.destination}
            </p>
          </div>
          {trip.savingsPercent > 0 && (
            <Badge variant="success" icon={<TrendingDown className="h-3 w-3" />}>
              Save {trip.savingsPercent}%
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Outbound Flight */}
        <div className="flex items-center gap-3 rounded-radius-md bg-surface-sunken p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-primary-50 shrink-0">
            <Plane className="h-4 w-4 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              ✈️ {trip.outboundFlight.from} → {trip.outboundFlight.to}
            </p>
            <p className="text-xs text-text-muted">
              {trip.outboundFlight.agency} · {trip.outboundFlight.time} · {trip.outboundFlight.distance}km
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-text-primary shrink-0">
            R${trip.outboundFlight.price}
          </span>
        </div>

        {/* Return Flight */}
        <div className="flex items-center gap-3 rounded-radius-md bg-surface-sunken p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-accent-50 shrink-0">
            <Plane className="h-4 w-4 text-accent-500 rotate-180" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              ✈️ {trip.returnFlight.from} → {trip.returnFlight.to}
            </p>
            <p className="text-xs text-text-muted">
              {trip.returnFlight.agency} · {trip.returnFlight.time} · {trip.returnFlight.distance}km
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-text-primary shrink-0">
            R${trip.returnFlight.price}
          </span>
        </div>

        {/* Hotel */}
        <div className="flex items-center gap-3 rounded-radius-md bg-surface-sunken p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-gold-50 shrink-0">
            <Hotel className="h-4 w-4 text-gold-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              🏨 {trip.hotel.name}
            </p>
            <p className="text-xs text-text-muted">
              {trip.hotel.days} {trip.hotel.days === 1 ? "night" : "nights"} · R${trip.hotel.price}/night
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-text-primary shrink-0">
            R${trip.hotel.total}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-default" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Total Cost</p>
            <p className="font-mono text-2xl font-bold text-primary-500">
              R${trip.totalCost.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Budget: R${budget.toLocaleString()}</p>
            <p className="text-sm font-semibold text-success">
              Save R${trip.savings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Loading Skeletons ── */
function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-radius-xl border border-border-default bg-surface overflow-hidden">
          <Skeleton className="h-20 rounded-none" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-14 rounded-radius-md" />
            <Skeleton className="h-14 rounded-radius-md" />
            <Skeleton className="h-14 rounded-radius-md" />
            <div className="h-px bg-border-default" />
            <div className="flex justify-between">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function Home() {
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [budget, setBudget] = useState("1500");
  const [days, setDays] = useState("2");
  const [flightType, setFlightType] = useState("economic");
  const [results, setResults] = useState<TripRecommendation[]>([]);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingCities, setLoadingCities] = useState(true);

  // Load cities on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("flights")
          .select("from")
          .limit(1000);

        if (data) {
          const unique = [...new Set(data.map((f: { from: string }) => f.from))].sort() as string[];
          setCities(unique);
          if (unique.length > 0) setSelectedCity(unique[0]);
        }
      } catch {
        // Fallback if query fails
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCity) return;

    setSearching(true);
    setHasSearched(true);
    setResults([]);
    setMessage("");

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selectedCity,
          budget: Number(budget),
          days: Number(days),
          flightType,
        }),
      });
      const data = await res.json();
      setResults(data.recommendations || []);
      setMessage(data.message || "");
    } catch {
      setMessage("Failed to search. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="main-content" className="flex-1">
        {/* ════════════════════════════════
            HERO SECTION
           ════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500 pb-32 pt-16 lg:pt-24">
          {/* Atmospheric shapes */}
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
                AI-Powered Travel Planning
              </Badge>
              <h1 className="text-display text-white mb-6 !text-4xl md:!text-5xl lg:!text-[56px] lg:!leading-[64px]">
                Find your perfect{" "}
                <span className="relative">
                  <span className="text-accent-400">trip package</span>
                  <svg className="absolute -bottom-1 left-0 w-full h-2 text-accent-400/40" viewBox="0 0 200 8" preserveAspectRatio="none">
                    <path d="M0 7 Q50 0 100 5 T200 3" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </span>{" "}
                in Brazil
              </h1>
              <p className="text-lg text-primary-100/90 max-w-xl mx-auto">
                Search flights + hotels across 9 Brazilian cities. Set your budget
                and we&apos;ll find the best trip packages for you.
              </p>
            </div>

            {/* ── Search Form ── */}
            <form onSubmit={handleSearch} className="mx-auto max-w-4xl animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <div className="rounded-radius-xl bg-surface/95 backdrop-blur-xl p-4 shadow-xl border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* From city */}
                  <div className="relative">
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      Departure City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        disabled={loadingCities}
                        className="w-full appearance-none rounded-radius-md border border-border-default bg-surface-sunken pl-10 pr-8 py-3 text-sm font-medium text-text-primary hover:border-border-emphasis transition-colors focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                      >
                        {loadingCities ? (
                          <option>Loading cities...</option>
                        ) : (
                          cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      Budget (R$)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        min={200}
                        max={50000}
                        className="w-full rounded-radius-md border border-border-default bg-surface-sunken pl-10 pr-4 py-3 text-sm font-medium text-text-primary hover:border-border-emphasis transition-colors focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                        placeholder="1500"
                        required
                      />
                    </div>
                  </div>

                  {/* Days */}
                  <div>
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      Nights
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <select
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="w-full appearance-none rounded-radius-md border border-border-default bg-surface-sunken pl-10 pr-8 py-3 text-sm font-medium text-text-primary hover:border-border-emphasis transition-colors focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                      >
                        {dayOptions.map((d) => (
                          <option key={d} value={d}>
                            {d} {d === 1 ? "night" : "nights"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Flight type + search */}
                  <div>
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1 block px-1">
                      Class
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <select
                          value={flightType}
                          onChange={(e) => setFlightType(e.target.value)}
                          className="w-full appearance-none rounded-radius-md border border-border-default bg-surface-sunken pl-10 pr-8 py-3 text-sm font-medium text-text-primary hover:border-border-emphasis transition-colors focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
                        >
                          {flightTypes.map(({ value, label }) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                      </div>
                      <Button
                        variant="primary"
                        size="lg"
                        className="h-auto px-5 shrink-0"
                        disabled={searching || loadingCities}
                      >
                        {searching ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <Search className="h-4.5 w-4.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" className="w-full text-background">
              <path d="M0 60L60 52C120 44 240 28 360 20C480 12 600 12 720 16C840 20 960 28 1080 32C1200 36 1320 36 1380 36L1440 36V60H0Z" fill="currentColor" />
            </svg>
          </div>
        </section>

        {/* ════════════════════════════════
            SEARCH RESULTS
           ════════════════════════════════ */}
        {hasSearched && (
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-overline text-accent-500 mb-2">RESULTS</p>
                  <h2 className="text-h2 text-text-primary">
                    {searching
                      ? "Searching for packages..."
                      : results.length > 0
                        ? `${results.length} Trip Package${results.length !== 1 ? "s" : ""} Found`
                        : "No Packages Found"}
                  </h2>
                  <p className="text-body text-text-tertiary mt-2 max-w-lg">
                    {searching
                      ? "Analyzing flights and hotels to find the best deals..."
                      : results.length > 0
                        ? `Best trip packages from ${selectedCity} within R$${Number(budget).toLocaleString()} budget`
                        : message || "Try adjusting your budget or search criteria"}
                  </p>
                </div>
              </div>

              {searching ? (
                <ResultsSkeleton />
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.map((trip, i) => (
                    <div key={`${trip.destination}-${i}`} className="stagger-item">
                      <TripCard trip={trip} budget={Number(budget)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                  <Compass className="h-12 w-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-h4 text-text-primary mb-2">No packages available</h3>
                  <p className="text-body text-text-muted max-w-md mx-auto mb-6">
                    {message || "Try increasing your budget, changing the flight class, or selecting a different departure city."}
                  </p>
                  <div className="flex items-center justify-center gap-3 text-sm text-text-muted">
                    <span>💡 Suggestions:</span>
                    <Badge variant="neutral">Increase budget to R$2000+</Badge>
                    <Badge variant="neutral">Try Economic class</Badge>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ════════════════════════════════
            TRUST BAR
           ════════════════════════════════ */}
        <section className="py-8 border-b border-border-subtle">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trustItems.map(({ icon: Icon, label, subtitle }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-radius-lg bg-primary-50 text-primary-500 dark:bg-primary-50 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{label}</p>
                    <p className="text-xs text-text-muted">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            JOURNEY TIMELINE SHOWCASE
           ════════════════════════════════ */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <p className="text-overline text-accent-500 mb-2">HOW IT WORKS</p>
              <h2 className="text-h2 text-text-primary mb-4">
                Your journey, stamped and tracked
              </h2>
              <p className="text-body-lg text-text-tertiary">
                From first inspiration to boarding pass — we track every milestone of your trip with our signature Journey Timeline.
              </p>
            </div>

            <div className="flex justify-center">
              <JourneyTimeline stages={timelineStages} />
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Set Your Budget",
                  desc: "Choose your departure city, budget, hotel nights, and flight class. Our engine searches 271K+ flights and 40K+ hotels.",
                },
                {
                  step: "2",
                  title: "Compare Packages",
                  desc: "See complete trip packages side by side — flights + hotels bundled with transparent pricing and savings.",
                },
                {
                  step: "3",
                  title: "Save & Book",
                  desc: "Save your favorite packages, track them in your trips, and book when you're ready to go.",
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

        {/* ════════════════════════════════
            CTA SECTION
           ════════════════════════════════ */}
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
              Join millions of travelers who trust TravelTwin for the best deals, transparent pricing, and AI-powered trip planning.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/explore">
                <Button variant="primary" size="lg" className="!bg-accent-500 hover:!bg-accent-600 !text-white">
                  <Sparkles className="h-4 w-4" />
                  Start Exploring
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
