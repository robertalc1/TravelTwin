"use client";

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
import PopularTrips from "@/components/features/PopularTrips";


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
  const [activeTab, setActiveTab] = useState("for-you");
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
      <PopularTrips />

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Plan My Trip Wizard */}
      <PlanTripWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}
