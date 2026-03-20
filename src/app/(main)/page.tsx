"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plane,
  Hotel,
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  Globe,
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
  CheckCircle2,
  AlertCircle,
  Zap,
  Palmtree,
  Mountain,
  Building2,
  Gem,
  Globe2,
} from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { TripCard } from "@/components/results/TripCard";
import { FiltersModal } from "@/components/search/FiltersModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, formatDuration } from "@/lib/hotelImages";
import type { NormalizedFlight, NormalizedHotel } from "@/lib/supabase/types";

/* ── Destination images ── */
const destinationImages: Record<string, string> = {
  LON: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop",
  PAR: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop",
  ROM: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=400&fit=crop",
  BCN: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop",
  AMS: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&h=400&fit=crop",
  IST: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=400&fit=crop",
  ATH: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&h=400&fit=crop",
  MAD: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=400&fit=crop",
  VIE: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600&h=400&fit=crop",
  PRG: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=600&h=400&fit=crop",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600&h=400&fit=crop",
  BER: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&h=400&fit=crop",
};
const defaultImage = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=400&fit=crop";

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

/* ── Travel articles ── */
const articles = [
  { title: "How to plan a micro-trip", image: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=400&h=300&fit=crop", tag: "Inspiration" },
  { title: "Best hidden beaches in Europe", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop", tag: "Top Lists" },
  { title: "Last minute deals: how to score big", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop", tag: "Deals" },
  { title: "Solo traveling made simple", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=300&fit=crop", tag: "Guides" },
];

/* ── Affordable package categories ── */
const packageCategories = ["Weekend", "Beach", "Single city", "Multi city", "Snow", "Bus and Train"];

/* ── Results Skeleton ── */
function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden">
          <Skeleton className="h-44 rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between items-end pt-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN HOME PAGE
   ═══════════════════════════════════════ */
export default function Home() {
  const [activeTab, setActiveTab] = useState("for-you");
  const [showFilters, setShowFilters] = useState(false);
  const [email, setEmail] = useState("");

  // Live search state
  const [liveFlights, setLiveFlights] = useState<NormalizedFlight[]>([]);
  const [liveHotels, setLiveHotels] = useState<NormalizedHotel[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [warning, setWarning] = useState("");
  const [searchInfo, setSearchInfo] = useState({ origin: "", destination: "" });

  async function handleSearch(params: {
    originIata: string;
    originDisplay: string;
    destinationIata: string;
    destinationDisplay: string;
    departureDate: string;
    returnDate: string;
    adults: number;
    children: number;
  }) {
    if (!params.originIata) return;

    setSearching(true);
    setHasSearched(true);
    setLiveFlights([]);
    setLiveHotels([]);
    setWarning("");
    setSearchInfo({ origin: params.originDisplay, destination: params.destinationDisplay || "Anywhere" });

    const dest = params.destinationIata || "LON";

    try {
      const [flightsRes, hotelsRes] = await Promise.all([
        fetch(
          `/api/flights/live?origin=${params.originIata}&destination=${dest}&departureDate=${params.departureDate}&travelClass=ECONOMY`
        ),
        fetch(
          `/api/hotels/live?cityCode=${dest}&checkInDate=${params.departureDate}&checkOutDate=${params.returnDate}`
        ),
      ]);
      const flightsData = await flightsRes.json();
      const hotelsData = await hotelsRes.json();
      setLiveFlights(flightsData.flights || []);
      setLiveHotels(hotelsData.hotels || []);
      const warnings = [flightsData.warning, hotelsData.warning].filter(Boolean).join(" ");
      if (warnings) setWarning(warnings);
    } catch {
      setWarning("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  // Build trip cards from live data
  const tripCards = liveFlights.slice(0, 9).map((flight, index) => {
    const hotel = liveHotels[index % Math.max(1, liveHotels.length)];
    const nights = 5;
    const hotelCost = hotel ? hotel.pricePerNight * nights : 0;
    const totalCost = flight.price + hotelCost;
    const originalPrice = Math.round(totalCost * 1.2);
    const destImg = destinationImages[flight.destination] || defaultImage;

    return {
      id: `${flight.id}-${index}`,
      destination: flight.destination,
      destinationCity: flight.destinationCity || flight.destination,
      origin: flight.origin,
      originCity: flight.originCity || flight.origin,
      imageUrl: destImg,
      days: nights + 1,
      departureDate: flight.departureDate,
      returnDate: flight.arrivalDate || flight.departureDate,
      originalPrice,
      discountedPrice: Math.round(totalCost),
      currency: flight.currency,
      isDirect: flight.stops === 0,
      travelers: 1,
    };
  });

  return (
    <>
      {/* ═══════════ 1. HERO SECTION ═══════════ */}
      <section className="relative bg-secondary-500 pt-24 pb-24 sm:pt-28 sm:pb-28 lg:pt-36 lg:pb-36" style={{ overflow: 'visible' }}>
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
          {/* Stronger top gradient for header readability + bottom for text */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/50" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8">
          {/* Hero text — TRYP style */}
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-10 animate-fade-in-up">
            <h1 className="font-display font-extrabold text-white mb-3 sm:mb-4 text-[32px] leading-[38px] sm:text-[44px] sm:leading-[52px] lg:text-[56px] lg:leading-[64px] tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              Travel more, for less
            </h1>
            <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.2)' }}>
              Trains, buses, flights and stays combined with AI
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative z-40 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <SearchBar onSearch={handleSearch} loading={searching} />
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

      {/* ═══════════ 3. CATEGORY TABS ═══════════ */}
      <section className="border-b border-neutral-200 dark:border-border-default bg-white dark:bg-surface">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-3">
              {categoryTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${activeTab === id
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-text-secondary hover:bg-neutral-100 hover:text-text-primary"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-50 transition-colors shrink-0 ml-3"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ 4. SEARCH RESULTS / TRIP CARDS ═══════════ */}
      <section className="py-10 lg:py-14 bg-neutral-50 dark:bg-surface-sunken">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          {hasSearched && (
            <>
              {/* Warning */}
              {warning && (
                <div className="mb-6 flex items-start gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {warning}
                </div>
              )}

              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-h2 text-secondary-500">
                    {searching
                      ? "Searching live prices..."
                      : tripCards.length > 0
                        ? `${tripCards.length} Trip${tripCards.length !== 1 ? "s" : ""} Found`
                        : "No Results Found"}
                  </h2>
                  {!searching && searchInfo.origin && (
                    <p className="text-body-sm text-text-secondary mt-1">
                      {searchInfo.origin} → {searchInfo.destination}
                    </p>
                  )}
                </div>
                {!searching && tripCards.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Zap className="h-3.5 w-3.5 text-primary-500" />
                    Powered by Amadeus Live API
                  </div>
                )}
              </div>

              {searching ? (
                <ResultsSkeleton />
              ) : tripCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tripCards.map((card, i) => (
                    <div key={card.id} className="stagger-item">
                      <TripCard {...card} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 rounded-xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default">
                  <Compass className="h-12 w-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-h4 text-text-primary mb-2">No results found</h3>
                  <p className="text-body-sm text-text-muted max-w-md mx-auto">
                    Try different cities, dates, or destinations.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Default cards when no search */}
          {!hasSearched && (
            <>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-h2 text-secondary-500">Popular Trips</h2>
                  <p className="text-body-sm text-text-secondary mt-1">
                    Search above to find live deals from your city
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(destinationImages).slice(0, 6).map(([code, img], i) => {
                  const cities: Record<string, string> = {
                    LON: "London", PAR: "Paris", ROM: "Rome",
                    BCN: "Barcelona", AMS: "Amsterdam", IST: "Istanbul",
                  };
                  // Deterministic prices to avoid hydration mismatch
                  const basePrices = [480, 350, 420, 380, 310, 450];
                  const discountPrices = [299, 219, 269, 239, 199, 279];
                  return (
                    <div key={code} className="stagger-item">
                      <TripCard
                        id={`sample-${code}`}
                        destination={code}
                        destinationCity={cities[code] || code}
                        origin="CND"
                        originCity="Constanța"
                        imageUrl={img}
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
            </>
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

      {/* ═══════════ 6. APP PROMO SECTION ═══════════ */}
      <section className="py-12 lg:py-16 bg-neutral-50 dark:bg-surface-sunken">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Promo card */}
            <div className="relative rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-8 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <h3 className="text-2xl font-bold mb-2">
                  Get discounts<br />before anyone else
                </h3>
                <p className="text-sm text-white/80 mb-6">
                  Download our app for exclusive deals
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-black px-3 py-2 text-white text-xs font-medium">
                    App Store
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-black px-3 py-2 text-white text-xs font-medium">
                    Google Play
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4">
                  <span className="font-bold text-xl">TravelTwin</span>
                </div>
              </div>
            </div>

            {/* Featured trip cards */}
            {Object.entries(destinationImages).slice(6, 8).map(([code, img], i) => {
              const cities: Record<string, string> = {
                VIE: "Vienna", PRG: "Prague", LIS: "Lisbon",
                BER: "Berlin", ATH: "Athens", MAD: "Madrid",
              };
              // Deterministic prices to avoid hydration mismatch
              const promoOriginal = [520, 475];
              const promoDiscount = [411, 363];
              return (
                <TripCard
                  key={code}
                  id={`promo-${code}`}
                  destination={code}
                  destinationCity={cities[code] || code}
                  origin="CND"
                  originCity="Constanța"
                  imageUrl={img}
                  days={4}
                  departureDate="2026-04-10"
                  returnDate="2026-04-14"
                  originalPrice={promoOriginal[i]}
                  discountedPrice={promoDiscount[i]}
                  currency="EUR"
                  isDirect={false}
                  travelers={2}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ 7. CREATE MORE TRIPS CTA ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 py-16 px-4">
          <div className="mx-auto max-w-[1280px] text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Create More Trips
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Start planning your next adventure with AI-powered recommendations
            </p>
            <Link
              href="/trips/new"
              className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-white text-primary-500 shadow-xl hover:scale-110 transition-transform duration-300"
            >
              <Plus className="h-7 w-7" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ 8. AFFORDABLE PACKAGES ═══════════ */}
      <section className="py-12 lg:py-16 bg-white dark:bg-surface">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-h2 text-secondary-500 mb-3">
              Affordable travel packages
            </h2>
            <p className="text-body text-text-secondary max-w-2xl mx-auto">
              Discover our ready-made travel deals on TravelTwin! Browse the latest real flights and hotel offers
              using the biggest travel services in the world. Find the deal you
              love, check availability, and book the trip of your dreams.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {packageCategories.map((cat) => (
              <button
                key={cat}
                className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50 transition-all duration-200"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 9. TRAVEL ARTICLES ═══════════ */}
      <section className="py-12 lg:py-16 bg-neutral-50 dark:bg-surface-sunken">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-h2 text-secondary-500">Latest travel articles</h2>
            <button className="text-sm font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {articles.map((article) => (
              <div
                key={article.title}
                className="group rounded-xl overflow-hidden bg-white dark:bg-surface border border-neutral-200 dark:border-border-default transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 rounded-md bg-primary-500 px-2.5 py-1 text-xs font-bold text-white">
                    {article.tag}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-secondary-500 line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-3 text-primary-500 text-xs font-medium">
                    Read more <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 10. NEWSLETTER ═══════════ */}
      <section className="py-12 lg:py-16 bg-primary-500">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-white max-w-md">
              <h2 className="text-2xl font-bold mb-2">
                Don&apos;t miss out — get <span className="italic">AMAZING<br />TRAVEL DEALS</span> delivered straight<br />to your inbox!
              </h2>
            </div>
            <div className="flex items-center gap-3 w-full max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 rounded-xl border-0 px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button className="rounded-xl bg-secondary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-secondary-600 transition-colors whitespace-nowrap">
                Send me deals!
              </button>
            </div>
            <p className="text-xs text-white/60 mt-2 md:mt-0">
              By subscribing, you agree to our terms, privacy policy &amp; cookies.
            </p>
          </div>
        </div>
      </section>
      {/* Filters Modal */}
      <FiltersModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={(filters) => {
          console.log("Applied filters:", filters);
          setShowFilters(false);
        }}
      />
    </>
  );
}
