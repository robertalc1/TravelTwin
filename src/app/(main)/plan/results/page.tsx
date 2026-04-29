"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plane,
  Hotel,
  ArrowRight,
  Star,
  Clock,
  Users,
  Calendar,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import type { TripPackage } from "@/app/api/ai/plan-trip/route";
import { handleDestinationImageError, handleAirlineLogoError } from "@/lib/imageFallback";

interface PlanParams {
  originIata?: string;
  originDisplay?: string;
  nights?: number;
  adults?: number;
  children?: number;
  budget?: number;
  currency?: string;
}

export default function PlanResultsPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [params, setParams] = useState<PlanParams | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("planResults");
      if (!stored) {
        // Don't bounce silently — let the user see why they're empty.
        setMissing(true);
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(stored);
      if (!parsed?.packages || !Array.isArray(parsed.packages) || parsed.packages.length === 0) {
        setMissing(true);
        setLoaded(true);
        return;
      }
      setPackages(parsed.packages);
      setParams(parsed.params || null);
      setWarning(parsed.warning || null);
      setLoaded(true);
    } catch (e) {
      console.error("[plan/results] Failed to load session data:", e);
      setMissing(true);
      setLoaded(true);
    }
  }, [router]);

  if (missing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold text-secondary-500 mb-2">No results to show</h2>
          <p className="text-text-secondary mb-6">
            Your plan results were lost on refresh. Sign in to keep them across
            sessions, or run the planner again.
          </p>
          <button
            onClick={() => router.push("/plan")}
            className="rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-all"
          >
            Plan a new trip
          </button>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4">✈️</div>
          <p className="text-text-secondary">Loading your trips...</p>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-6">✈️</div>
          <h2 className="text-2xl font-bold text-secondary-500 mb-3">
            No flights available for these dates
          </h2>
          <p className="text-text-secondary mb-2 max-w-md mx-auto">
            We searched live prices but couldn{"'"}t find available
            flights and hotels for your selected dates and budget.
          </p>
          <p className="text-sm text-text-muted mb-8 max-w-sm mx-auto">
            Try selecting dates at least 2 weeks in the future,
            or increase your budget slightly.
          </p>
          <button
            onClick={() => router.push("/plan")}
            className="rounded-full bg-primary-500 px-8 py-3 font-semibold text-white hover:bg-primary-600 transition-all"
          >
            ← Try Different Dates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">

      <main className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-semibold text-primary-500 uppercase tracking-wider">AI Recommendations</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-secondary-500 mb-2">
            Your Personalized Trip Recommendations
          </h1>
          {params && (
            <p className="text-text-secondary">
              From <strong>{params.originDisplay || params.originIata || "your location"}</strong>
              {params.nights != null ? ` · ${params.nights} nights` : ""}
              {params.adults != null
                ? ` · ${(params.adults || 0) + (params.children || 0)} traveler${((params.adults || 0) + (params.children || 0)) !== 1 ? "s" : ""}`
                : ""}
              {params.budget != null && params.currency
                ? ` · Budget: ${params.currency} ${Number(params.budget).toLocaleString()}`
                : ""}
            </p>
          )}
        </div>

        {/* Warning banner */}
        {warning && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}

        {/* Package cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.id} pkg={pkg} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
}

function PackageCard({ pkg, index }: { pkg: TripPackage; index: number }) {
  const dest = pkg.destination;
  const heroUrl = `https://images.unsplash.com/${dest.imageId}?w=800&h=500&fit=crop&q=80`;

  const highlights: string[] = [];
  if (pkg.flight?.stops === 0) highlights.push("✈️ Direct flight");
  if (pkg.hotel?.stars) highlights.push(`⭐ ${pkg.hotel.stars}-star hotel`);
  if (pkg.destination.tags.includes("beach")) highlights.push("🏖 Beach destination");
  if (pkg.destination.tags.includes("culture")) highlights.push("🏛 Cultural hotspot");
  if (pkg.destination.tags.includes("food")) highlights.push("🍕 Food paradise");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      className="bg-white dark:bg-surface rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      {/* Hero image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={heroUrl}
          alt={`${dest.city}, ${dest.country}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleDestinationImageError}
        />
        {index === 0 && (
          <span className="absolute top-3 left-3 rounded-full bg-primary-500 px-3 py-1 text-xs font-bold text-white shadow-md">
            ⭐ Best Match
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-xl font-bold text-white">
            {pkg.nights} days in {dest.city}, {dest.country}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* AI description */}
        {pkg.aiContent?.whyThisTrip && (
          <p className="text-sm text-text-secondary mb-4 italic">
            {pkg.aiContent.whyThisTrip}
          </p>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {highlights.slice(0, 3).map(h => (
              <span key={h} className="text-xs bg-primary-50 dark:bg-primary-500/10 text-primary-600 rounded-full px-3 py-1">
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Price breakdown */}
        <div className="bg-neutral-50 dark:bg-surface-elevated rounded-xl p-4 mb-4 space-y-2">
          {pkg.flight && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-text-secondary">
                <Plane className="h-4 w-4" /> Flight
              </span>
              <span className="font-semibold">
                {pkg.currency} {pkg.flight.price.toLocaleString()}
              </span>
            </div>
          )}
          {pkg.hotel && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-text-secondary">
                <Hotel className="h-4 w-4" /> Hotel ({pkg.nights} nights)
              </span>
              <span className="font-semibold">
                {pkg.currency} {pkg.hotel.price.toLocaleString()}
              </span>
            </div>
          )}
          <div className="border-t border-neutral-200 dark:border-border-default pt-2 flex items-center justify-between">
            <span className="font-bold text-secondary-500">Total</span>
            <span className="font-extrabold text-xl text-primary-500">
              {pkg.currency} {pkg.totalPrice.toLocaleString()}
            </span>
          </div>
          {pkg.isEstimated && (
            <span className="text-xs text-text-muted italic">* Estimated price</span>
          )}
        </div>

        {/* Flight info */}
        {pkg.flight && (
          <div className="flex items-center gap-4 text-xs text-text-muted mb-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(pkg.flight.duration)}
            </span>
            <span>{pkg.flight.stops === 0 ? "Direct" : `${pkg.flight.stops} stop${pkg.flight.stops > 1 ? "s" : ""}`}</span>
            {pkg.flight.airline && (
              <img
                src={`https://pics.avs.io/80/30/${pkg.flight.airline}.png`}
                alt={pkg.flight.airline}
                className="h-5 object-contain"
                onError={handleAirlineLogoError}
              />
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <button
            onClick={() => {
              sessionStorage.setItem(`trip_${pkg.id}`, JSON.stringify(pkg));
              // Save to user trips (fire-and-forget)
              fetch("/api/trips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  destination: pkg.destination.iata || pkg.destination.city,
                  origin: "OTP",
                  total_cost: pkg.totalPrice,
                  budget: pkg.totalPrice,
                  days: pkg.nights,
                  status: "planning",
                }),
              }).catch(() => {});
              window.location.href = `/plan/trip/${pkg.id}`;
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
          >
            View Full Itinerary <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function formatDuration(iso: string): string {
  if (!iso) return "";
  const h = iso.match(/(\d+)H/)?.[1];
  const m = iso.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
}
