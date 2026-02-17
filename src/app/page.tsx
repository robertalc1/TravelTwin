"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plane,
  Hotel,
  Compass,
  Search,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
  Globe,
  Shield,
  Headphones,
  TrendingDown,
  Star,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";
import { cn } from "@/lib/utils";

/* ── Search Tabs ── */
const searchTabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "explore", label: "Explore", icon: Compass },
] as const;

type SearchTab = (typeof searchTabs)[number]["id"];

/* ── Mock Data ── */
const destinations = [
  { city: "Santorini", country: "Greece", image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80", price: 449, tag: "Popular" },
  { city: "Kyoto", country: "Japan", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", price: 689, tag: "Trending" },
  { city: "Marrakech", country: "Morocco", image: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80", price: 379, tag: "Great Deal" },
  { city: "Reykjavik", country: "Iceland", image: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80", price: 529, tag: "Adventure" },
  { city: "Bali", country: "Indonesia", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", price: 419, tag: "Relaxation" },
  { city: "Amalfi Coast", country: "Italy", image: "https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800&q=80", price: 599, tag: "Romantic" },
];

const deals = [
  { route: "NYC → London", airline: "Multiple", price: 287, originalPrice: 542, savings: 47, departure: "Mar 15", stops: "Direct" },
  { route: "LA → Tokyo", airline: "ANA", price: 498, originalPrice: 890, savings: 44, departure: "Apr 2", stops: "1 stop" },
  { route: "Chicago → Paris", airline: "Air France", price: 342, originalPrice: 620, savings: 45, departure: "Mar 28", stops: "Direct" },
  { route: "Miami → Cancún", airline: "JetBlue", price: 129, originalPrice: 245, savings: 47, departure: "Mar 10", stops: "Direct" },
];

const timelineStages = [
  { label: "Inspire", completed: true, icon: "✨" },
  { label: "Search", completed: true, icon: "🔍" },
  { label: "Compare", completed: true, icon: "⚖️" },
  { label: "Book", completed: false, icon: "🎫" },
  { label: "Travel", completed: false, icon: "✈️" },
];

const trustItems = [
  { icon: Globe, label: "1000+ Airlines", subtitle: "Worldwide coverage" },
  { icon: Shield, label: "Best Price Guarantee", subtitle: "Or we match it" },
  { icon: Headphones, label: "24/7 Support", subtitle: "Always here for you" },
  { icon: Star, label: "4.8★ Rating", subtitle: "Trusted by millions" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<SearchTab>("flights");

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
            {/* Subtle grid pattern */}
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
                Where will your next{" "}
                <span className="relative">
                  <span className="text-accent-400">journey</span>
                  <svg className="absolute -bottom-1 left-0 w-full h-2 text-accent-400/40" viewBox="0 0 200 8" preserveAspectRatio="none">
                    <path d="M0 7 Q50 0 100 5 T200 3" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </span>{" "}
                take you?
              </h1>
              <p className="text-lg text-primary-100/90 max-w-xl mx-auto">
                Discover, compare, and book flights and hotels from 1,000+ providers.
                Your trusted companion for every trip.
              </p>
            </div>

            {/* ── Search Form ── */}
            <div className="mx-auto max-w-4xl animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <div className="rounded-radius-xl bg-surface/95 backdrop-blur-xl p-2 shadow-xl border border-white/10">
                {/* Tabs */}
                <div className="flex gap-1 mb-3 px-2 pt-1">
                  {searchTabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        "flex items-center gap-2 rounded-radius-full px-5 py-2.5 text-sm font-semibold transition-all duration-200",
                        activeTab === id
                          ? "bg-primary-500 text-white shadow-sm"
                          : "text-text-secondary hover:bg-surface-sunken"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Search fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 px-2 pb-2">
                  {activeTab === "flights" ? (
                    <>
                      <div className="md:col-span-3">
                        <div className="flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                          <MapPin className="h-4 w-4 text-text-muted shrink-0" />
                          <div>
                            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">From</div>
                            <div className="text-sm font-medium text-text-primary">Anywhere</div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <div className="flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                          <MapPin className="h-4 w-4 text-accent-500 shrink-0" />
                          <div>
                            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">To</div>
                            <div className="text-sm font-medium text-text-primary">Anywhere</div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <div className="flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                          <Calendar className="h-4 w-4 text-text-muted shrink-0" />
                          <div>
                            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">When</div>
                            <div className="text-sm font-medium text-text-primary">Anytime</div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-3 flex gap-2">
                        <div className="flex-1 flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                          <Users className="h-4 w-4 text-text-muted shrink-0" />
                          <div>
                            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Who</div>
                            <div className="text-sm font-medium text-text-primary">1 Adult</div>
                          </div>
                        </div>
                        <Link href="/flights">
                          <Button variant="primary" size="lg" className="h-full px-5 shrink-0">
                            <Search className="h-4.5 w-4.5" />
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : activeTab === "hotels" ? (
                    <>
                      <div className="md:col-span-4">
                        <div className="flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                          <MapPin className="h-4 w-4 text-text-muted shrink-0" />
                          <div>
                            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Destination</div>
                            <div className="text-sm font-medium text-text-primary">Where are you going?</div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-4">
                        <div className="flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                          <Calendar className="h-4 w-4 text-text-muted shrink-0" />
                          <div>
                            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Check-in — Check-out</div>
                            <div className="text-sm font-medium text-text-primary">Select dates</div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-4 flex gap-2">
                        <div className="flex-1 flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                          <Users className="h-4 w-4 text-text-muted shrink-0" />
                          <div>
                            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Guests & Rooms</div>
                            <div className="text-sm font-medium text-text-primary">2 Adults, 1 Room</div>
                          </div>
                        </div>
                        <Link href="/hotels">
                          <Button variant="primary" size="lg" className="h-full px-5">
                            <Search className="h-4.5 w-4.5" />
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-12 flex gap-2">
                      <div className="flex-1 flex items-center gap-3 rounded-radius-md border border-border-default bg-surface-sunken px-4 py-3.5 hover:border-border-emphasis transition-colors">
                        <Sparkles className="h-4 w-4 text-accent-500 shrink-0" />
                        <div>
                          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">AI Trip Planner</div>
                          <div className="text-sm font-medium text-text-muted">Describe your dream trip — &quot;Beach getaway for 2 under $1000&quot;</div>
                        </div>
                      </div>
                      <Link href="/explore">
                        <Button variant="primary" size="lg" className="h-full px-6">
                          <Sparkles className="h-4 w-4" />
                          Explore
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" className="w-full text-background">
              <path d="M0 60L60 52C120 44 240 28 360 20C480 12 600 12 720 16C840 20 960 28 1080 32C1200 36 1320 36 1380 36L1440 36V60H0Z" fill="currentColor" />
            </svg>
          </div>
        </section>

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
            POPULAR DESTINATIONS — Asymmetric Bento Grid
           ════════════════════════════════ */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-overline text-accent-500 mb-2">DISCOVER</p>
                <h2 className="text-h2 text-text-primary">Popular Destinations</h2>
                <p className="text-body text-text-tertiary mt-2 max-w-lg">
                  Handpicked destinations loved by travelers worldwide
                </p>
              </div>
              <Link
                href="/explore"
                className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
              >
                View all destinations
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Bento Grid — asymmetric layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 auto-rows-[180px] md:auto-rows-[200px]">
              {destinations.map((dest, i) => {
                const spanClass =
                  i === 0
                    ? "col-span-2 row-span-2"
                    : i === 3
                      ? "col-span-2"
                      : "";
                return (
                  <Link
                    key={dest.city}
                    href="/explore"
                    className={cn(
                      "stagger-item group relative overflow-hidden rounded-radius-lg",
                      spanClass
                    )}
                  >
                    {/* Image */}
                    <div className="absolute inset-0">
                      <img
                        src={dest.image}
                        alt={`${dest.city}, ${dest.country}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading={i < 2 ? "eager" : "lazy"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="relative flex h-full flex-col justify-end p-4 lg:p-5">
                      <Badge
                        variant="accent"
                        className="self-start mb-2 text-[10px] !bg-white/20 !text-white backdrop-blur-sm"
                      >
                        {dest.tag}
                      </Badge>
                      <h3 className="font-display text-lg font-bold text-white lg:text-xl">
                        {dest.city}
                      </h3>
                      <p className="text-sm text-white/80">{dest.country}</p>
                      <p className="mt-1 text-sm font-semibold text-accent-400">
                        From ${dest.price}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            TRENDING DEALS
           ════════════════════════════════ */}
        <section className="py-16 bg-surface-sunken">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-overline text-accent-500 mb-2">SAVE BIG</p>
                <h2 className="text-h2 text-text-primary">Trending Flight Deals</h2>
                <p className="text-body text-text-tertiary mt-2">
                  The best fares we&apos;ve found this week
                </p>
              </div>
              <Link
                href="/flights"
                className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
              >
                See all deals
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {deals.map((deal, i) => (
                <Link
                  key={deal.route}
                  href="/flights"
                  className="stagger-item group rounded-radius-lg bg-surface border border-border-default p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="success" icon={<TrendingDown className="h-3 w-3" />}>
                      {deal.savings}% OFF
                    </Badge>
                    <span className="text-caption text-text-muted">{deal.departure}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-text-primary mb-1">
                    {deal.route}
                  </h3>
                  <p className="text-body-sm text-text-muted mb-4">
                    {deal.airline} · {deal.stops}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-primary-500">
                      ${deal.price}
                    </span>
                    <span className="text-sm text-text-muted line-through">
                      ${deal.originalPrice}
                    </span>
                  </div>
                </Link>
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
                  title: "Discover & Inspire",
                  desc: "Tell our AI what kind of trip you want. Beach retreat? Mountain adventure? We'll find the perfect match.",
                },
                {
                  step: "2",
                  title: "Compare & Choose",
                  desc: "See every option side by side with transparent pricing. No hidden fees, no tricks — just honest deals.",
                },
                {
                  step: "3",
                  title: "Book & Travel",
                  desc: "Secure your trip with confidence. Get your Journey Timeline stamp and start the countdown to departure.",
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
