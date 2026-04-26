"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchProgressHeader } from "@/components/deals/SearchProgressHeader";
import { DealCardSkeleton } from "@/components/deals/DealCardSkeleton";
import { useSearchProgress } from "@/hooks/useSearchProgress";
import { FiltersModal } from "@/components/search/FiltersModal";
import { ActiveFiltersChips } from "@/components/filters/ActiveFiltersChips";
import { useFiltersStore } from "@/stores/filtersStore";
import { enrichDeals } from "@/lib/dealEnrichment";
import { filterDeals } from "@/lib/filterDeals";
import type { TripPackage } from "@/app/api/ai/plan-trip/route";
import {
  Plane,
  Hotel,
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  Shield,
  Headphones,
  Star,
  Loader2,
  Heart,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Send,
  Compass,
  Bookmark,
  AlertCircle,
  Palmtree,
  Mountain,
  Building2,
  Gem,
  Globe2,
} from "lucide-react";
import { PlanTripWizard } from "@/components/search/PlanTripWizard";
import { TripCard } from "@/components/results/TripCard";
import { getCityImageByIata } from "@/lib/cityImages";
import { useUserLocation } from "@/hooks/useUserLocation";


/* ── Category tabs ── */
const categoryTabs = [
  { id: "trips", label: "Trips", icon: Plane },
  { id: "for-you", label: "For you", icon: Star },
  { id: "weekend", label: "Weekend", icon: Sparkles },
  { id: "beach", label: "Beach", icon: Palmtree },
  { id: "multi-city", label: "Multi city", icon: Building2 },
  { id: "snow", label: "Snow", icon: Mountain },
  { id: "hidden-gems", label: "Hidden Gems", icon: Gem },
  { id: "intercontinental", label: "Intercontinental", icon: Globe2 },
];

/* ── Offer banner texts ── */
const offerTexts = [
  "Save up to 80% on Hotels",
  "Flight + Hotel = Bigger savings",
  "Limited-time Hotel Deals",
  "Save up to 80% on Hotels",
  "Flight + Hotel = Bigger savings",
  "Limited-time Hotel Deals",
];

/* ── Feature cards ── */
const featureCards = [
  {
    icon: Headphones,
    title: "We are here for you",
    description: "Customer support available 24/7 via chat, email, and phone. We speak your language.",
  },
  {
    icon: Star,
    title: "Google Reviews 4.6",
    description: "Rated excellent by thousands of travelers worldwide. Real reviews, real experiences.",
  },
  {
    icon: Shield,
    title: "Found it here? Book it here!",
    description: "Best price guarantee. If you find a lower price, we'll match it. No questions asked.",
  },
];

/* ═══════════════════════════════════════
   MAIN HOME PAGE
   ═══════════════════════════════════════ */
export default function Home() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Filter store (category + modal filters)
  const {
    activeCategory,
    setActiveCategory,
    resetFilters,
    getActiveFiltersCount,
    sortBy,
    durationGroups,
    maxStops,
    transport,
    placesToAvoid,
    travelStyles,
    tripType,
  } = useFiltersStore();
  const activeFiltersCount = getActiveFiltersCount();

  // Location-based deals
  const { airport, loading: locLoading } = useUserLocation();
  const [dealPackages, setDealPackages] = useState<TripPackage[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const isDealsLoading = locLoading || dealsLoading;
  const progress = useSearchProgress({ isLoading: isDealsLoading, estimatedDuration: 4000 });

  // Enrich raw packages with category tags (memoised — only recalcs when packages change)
  const enrichedDeals = useMemo(() => enrichDeals(dealPackages), [dealPackages]);

  // Apply all active filters (memoised — instant, client-side)
  const filteredDeals = useMemo(
    () =>
      filterDeals(enrichedDeals, {
        activeCategory,
        sortBy,
        durationGroups,
        maxStops,
        transport,
        placesToAvoid,
        travelStyles,
        tripType,
      }),
    [enrichedDeals, activeCategory, sortBy, durationGroups, maxStops,
     transport, placesToAvoid, travelStyles, tripType]
  );

  // Shuffle on mount / when new data arrives; skip when user has an explicit sort active
  const displayDeals = useMemo(() => {
    if (sortBy !== null) return filteredDeals;
    const shuffled = [...filteredDeals];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDeals, sortBy]);

  useEffect(() => {
    if (!airport?.iataCode) return;
    let cancelled = false;
    setDealsLoading(true);
    fetch(`/api/deals/from/${airport.iataCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const pkgs = data.packages || [];
          setDealPackages(pkgs);
          // Store each deal individually — do NOT touch planResults (reserved for AI planner)
          if (pkgs.length) {
            try {
              pkgs.forEach((pkg: any) => {
                sessionStorage.setItem(`trip_${pkg.id}`, JSON.stringify(pkg));
              });
            } catch { /* ignore storage errors */ }
          }
        }
      })
      .catch(() => { if (!cancelled) setDealPackages([]); })
      .finally(() => { if (!cancelled) setDealsLoading(false); });
    return () => { cancelled = true; };
  }, [airport?.iataCode]);

  return (
    <>
      {/* ═══════════ 1. HERO SECTION ═══════════ */}
      <section className="relative bg-secondary-500 pt-24 pb-24 sm:pt-32 sm:pb-32 lg:pt-44 lg:pb-44" style={{ overflow: 'visible' }}>
        {/* Background image with gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=1080&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8">
          {/* Hero text — centered */}
          <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-2 mb-6 border border-white/20">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-medium text-white/90">AI-Powered Trip Planning</span>
            </div>
            <h1 className="font-display font-extrabold text-white mb-4 sm:mb-5 text-[32px] leading-[38px] sm:text-[48px] sm:leading-[56px] lg:text-[64px] lg:leading-[72px] tracking-tight" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.35)' }}>
              Your dream vacation,<br />planned by AI
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-xl mx-auto font-medium mb-10" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.2)' }}>
              Tell us where you&apos;re from, your budget, and what you love — we&apos;ll find the perfect trip and build your itinerary
            </p>

            {/* CTA Button */}
            <button
              onClick={() => setWizardOpen(true)}
              className="group relative inline-flex items-center gap-3 rounded-full bg-primary-500 px-10 py-5 text-lg font-bold text-white shadow-2xl hover:bg-primary-600 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
              style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1) inset' }}
            >
              <Plane className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-12" />
              Plan My Trip
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

          </div>
        </div>
      </section>

      {/* ═══════════ 2. OFFERS SCROLLING BANNER ═══════════ */}
      <section className="bg-primary-500 overflow-hidden py-3">
        <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
          {offerTexts.concat(offerTexts).map((text, i) => (
            <span key={i} className="flex items-center gap-3 text-sm font-semibold text-white">
              <span className="text-white/60">•</span>
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* ═══════════ 3. CATEGORY TABS + FILTERS BUTTON ═══════════ */}
      <section className="border-b border-neutral-200 dark:border-border-default bg-white dark:bg-surface">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="flex items-center gap-2">
            {/* Scrollable tab strip */}
            <div className="flex flex-1 items-center overflow-x-auto no-scrollbar">
              {categoryTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeCategory === id}
                  onClick={() => {
                    setActiveCategory(id);
                    setVisibleCount(12);
                  }}
                  className={`relative flex flex-shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-colors duration-200 ${
                    activeCategory === id
                      ? "text-primary-500"
                      : "text-text-secondary hover:text-text-primary dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {activeCategory === id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Filters button */}
            <div className="flex-shrink-0 border-l border-neutral-200 dark:border-border-default pl-3">
              <button
                onClick={() => setIsFiltersOpen(true)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activeFiltersCount > 0
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    : "border-neutral-200 dark:border-neutral-700 text-text-secondary dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 4. CHEAPEST DEALS (location-aware) ═══════════ */}
      <section className="py-10 lg:py-14 bg-neutral-50 dark:bg-surface-sunken">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <SearchProgressHeader
            isLoading={isDealsLoading}
            progress={progress}
            city={airport?.cityName || "your location"}
            resultsCount={displayDeals.length}
            totalCount={enrichedDeals.length > displayDeals.length ? enrichedDeals.length : undefined}
          />

          {/* Active filter chips */}
          {!isDealsLoading && enrichedDeals.length > 0 && (
            <ActiveFiltersChips />
          )}

          {/* Empty state when filters return 0 results but data exists */}
          {!isDealsLoading && enrichedDeals.length > 0 && displayDeals.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                No deals match your filters
              </p>
              <p className="text-sm text-text-secondary mb-6">
                Try adjusting your filters or resetting them.
              </p>
              <button
                onClick={() => { resetFilters(); setVisibleCount(12); }}
                className="rounded-xl border-2 border-primary-500 px-6 py-2.5 font-semibold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                Reset filters
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {isDealsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <DealCardSkeleton key={`skel-${i}`} delay={i * 0.06} />
                ))
              ) : displayDeals.length > 0 ? (
                displayDeals.slice(0, visibleCount).map((pkg, i) => (
                  <motion.div
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, delay: i * 0.07, ease: 'easeOut' }}
                  >
                    <TripCard
                      id={pkg.id}
                      destination={pkg.destination.iata}
                      destinationCity={pkg.destination.city}
                      origin={airport?.iataCode || ""}
                      originCity={airport?.cityName || ""}
                      imageUrl={getCityImageByIata(pkg.destination.iata)}
                      days={pkg.nights}
                      departureDate={pkg.hotel?.checkIn || ""}
                      returnDate={pkg.hotel?.checkOut || ""}
                      originalPrice={Math.round(pkg.totalPrice * 1.25)}
                      discountedPrice={pkg.totalPrice}
                      currency={pkg.currency}
                      isDirect={pkg.flight?.stops === 0}
                      travelers={1}
                      badge={i === 0 ? "Cheapest" : undefined}
                    />
                  </motion.div>
                ))
              ) : null}
            </AnimatePresence>
          </div>

          {!isDealsLoading && visibleCount < displayDeals.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setVisibleCount(c => c + 6)}
                className="rounded-xl border-2 border-primary-500 bg-white dark:bg-transparent px-8 py-3 font-semibold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                Show {Math.min(6, displayDeals.length - visibleCount)} more deals
              </button>
            </div>
          )}

          {!isDealsLoading && dealPackages.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { code: "LHR", city: "London" },
                { code: "CDG", city: "Paris" },
                { code: "FCO", city: "Rome" },
                { code: "BCN", city: "Barcelona" },
                { code: "AMS", city: "Amsterdam" },
                { code: "IST", city: "Istanbul" },
              ].map(({ code, city }, i) => {
                const basePrices = [480, 350, 420, 380, 310, 450];
                const discountPrices = [299, 219, 269, 239, 199, 279];
                return (
                  <div key={code} className="stagger-item">
                    <TripCard
                      id={`sample-${code}`}
                      destination={code}
                      destinationCity={city}
                      origin={airport?.iataCode || ""}
                      originCity={airport?.cityName || "Your City"}
                      imageUrl={getCityImageByIata(code)}
                      days={5}
                      departureDate="2026-04-01"
                      returnDate="2026-04-05"
                      originalPrice={basePrices[i]}
                      discountedPrice={discountPrices[i]}
                      currency="EUR"
                      isDirect={i % 2 === 0}
                      travelers={2}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ 5. FEATURES SECTION ═══════════ */}
      <section className="py-12 lg:py-16 bg-white dark:bg-surface">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-xl border border-neutral-200 dark:border-border-default p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:bg-surface-elevated"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-500 shrink-0">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-secondary-500 mb-1">{title}</h3>
                  <p className="text-sm text-text-secondary">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 6. CREATE MORE TRIPS CTA ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 py-16 px-4">
          <div className="mx-auto max-w-[1280px] text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to plan your next adventure?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Let our AI find the perfect trip for you — flights, hotels, and a day-by-day itinerary
            </p>
            <button
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-14 rounded-full bg-white text-primary-500 px-8 shadow-xl hover:scale-110 transition-transform duration-300 font-bold text-lg"
            >
              <Plane className="h-6 w-6" />
              Plan My Trip
            </button>
          </div>
        </div>
      </section>

      {/* Plan My Trip Wizard */}
      <PlanTripWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />

      {/* Filters Modal */}
      <FiltersModal
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        onApply={() => setVisibleCount(12)}
      />
    </>
  );
}
