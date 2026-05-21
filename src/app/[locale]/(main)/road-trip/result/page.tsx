"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Car,
  Bus,
  MapPin,
  Clock,
  Route as RouteIcon,
  Fuel,
  CircleDollarSign,
  ExternalLink,
  Hotel as HotelIcon,
  Star,
  AlertCircle,
  Sparkles,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import RoadItinerary from "@/components/road-trip/RoadItinerary";

interface TAHotelShape {
  id: string;
  title?: string;
  primaryInfo?: string;
  secondaryInfo?: string;
  bubbleRating?: { count?: string; rating?: number };
  priceForDisplay?: string;
  cardPhotos?: Array<{ sizes?: { urlTemplate?: string } }>;
}

interface RoadTripData {
  id: string;
  origin: { query: string; formatted: string; lat: number; lng: number };
  destination: { query: string; formatted: string; lat: number; lng: number };
  mode: "car" | "bus";
  departureDate: string;
  returnDate?: string;
  adults: number;
  drive: {
    distanceKm: number;
    durationHours: number;
    durationInTrafficHours?: number;
  };
  cost: {
    fuel: number;
    tolls: number;
    busFarePerPerson: number;
    total: number;
    currency: "EUR";
  };
  stopover?: { city: string; reason: string };
  hotelDestination: TAHotelShape | null;
  hotelStopover: TAHotelShape | null;
  externalLinks: { googleMaps: string; flixbus?: string };
  aiContent: {
    description: string;
    dayByDay: Array<{
      day: number;
      title: string;
      morning: string;
      afternoon: string;
      evening: string;
    }>;
    restStops: string[];
    routeHighlights: string[];
    packingTips: string[];
  } | null;
  warnings: string[];
}

export default function RoadTripResultPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResultInner />
    </Suspense>
  );
}

function ResultInner() {
  const params = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === "ro";
  const id = params.get("id");

  const [data, setData] = useState<RoadTripData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError(isRo ? "Lipsește ID-ul traseului." : "Missing road trip id.");
      return;
    }
    try {
      const raw = sessionStorage.getItem(`roadTrip_${id}`);
      if (!raw) {
        setError(
          isRo
            ? "Datele traseului au expirat. Generează din nou."
            : "Road trip data expired. Please re-generate.",
        );
        return;
      }
      setData(JSON.parse(raw) as RoadTripData);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, isRo]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <p className="text-body text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/road-trip`)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          {isRo ? "Înapoi la wizard" : "Back to wizard"}
        </button>
      </div>
    );
  }

  if (!data) return <LoadingState />;

  const originCity = shortName(data.origin.formatted);
  const destCity = shortName(data.destination.formatted);
  const Icon = data.mode === "car" ? Car : Bus;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 py-10 text-white">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/road-trip`)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {isRo ? "Înapoi" : "Back"}
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-white/80">
            <Icon className="h-4 w-4" />
            {data.mode === "car" ? (isRo ? "Cu mașina" : "By car") : isRo ? "Cu autobuzul" : "By bus"}
          </div>
          <h1 className="mt-2 text-h1">
            {originCity} → {destCity}
          </h1>
          <p className="mt-1 text-body text-white/90">
            {formatDate(data.departureDate, locale)}
            {data.returnDate ? ` — ${formatDate(data.returnDate, locale)}` : ""} ·{" "}
            {data.adults} {isRo ? "călători" : "travelers"}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <RouteIcon className="h-4 w-4" />
              {data.drive.distanceKm} km
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatHours(data.drive.durationHours)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CircleDollarSign className="h-4 w-4" />
              €{data.cost.total}
            </span>
          </div>

          <a
            href={data.externalLinks.googleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm hover:bg-white/25"
          >
            <ExternalLink className="h-4 w-4" />
            {isRo ? "Vezi pe Google Maps" : "View in Google Maps"}
          </a>
          {data.externalLinks.flixbus && (
            <a
              href={data.externalLinks.flixbus}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 ml-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm hover:bg-white/25"
            >
              <ExternalLink className="h-4 w-4" />
              Flixbus
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        {data.warnings.length > 0 && (
          <div className="mb-6 rounded-radius-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 p-4">
            <p className="mb-2 text-body-sm font-semibold text-amber-700 dark:text-amber-300">
              {isRo ? "Note despre rezultate" : "Notes about the results"}
            </p>
            <ul className="space-y-1 text-body-sm text-amber-700 dark:text-amber-200">
              {data.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <RoadItinerary
              originCity={originCity}
              destinationCity={destCity}
              mode={data.mode}
              distanceKm={data.drive.distanceKm}
              durationHours={data.drive.durationHours}
              durationInTrafficHours={data.drive.durationInTrafficHours}
              stopoverCity={data.stopover?.city}
            />

            {data.aiContent && (
              <>
                <section className="rounded-radius-xl border border-border-default bg-surface p-6">
                  <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {isRo ? "Privire de ansamblu" : "Overview"}
                  </div>
                  <p className="text-body text-text-primary">{data.aiContent.description}</p>
                </section>

                <section className="rounded-radius-xl border border-border-default bg-surface p-6">
                  <h2 className="mb-4 text-h3 text-text-primary">
                    {isRo ? "Zi cu zi" : "Day by day"}
                  </h2>
                  <div className="space-y-4">
                    {data.aiContent.dayByDay.map((d) => (
                      <article
                        key={d.day}
                        className="rounded-lg border border-border-default p-4"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                            {d.day}
                          </span>
                          <h3 className="text-body font-semibold text-text-primary">{d.title}</h3>
                        </div>
                        <div className="space-y-1.5 text-body-sm text-text-secondary">
                          <p>
                            <span className="font-semibold text-text-primary">
                              {isRo ? "Dimineață: " : "Morning: "}
                            </span>
                            {d.morning}
                          </p>
                          <p>
                            <span className="font-semibold text-text-primary">
                              {isRo ? "După-amiază: " : "Afternoon: "}
                            </span>
                            {d.afternoon}
                          </p>
                          <p>
                            <span className="font-semibold text-text-primary">
                              {isRo ? "Seara: " : "Evening: "}
                            </span>
                            {d.evening}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <ListCard
                    title={isRo ? "Popasuri sugerate" : "Rest stops"}
                    icon={<MapPin className="h-4 w-4 text-emerald-500" />}
                    items={data.aiContent.restStops}
                  />
                  <ListCard
                    title={isRo ? "Repere pe traseu" : "Route highlights"}
                    icon={<RouteIcon className="h-4 w-4 text-emerald-500" />}
                    items={data.aiContent.routeHighlights}
                  />
                </div>

                <ListCard
                  title={isRo ? "De luat cu tine" : "Packing & prep"}
                  icon={<Fuel className="h-4 w-4 text-emerald-500" />}
                  items={data.aiContent.packingTips}
                />
              </>
            )}
          </div>

          <aside className="space-y-6">
            <CostCard data={data} isRo={isRo} />
            {data.hotelStopover && (
              <HotelMiniCard
                hotel={data.hotelStopover}
                label={
                  isRo
                    ? `Popas în ${data.stopover?.city ?? ""}`
                    : `Stopover in ${data.stopover?.city ?? ""}`
                }
              />
            )}
            {data.hotelDestination && (
              <HotelMiniCard
                hotel={data.hotelDestination}
                label={isRo ? `Cazare în ${destCity}` : `Stay in ${destCity}`}
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function CostCard({ data, isRo }: { data: RoadTripData; isRo: boolean }) {
  const rows: Array<{ label: string; value: string }> = [];
  if (data.mode === "car") {
    rows.push({ label: isRo ? "Combustibil" : "Fuel", value: `€${data.cost.fuel}` });
    rows.push({ label: isRo ? "Taxe drum" : "Tolls (est.)", value: `€${data.cost.tolls}` });
  } else {
    rows.push({
      label: isRo ? "Bilet / pers." : "Fare / person",
      value: `€${data.cost.busFarePerPerson}`,
    });
    rows.push({
      label: isRo ? `× ${data.adults} pers.` : `× ${data.adults} pax`,
      value: `€${data.cost.busFarePerPerson * data.adults}`,
    });
  }
  return (
    <section className="rounded-radius-xl border border-border-default bg-surface p-5">
      <h3 className="mb-3 flex items-center gap-2 text-body font-semibold text-text-primary">
        <CircleDollarSign className="h-4 w-4 text-emerald-500" />
        {isRo ? "Cost estimat" : "Estimated cost"}
      </h3>
      <dl className="space-y-2 text-body-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between">
            <dt className="text-text-secondary">{r.label}</dt>
            <dd className="font-semibold text-text-primary">{r.value}</dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border-default pt-2">
          <dt className="font-semibold text-text-primary">Total</dt>
          <dd className="text-body font-bold text-emerald-600 dark:text-emerald-400">
            €{data.cost.total}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-text-muted">
        {isRo
          ? "Estimare bazată pe consum mediu, vignete și prețuri Flixbus. Realitatea poate varia."
          : "Estimate based on average consumption, road tolls and Flixbus averages. Actual cost may vary."}
      </p>
    </section>
  );
}

function HotelMiniCard({ hotel, label }: { hotel: TAHotelShape; label: string }) {
  const photo = hotel.cardPhotos?.[0]?.sizes?.urlTemplate
    ?.replace("{width}", "320")
    .replace("{height}", "200");
  const rating = hotel.bubbleRating?.rating;
  return (
    <section className="rounded-radius-xl border border-border-default bg-surface overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <HotelIcon className="h-3.5 w-3.5" />
          {label}
        </h3>
      </div>
      {photo && (
        <img
          src={photo}
          alt={hotel.title}
          className="h-32 w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="px-5 pb-4 pt-3">
        <h4 className="text-body font-semibold text-text-primary line-clamp-1">{hotel.title}</h4>
        {hotel.secondaryInfo && (
          <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{hotel.secondaryInfo}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
          {typeof rating === "number" && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              {rating.toFixed(1)}
            </span>
          )}
          {hotel.priceForDisplay && (
            <span className="font-semibold text-text-primary">{hotel.priceForDisplay}</span>
          )}
        </div>
      </div>
    </section>
  );
}

function ListCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <section className="rounded-radius-xl border border-border-default bg-surface p-5">
      <h3 className="mb-3 flex items-center gap-2 text-body font-semibold text-text-primary">
        {icon}
        {title}
      </h3>
      <ul className="space-y-1.5 text-body-sm text-text-secondary">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );
}

function shortName(formatted: string): string {
  return formatted.split(",")[0]?.trim() || formatted;
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  return m === 0 ? `${hr}h` : `${hr}h ${m}m`;
}

function formatDate(d: string, locale: string): string {
  try {
    return new Date(d).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
