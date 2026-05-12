"use client";

import { useState } from "react";
import {
  ArrowLeft, Plane, Clock, Briefcase, CreditCard, Shield,
  ChevronUp, ChevronDown, Check, Luggage, Wifi, Coffee,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const FARE_OPTIONS = [
  {
    name: "Economy Light",
    price: 487,
    bags: "Carry-on only",
    change: "No changes",
    perks: ["Standard seat", "In-flight entertainment"],
  },
  {
    name: "Economy Flex",
    price: 612,
    bags: "1 checked bag (23kg)",
    change: "Free changes",
    perks: ["Choose your seat", "Meal included", "Priority boarding"],
    highlight: true,
  },
  {
    name: "Business",
    price: 2340,
    bags: "2 checked bags (32kg)",
    change: "Free changes & refunds",
    perks: ["Lie-flat seat", "Premium meals", "Lounge access", "Express security"],
  },
];

export default function FlightDetailPage() {
  const [selectedFare, setSelectedFare] = useState(1);
  const [pricingExpanded, setPricingExpanded] = useState(true);

  const fare = FARE_OPTIONS[selectedFare];
  const taxesAndFees = Math.round(fare.price * 0.18 * 100) / 100;
  const total = fare.price + taxesAndFees;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=600&fit=crop&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-700/85 via-secondary-700/70 to-secondary-700/40" />
        <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8 py-12 lg:py-16">
          <Link
            href="/flights"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Link>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white">
            New York → London
          </h1>
          <p className="text-white/80 mt-2 text-lg">
            06:30 – 14:45 · 7h 15m · Round trip · 1 adult
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Outbound */}
            <section className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500 px-3 py-1 text-xs font-semibold">
                  Outbound
                </span>
                <span className="text-sm text-text-muted">Saturday, March 15</span>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                  <Plane className="h-6 w-6 text-primary-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-secondary-500 dark:text-white">Emirates</p>
                  <p className="text-sm text-text-muted">EK 201 · Boeing 777-300ER</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="font-mono text-3xl font-extrabold text-text-primary">06:30</p>
                  <p className="text-sm font-bold text-text-secondary mt-1">JFK</p>
                  <p className="text-xs text-text-muted">New York</p>
                </div>

                <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    7h 15m
                  </div>
                  <div className="w-full relative h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-border-emphasis to-transparent">
                    <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-primary-500 rotate-90 bg-white dark:bg-surface px-0.5" />
                  </div>
                  <span className="rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-0.5 text-[10px] font-semibold">
                    Direct
                  </span>
                </div>

                <div className="text-center">
                  <p className="font-mono text-3xl font-extrabold text-text-primary">14:45</p>
                  <p className="text-sm font-bold text-text-secondary mt-1">LHR</p>
                  <p className="text-xs text-text-muted">London</p>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-border-default flex flex-wrap gap-3 text-xs text-text-secondary">
                <span className="flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" /> Wi-Fi onboard</span>
                <span className="flex items-center gap-1.5"><Coffee className="h-3.5 w-3.5" /> Meal included</span>
                <span className="flex items-center gap-1.5"><Luggage className="h-3.5 w-3.5" /> Cabin baggage</span>
              </div>
            </section>

            {/* Return */}
            <section className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 text-xs font-semibold">
                  Return
                </span>
                <span className="text-sm text-text-muted">Saturday, March 22</span>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                  <Plane className="h-6 w-6 text-primary-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-secondary-500 dark:text-white">Emirates</p>
                  <p className="text-sm text-text-muted">EK 202 · Boeing 777-300ER</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="font-mono text-3xl font-extrabold text-text-primary">10:30</p>
                  <p className="text-sm font-bold text-text-secondary mt-1">LHR</p>
                  <p className="text-xs text-text-muted">London</p>
                </div>

                <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    8h 25m
                  </div>
                  <div className="w-full relative h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-border-emphasis to-transparent">
                    <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-primary-500 -rotate-90 bg-white dark:bg-surface px-0.5" />
                  </div>
                  <span className="rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-0.5 text-[10px] font-semibold">
                    Direct
                  </span>
                </div>

                <div className="text-center">
                  <p className="font-mono text-3xl font-extrabold text-text-primary">13:55</p>
                  <p className="text-sm font-bold text-text-secondary mt-1">JFK</p>
                  <p className="text-xs text-text-muted">New York</p>
                </div>
              </div>
            </section>

            {/* Choose your fare */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 dark:text-white mb-4">Choose your fare</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FARE_OPTIONS.map((f, idx) => (
                  <button
                    type="button"
                    key={f.name}
                    onClick={() => setSelectedFare(idx)}
                    className={`relative rounded-2xl border-2 p-5 text-left transition-all ${
                      selectedFare === idx
                        ? "border-primary-500 bg-primary-50/40 dark:bg-primary-900/10 shadow-md"
                        : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300"
                    }`}
                  >
                    {f.highlight && selectedFare !== idx && (
                      <span className="absolute -top-2 right-4 rounded-full bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5">
                        BEST VALUE
                      </span>
                    )}
                    <p className="font-bold text-secondary-500 dark:text-white">{f.name}</p>
                    <p className="font-mono text-2xl font-extrabold text-primary-500 mt-1 mb-3">
                      ${f.price}
                    </p>
                    <ul className="space-y-1.5 text-xs text-text-secondary">
                      <li className="flex items-start gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 mt-0.5 shrink-0 text-text-muted" />
                        {f.bags}
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 mt-0.5 shrink-0 text-text-muted" />
                        {f.change}
                      </li>
                      {f.perks.map((p) => (
                        <li key={p} className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right column — sticky sidebar (1/3) */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">

              {/* Price card */}
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden shadow-md">
                <button
                  type="button"
                  onClick={() => setPricingExpanded((v) => !v)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide">Total Price</p>
                    <motion.p
                      key={total}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 18 }}
                      className="text-3xl font-extrabold text-primary-500"
                    >
                      ${total.toFixed(2)}
                    </motion.p>
                    <p className="text-xs text-text-muted mt-0.5">
                      1 adult · {fare.name} · all included
                    </p>
                  </div>
                  {pricingExpanded ? (
                    <ChevronUp className="h-5 w-5 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-text-muted" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {pricingExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="border-t border-neutral-100 dark:border-border-default overflow-hidden"
                    >
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                              <Plane className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="text-sm text-text-secondary">Flight (1 adult)</span>
                          </div>
                          <span className="text-sm font-semibold text-text-primary">
                            ${fare.price.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-neutral-100 dark:bg-surface-elevated rounded-lg flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-text-muted" />
                            </div>
                            <span className="text-sm text-text-secondary">Taxes &amp; fees</span>
                          </div>
                          <span className="text-sm font-semibold text-text-primary">
                            ${taxesAndFees.toFixed(2)}
                          </span>
                        </div>

                        <div className="border-t border-neutral-200 dark:border-border-default pt-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-text-primary">Total</span>
                          <span className="text-lg font-extrabold text-primary-500">
                            ${total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <Link
                          href={`/booking/simulate?type=flight&fare=${fare.name.replace(/ /g, "_")}&total=${total}`}
                          className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                          Book Now — ${total.toFixed(2)}
                        </Link>
                        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-text-muted">
                          <Shield className="h-3.5 w-3.5 text-green-500" />
                          Secure checkout · Free cancellation 24h
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* What's included card */}
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-3">What&apos;s included</p>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    Round-trip flights
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    {fare.bags}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    {fare.change}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    All taxes &amp; airport fees
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
