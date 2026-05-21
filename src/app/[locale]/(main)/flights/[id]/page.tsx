"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowLeft, Plane, Clock, Share2, ExternalLink, Briefcase, Shield, MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useToastStore } from "@/stores/toastStore";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";
import { getCityImageByIata } from "@/lib/cityImages";
import type { NormalizedFlight } from "@/lib/supabase/types";
import { handleAirlineLogoError } from "@/lib/imageFallback";

function formatDuration(iso: string): string {
  if (!iso) return "";
  const h = iso.match(/(\d+)H/)?.[1];
  const m = iso.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
}

export default function FlightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === "ro";
  const id = (params?.id as string) || "";

  const [flight, setFlight] = useState<NormalizedFlight | null>(null);
  const [missing, setMissing] = useState(false);
  const [sharePending, setSharePending] = useState(false);

  const formatCurrency = useCurrencyStore((s) => s.format);
  const showToast = useToastStore((s) => s.show);
  const { user } = useUser();
  const openAuthModal = useAuthModalStore((s) => s.open);

  // Flights aren't kept in long-lived storage — FlightResultCard stuffs the
  // selected one into sessionStorage at click time. If that key is missing
  // (refresh after cache eviction, direct URL share) we show a friendly
  // empty state instead of fabricating fake data.
  useEffect(() => {
    if (!id) return;
    try {
      const raw = sessionStorage.getItem(`flightView_${id}`);
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as NormalizedFlight;
      setFlight(parsed);
    } catch {
      setMissing(true);
    }
  }, [id]);

  const taxesAndFees = useMemo(
    () => (flight ? Math.round(flight.price * 0.18 * 100) / 100 : 0),
    [flight],
  );
  const total = useMemo(
    () => (flight ? Math.round((flight.price + taxesAndFees) * 100) / 100 : 0),
    [flight, taxesAndFees],
  );

  function goToBooking() {
    if (!flight) return;
    const qs = new URLSearchParams({
      type: "flight",
      flightId: flight.id,
      origin: flight.origin,
      destination: flight.destination,
      total: String(total),
    });
    const target = `/${locale}/booking/simulate?${qs.toString()}`;
    if (!user) {
      openAuthModal("login", target);
      return;
    }
    router.push(target);
  }

  async function handleShare() {
    if (sharePending) return;
    setSharePending(true);
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const navWithShare = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
      };
      if (navWithShare.share) {
        try {
          await navWithShare.share({
            title: flight ? `${flight.origin} → ${flight.destination}` : "Flight",
            text: isRo ? "Vezi acest zbor pe TravelTwin" : "Check out this flight on TravelTwin",
            url,
          });
          return;
        } catch { /* user cancelled */ }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast(isRo ? "Link copiat în clipboard" : "Link copied to clipboard", "success");
      }
    } finally {
      setSharePending(false);
    }
  }

  if (missing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">✈️</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            {isRo ? "Zbor indisponibil" : "Flight not available"}
          </h2>
          <p className="text-text-secondary mb-6">
            {isRo
              ? "Acest zbor nu mai e în cache. Întoarce-te la căutare ca să primești prețuri live actualizate."
              : "This flight is no longer cached. Go back to search to get live updated prices."}
          </p>
          <button
            onClick={() => router.push(`/${locale}/flights`)}
            className="rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-all"
          >
            {isRo ? "← Înapoi la căutare" : "← Back to search"}
          </button>
        </div>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">✈️</div>
          <p className="text-text-secondary">{isRo ? "Se încarcă zborul..." : "Loading flight..."}</p>
        </div>
      </div>
    );
  }

  const heroImg = getCityImageByIata(flight.destination);
  const stops = flight.stops;
  const stopsLabel = stops === 0
    ? (isRo ? "Direct" : "Direct")
    : isRo
      ? `${stops} ${stops === 1 ? "escală" : "escale"}`
      : `${stops} stop${stops !== 1 ? "s" : ""}`;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-200 dark:border-border-default">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={isRo ? "Înapoi" : "Back"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="flex-1 text-base sm:text-lg font-bold text-text-primary truncate">
            {flight.originCity || flight.origin} → {flight.destinationCity || flight.destination}
          </h1>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharePending}
            aria-label="Share"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-border-default text-text-secondary hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6 lg:py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-[21/9] lg:aspect-[3/1] rounded-2xl overflow-hidden mb-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImg}
            alt={flight.destinationCity || flight.destination}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                {isRo ? "Zbor live de la Tripadvisor" : "Live flight from Tripadvisor"}
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold">
              {flight.originCity || flight.origin} → {flight.destinationCity || flight.destination}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              {flight.departureDate}{flight.arrivalDate && flight.arrivalDate !== flight.departureDate ? ` · ${flight.arrivalDate}` : ""}
              {" · "}{stopsLabel}{" · "}{formatDuration(flight.duration)}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Main column */}
          <div className="space-y-6">
            {/* Itinerary card */}
            <section className="rounded-2xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-text-primary">
                  {isRo ? "Detalii itinerar" : "Itinerary details"}
                </h3>
                {flight.airline && (
                  <img
                    src={`https://pics.avs.io/120/40/${flight.airline}.png`}
                    alt={flight.airlineName || flight.airline}
                    className="h-8 object-contain"
                    onError={handleAirlineLogoError}
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Origin */}
                <div className="flex-1">
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">
                    {isRo ? "Plecare" : "Departure"}
                  </p>
                  <p className="text-2xl font-extrabold text-text-primary">{flight.departureTime}</p>
                  <p className="text-sm font-semibold text-text-secondary mt-0.5">{flight.origin}</p>
                  {flight.originCity && (
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {flight.originCity}
                    </p>
                  )}
                </div>

                {/* Connector */}
                <div className="flex-1 max-w-[200px]">
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-text-muted mb-1.5">{formatDuration(flight.duration)}</p>
                    <div className="relative w-full h-px bg-neutral-300 dark:bg-border-default">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary-500" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary-500" />
                      <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white dark:bg-surface px-2">
                        <Plane className="h-4 w-4 text-primary-500 rotate-90" />
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-1.5">{stopsLabel}</p>
                  </div>
                </div>

                {/* Destination */}
                <div className="flex-1 text-right">
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">
                    {isRo ? "Sosire" : "Arrival"}
                  </p>
                  <p className="text-2xl font-extrabold text-text-primary">{flight.arrivalTime}</p>
                  <p className="text-sm font-semibold text-text-secondary mt-0.5">{flight.destination}</p>
                  {flight.destinationCity && (
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5 justify-end">
                      <MapPin className="h-3 w-3" /> {flight.destinationCity}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-border-default grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-text-muted text-xs">{isRo ? "Operator" : "Airline"}</p>
                  <p className="font-semibold text-text-primary mt-0.5">{flight.airlineName || flight.airline}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">{isRo ? "Clasă" : "Class"}</p>
                  <p className="font-semibold text-text-primary mt-0.5 capitalize">
                    {flight.travelClass.toLowerCase().replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">{isRo ? "Durată" : "Duration"}</p>
                  <p className="font-semibold text-text-primary mt-0.5 inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {formatDuration(flight.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">{isRo ? "Escale" : "Stops"}</p>
                  <p className="font-semibold text-text-primary mt-0.5">{stopsLabel}</p>
                </div>
              </div>
            </section>

            {/* Whats included */}
            <section className="rounded-2xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default p-6">
              <h3 className="text-lg font-bold text-text-primary mb-4">
                {isRo ? "Ce este inclus" : "What's included"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {isRo ? "Bagaj de mână" : "Carry-on bag"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {isRo ? "Inclus pentru toți pasagerii" : "Included for every passenger"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {isRo ? "Suport 24/7" : "24/7 support"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {isRo ? "Asistență TravelTwin pentru rezervare" : "TravelTwin booking assistance"}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-text-muted">
                {isRo
                  ? "Bagaj de cală, schimbări și anulări depind de tariful operatorului — verifică în pasul de rezervare."
                  : "Checked bags, changes and cancellations depend on the airline fare — confirmed at booking step."}
              </p>
            </section>
          </div>

          {/* Sticky sidebar — Price */}
          <aside className="lg:sticky lg:top-[110px] lg:self-start">
            <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-5 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                {isRo ? "Preț pe pasager" : "Price per traveler"}
              </p>
              <p className="text-3xl font-extrabold text-primary-500 mt-1">
                {formatCurrency(flight.price, flight.currency)}
              </p>

              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-border-default space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{isRo ? "Tarif de bază" : "Base fare"}</span>
                  <span className="font-semibold text-text-primary">{formatCurrency(flight.price, flight.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{isRo ? "Taxe estimate" : "Estimated taxes"}</span>
                  <span className="font-semibold text-text-primary">{formatCurrency(taxesAndFees, flight.currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-100 dark:border-border-default">
                  <span className="font-bold text-text-primary">{isRo ? "Total" : "Total"}</span>
                  <span className="font-extrabold text-primary-500">{formatCurrency(total, flight.currency)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={goToBooking}
                className="mt-5 w-full rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
              >
                {isRo ? "Rezervă zbor" : "Book Flight"}
              </button>

              {flight.bookingLink && (
                <a
                  href={flight.bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-border-default px-6 py-2.5 text-sm font-semibold text-text-secondary hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  {isRo ? "Vezi pe Tripadvisor" : "View on Tripadvisor"}
                </a>
              )}

              <p className="mt-3 text-[11px] text-text-muted text-center">
                {isRo ? "Nu vei fi taxat încă" : "You won't be charged yet"}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
