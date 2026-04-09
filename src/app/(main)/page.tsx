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
import { PlanTripWizard } from "@/components/search/PlanTripWizard";
import { TripCard } from "@/components/results/TripCard";
import { getCityImageByIata } from "@/lib/cityImages";


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

/* ═══════════════════════════════════════
   MAIN HOME PAGE
   ═══════════════════════════════════════ */
export default function Home() {
  const [activeTab, setActiveTab] = useState("for-you");
  const [email, setEmail] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

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

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-8 text-white/60 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Free to use
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                AI-powered
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                400+ airlines
              </span>
            </div>
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
          </div>
        </div>
      </section>

      {/* ═══════════ 4. POPULAR TRIPS ═══════════ */}
      <section className="py-10 lg:py-14 bg-neutral-50 dark:bg-surface-sunken">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-h2 text-secondary-500">Popular Trips</h2>
              <p className="text-body-sm text-text-secondary mt-1">
                Click &quot;Plan My Trip&quot; above to get personalized AI-powered recommendations
              </p>
            </div>
          </div>
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
                    origin=""
                    originCity="Your City"
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
            {[
              { code: "VIE", city: "Vienna", orig: 520, disc: 411 },
              { code: "PRG", city: "Prague", orig: 475, disc: 363 },
            ].map(({ code, city, orig, disc }) => (
              <TripCard
                key={code}
                id={`promo-${code}`}
                destination={code}
                destinationCity={city}
                origin=""
                originCity="Your City"
                imageUrl={getCityImageByIata(code)}
                days={4}
                departureDate="2026-04-10"
                returnDate="2026-04-14"
                originalPrice={orig}
                discountedPrice={disc}
                currency="EUR"
                isDirect={false}
                travelers={2}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 7. CREATE MORE TRIPS CTA ═══════════ */}
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

      {/* Plan My Trip Wizard */}
      <PlanTripWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}
