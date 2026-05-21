"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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
  Crown,
  Leaf,
  Gem,
} from "lucide-react";
import type { TripPackage } from "@/app/api/ai/plan-trip/route";
import { handleDestinationImageError, handleAirlineLogoError } from "@/lib/imageFallback";
import { useCurrency } from "@/hooks/useCurrency";
import SimilarDestinations from "@/components/SimilarDestinations";

interface PlanParams {
  originIata?: string;
  originDisplay?: string;
  nights?: number;
  adults?: number;
  children?: number;
  budget?: number;
  currency?: string;
  destinationMode?: "surprise" | "specific";
  destinationIata?: string;
  destinationDisplay?: string;
}

const VARIANT_ORDER: Record<NonNullable<TripPackage["variant"]>, number> = {
  budget: 0,
  standard: 1,
  premium: 2,
};

const VARIANT_BADGE_STYLES: Record<NonNullable<TripPackage["variant"]>, { bg: string; icon: typeof Leaf }> = {
  budget:   { bg: "bg-emerald-500", icon: Leaf },
  standard: { bg: "bg-blue-500",    icon: Gem },
  premium:  { bg: "bg-amber-500",   icon: Crown },
};

export default function PlanResultsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("plan.results");
  const isRo = locale === "ro";
  const lp = (path: string) => `/${locale}${path === "/" ? "" : path}`;
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [params, setParams] = useState<PlanParams | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [inBudgetCount, setInBudgetCount] = useState<number | null>(null);
  const [overflowCount, setOverflowCount] = useState<number | null>(null);
  const [relaxed, setRelaxed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("planResults_v2");
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
      setBudget(typeof parsed.budget === 'number' ? parsed.budget : (parsed.params?.budget ?? null));
      setInBudgetCount(typeof parsed.inBudgetCount === 'number' ? parsed.inBudgetCount : null);
      setOverflowCount(typeof parsed.overflowCount === 'number' ? parsed.overflowCount : null);
      setRelaxed(parsed.relaxed === true);
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
          <h2 className="text-2xl font-bold text-secondary-500 mb-2">{t("missingTitle")}</h2>
          <p className="text-text-secondary mb-6">{t("missingSubtitle")}</p>
          <button
            onClick={() => router.push(lp("/plan"))}
            className="rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-all"
          >
            {t("missingCta")}
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
          <p className="text-text-secondary">{isRo ? "Se încarcă călătoriile tale..." : "Loading your trips..."}</p>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-6">✈️</div>
          <h2 className="text-2xl font-bold text-secondary-500 mb-3">{t("noResults")}</h2>
          <p className="text-text-secondary mb-2 max-w-md mx-auto">{t("noResultsSubtitle")}</p>
          <p className="text-sm text-text-muted mb-8 max-w-sm mx-auto">{t("noResultsHint")}</p>
          <button
            onClick={() => router.push(lp("/plan"))}
            className="rounded-full bg-primary-500 px-8 py-3 font-semibold text-white hover:bg-primary-600 transition-all"
          >
            {t("tryDifferentDates")}
          </button>
        </div>
      </div>
    );
  }

  // Single-destination mode: every package shares the same destination IATA and
  // carries a `variant` field. Detect it so we can swap headers, badges and sort.
  const isSpecific = params?.destinationMode === "specific"
    && !!params?.destinationIata
    && packages.every((p) => p.destination?.iata === params.destinationIata && p.variant);

  const displayedPackages = isSpecific
    ? [...packages].sort((a, b) => {
        const ao = a.variant ? VARIANT_ORDER[a.variant] : 99;
        const bo = b.variant ? VARIANT_ORDER[b.variant] : 99;
        return ao - bo;
      })
    : packages;

  const specificCity = isSpecific
    ? (params?.destinationDisplay || packages[0].destination.city)
    : null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">

      <main className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href={lp("/plan")}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backLink")}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-semibold text-primary-500 uppercase tracking-wider">
              {isSpecific ? t("headerLabelSpecific") : t("headerLabelDiscovery")}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-secondary-500 mb-2">
            {isSpecific
              ? t("titleSpecific", { count: displayedPackages.length, city: specificCity ?? "" })
              : t("titleDiscovery")}
          </h1>
          {params && (
            <p className="text-text-secondary">
              {(() => {
                const origin = params.originDisplay || params.originIata || (isRo ? "originea ta" : "your location");
                const nights = params.nights ?? 0;
                const travelers = (params.adults || 0) + (params.children || 0);
                const budget = params.budget != null && params.currency
                  ? `${params.currency} ${Number(params.budget).toLocaleString(isRo ? "ro-RO" : "en-US")}`
                  : "";
                return t("summaryLine", {
                  origin,
                  nights,
                  travelers,
                  budget,
                });
              })()}
            </p>
          )}
          {isSpecific && (
            <p className="text-sm text-text-muted mt-2 italic">{t("subtitleSpecific")}</p>
          )}
        </div>

        {/* Budget fit summary — only in discovery mode where the budget filter applies */}
        {!isSpecific && budget != null && inBudgetCount != null && (
          <div className="mb-4 text-sm text-text-secondary">
            {inBudgetCount > 0
              ? t("budgetFitSummary", {
                  count: inBudgetCount,
                  budget: `${params?.currency || "EUR"} ${budget.toLocaleString(isRo ? "ro-RO" : "en-US")}`,
                })
              : t("budgetFitNone", {
                  budget: `${params?.currency || "EUR"} ${budget.toLocaleString(isRo ? "ro-RO" : "en-US")}`,
                })}
          </div>
        )}

        {/* Relaxed banner — fewer than MIN_RESULTS fit, so we added overflow */}
        {!isSpecific && relaxed && overflowCount != null && overflowCount > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {t("relaxedNotice", {
                inBudget: inBudgetCount ?? 0,
                overflow: overflowCount,
              })}
            </p>
          </div>
        )}

        {/* Warning banner */}
        {warning && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}

        {/* Package cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedPackages.map((pkg, i) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              index={i}
              isBestMatch={!isSpecific && i === 0}
              budget={budget}
            />
          ))}
        </div>

        {/* Similar destinations strip — only in discovery mode (hidden when user
            picked a specific destination, since the 3 variants are the focus). */}
        {!isSpecific && packages[0]?.destination?.iata && (
          <div className="mt-12">
            <SimilarDestinations
              referenceIata={packages[0].destination.iata}
              maxBudget={params?.budget ?? undefined}
              subtitle={`Similar to ${packages[0].destination.city} — same vibe, often cheaper.`}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function PackageCard({ pkg, index, isBestMatch, budget }: { pkg: TripPackage; index: number; isBestMatch: boolean; budget: number | null }) {
  const dest = pkg.destination;
  const heroUrl = `https://images.unsplash.com/${dest.imageId}?w=800&h=500&fit=crop&q=80`;
  const { format } = useCurrency();
  const locale = useLocale();
  const t = useTranslations("plan.results");
  const isRo = locale === "ro";

  // Exact overshoot amount for the badge — e.g. "+€144 peste buget" instead
  // of the generic "Peste buget" label.
  const overshoot = pkg.isOverBudget && budget != null
    ? Math.max(0, Math.round(pkg.totalPrice - budget))
    : 0;

  const variantStyle = pkg.variant ? VARIANT_BADGE_STYLES[pkg.variant] : null;
  const VariantIcon = variantStyle?.icon;

  const highlights: string[] = [];
  if (pkg.flight?.stops === 0) highlights.push(t("card.directFlight"));
  if (pkg.hotel?.stars) highlights.push(t("card.starHotel", { stars: pkg.hotel.stars }));
  if (pkg.destination.tags.includes("beach")) highlights.push(t("card.beachDestination"));
  if (pkg.destination.tags.includes("culture")) highlights.push(t("card.culturalHotspot"));
  if (pkg.destination.tags.includes("food")) highlights.push(t("card.foodParadise"));

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
        {/* Variant badge takes precedence over Best Match */}
        {variantStyle && pkg.variantLabel && (
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full ${variantStyle.bg} px-3 py-1 text-xs font-bold text-white shadow-md`}>
            {VariantIcon && <VariantIcon className="h-3.5 w-3.5" />}
            {pkg.variantLabel}
          </span>
        )}
        {!variantStyle && isBestMatch && !pkg.isOverBudget && (
          <span className="absolute top-3 left-3 rounded-full bg-primary-500 px-3 py-1 text-xs font-bold text-white shadow-md">
            ⭐ {t("bestMatch")}
          </span>
        )}
        {pkg.isOverBudget && (
          <span className={`absolute ${variantStyle ? "top-12" : "top-3"} left-3 rounded-full bg-amber-500/95 px-3 py-1 text-xs font-bold text-white shadow-md`}>
            ⚠ {overshoot > 0
              ? t("overBudgetBy", { amount: format(overshoot, pkg.currency) })
              : t("overBudget")}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-xl font-bold text-white">
            {isRo
              ? t("card.nightsIn", { nights: pkg.nights, city: dest.city, country: dest.country })
              : t("card.daysIn", { nights: pkg.nights, city: dest.city, country: dest.country })}
          </h2>
          {pkg.variantTheme && (
            <p className="text-xs italic text-white/85 mt-1">{pkg.variantTheme}</p>
          )}
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
          <div className="flex flex-wrap gap-2 mb-3">
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
                <Plane className="h-4 w-4" /> {t("card.flightLabel")}
              </span>
              <span className="font-semibold">
                {format(pkg.flight.price, pkg.currency)}
              </span>
            </div>
          )}
          {pkg.hotel && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-text-secondary">
                <Hotel className="h-4 w-4" /> {t("card.hotelLabel", { nights: pkg.nights })}
              </span>
              <span className="font-semibold">
                {format(pkg.hotel.price, pkg.currency)}
              </span>
            </div>
          )}
          <div className="border-t border-neutral-200 dark:border-border-default pt-2 flex items-center justify-between">
            <span className="font-bold text-secondary-500">{t("card.totalLabel")}</span>
            <span className="font-extrabold text-xl text-primary-500">
              {format(pkg.totalPrice, pkg.currency)}
            </span>
          </div>
          {pkg.isEstimated && (
            <span className="text-xs text-text-muted italic">{t("estimatedPrice")}</span>
          )}
        </div>

        {/* Flight info */}
        {pkg.flight && (
          <div className="flex items-center gap-4 text-xs text-text-muted mb-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(pkg.flight.duration)}
            </span>
            <span>{pkg.flight.stops === 0 ? t("card.directLabel") : t("card.stops", { count: pkg.flight.stops })}</span>
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
              window.location.href = `/${locale}/plan/trip/${pkg.id}`;
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
          >
            {t("card.viewItinerary")} <ArrowRight className="h-4 w-4" />
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
