"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ArrowLeft,
  Car,
  Bus,
  Calendar,
  Users,
  Loader2,
  MapPin,
  Sparkles,
  AlertCircle,
  Plane,
  TrainFront,
  X,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";
import type { MapPickerCity } from "@/components/EuropeMapPicker";

// Leaflet rips through SSR — load the map only on the client.
const EuropeMapPicker = dynamic(() => import("@/components/EuropeMapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-radius-xl border border-border-default bg-surface-sunken">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  ),
});

interface FormState {
  origin: MapPickerCity | null;
  destination: MapPickerCity | null;
  departureDate: string;
  returnDate: string;
  mode: "car" | "bus" | "train";
  adults: number;
  fuelPricePerLitre: number;
  consumption: number;
}

function todayPlus(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
}

function formatCity(c: MapPickerCity): string {
  return `${c.name}, ${c.country}`;
}

export default function RoadTripWizardPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user } = useUser();
  const openAuthModal = useAuthModalStore((s) => s.open);
  const isRo = locale === "ro";

  const [step, setStep] = useState(0);
  const [pickMode, setPickMode] = useState<"origin" | "destination">("origin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightSuggestion, setFlightSuggestion] = useState<{
    url: string;
    origin: string;
    destination: string;
  } | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    origin: null,
    destination: null,
    departureDate: todayPlus(14),
    returnDate: todayPlus(20),
    mode: "car",
    adults: 2,
    fuelPricePerLitre: 1.6,
    consumption: 7,
  }));

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(form.origin && form.destination);
    if (step === 1) return Boolean(form.departureDate);
    return true;
  }, [step, form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePickCity(city: MapPickerCity) {
    if (pickMode === "origin") {
      set("origin", city);
      // Auto-advance to destination if it isn't yet picked
      if (!form.destination) setPickMode("destination");
    } else {
      // Block same city as origin
      if (form.origin && form.origin.name === city.name) return;
      set("destination", city);
    }
  }

  async function handleSubmit() {
    if (!user) {
      openAuthModal("login", `/${locale}/road-trip`);
      return;
    }
    if (!form.origin || !form.destination) return;
    setSubmitting(true);
    setError(null);
    setFlightSuggestion(null);
    try {
      const res = await fetch("/api/road-trip/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originQuery: formatCity(form.origin),
          destinationQuery: formatCity(form.destination),
          // Pass lat/lng + countryCode straight through so the server can
          // skip geocoding and the Europe-only check is authoritative.
          originCity: form.origin,
          destinationCity: form.destination,
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          mode: form.mode,
          adults: form.adults,
          fuelPricePerLitre: form.fuelPricePerLitre,
          consumption: form.consumption,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (
          res.status === 422 &&
          data.suggestion === "flight" &&
          typeof data.flightSearchUrl === "string"
        ) {
          setFlightSuggestion({
            url: `/${locale}${data.flightSearchUrl}`,
            origin: data.origin || formatCity(form.origin),
            destination: data.destination || formatCity(form.destination),
          });
          return;
        }
        throw new Error(data.error || `Request failed (HTTP ${res.status})`);
      }
      try {
        sessionStorage.setItem(`roadTrip_${data.id}`, JSON.stringify(data));
      } catch {
        /* ignore quota */
      }
      router.push(`/${locale}/road-trip/result/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 lg:py-16">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            {isRo ? "Doar Europa — fără zboruri" : "Europe only — no flights"}
          </span>
          <h1 className="mt-4 text-h1 text-text-primary">
            {isRo ? "Planifică un road trip" : "Plan a road trip"}
          </h1>
          <p className="mt-2 text-body text-text-secondary">
            {isRo
              ? "Alege orașele pe hartă — îți calculăm distanța, durata, costul și itinerariul AI cu popasuri."
              : "Pick cities on the map — we'll compute distance, duration, cost and an AI itinerary with stops."}
          </p>
        </header>

        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-text-muted">
          <Step active={step >= 0} done={step > 0} label={isRo ? "Locuri" : "Locations"} />
          <span className="h-px w-8 bg-border-default" />
          <Step active={step >= 1} done={step > 1} label={isRo ? "Date" : "Dates"} />
          <span className="h-px w-8 bg-border-default" />
          <Step active={step >= 2} done={false} label={isRo ? "Transport" : "Transport"} />
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-radius-xl border border-border-default bg-surface p-6 lg:p-8"
        >
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <PickCard
                  active={pickMode === "origin"}
                  label={isRo ? "De unde pleci?" : "Where are you leaving from?"}
                  emptyText={isRo ? "Apasă pe un oraș pe hartă" : "Click a city on the map"}
                  city={form.origin}
                  onActivate={() => setPickMode("origin")}
                  onClear={() => set("origin", null)}
                />
                <PickCard
                  active={pickMode === "destination"}
                  label={isRo ? "Unde mergi?" : "Where are you going?"}
                  emptyText={isRo ? "Apasă pe un oraș pe hartă" : "Click a city on the map"}
                  city={form.destination}
                  onActivate={() => setPickMode("destination")}
                  onClear={() => set("destination", null)}
                />
              </div>

              <div className="flex items-center gap-2 rounded-full border border-border-default bg-surface-sunken p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPickMode("origin")}
                  className={`flex-1 rounded-full px-3 py-1.5 font-semibold transition-colors ${
                    pickMode === "origin"
                      ? "bg-emerald-500 text-white"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {isRo ? "Alege origine" : "Pick origin"}
                </button>
                <button
                  type="button"
                  onClick={() => setPickMode("destination")}
                  className={`flex-1 rounded-full px-3 py-1.5 font-semibold transition-colors ${
                    pickMode === "destination"
                      ? "bg-orange-500 text-white"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {isRo ? "Alege destinație" : "Pick destination"}
                </button>
              </div>

              <EuropeMapPicker
                mode={pickMode}
                selectedCity={pickMode === "origin" ? form.origin : form.destination}
                excludeCity={pickMode === "origin" ? form.destination?.name : form.origin?.name}
                onSelect={handlePickCity}
                height="460px"
              />

              <p className="text-xs text-text-muted">
                {isRo
                  ? "Pini verzi = orașe mari. Pini gri = orașe secundare. Pinul portocaliu este selecția curentă."
                  : "Green pins = major cities. Grey pins = smaller cities. Orange pin = current selection."}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label={isRo ? "Plecare" : "Departure"}
                  icon={<Calendar className="h-4 w-4 text-emerald-500" />}
                >
                  <input
                    type="date"
                    value={form.departureDate}
                    min={todayPlus(0)}
                    onChange={(e) => set("departureDate", e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </Field>
                <Field
                  label={isRo ? "Întoarcere" : "Return"}
                  icon={<Calendar className="h-4 w-4 text-emerald-500" />}
                >
                  <input
                    type="date"
                    value={form.returnDate}
                    min={form.departureDate}
                    onChange={(e) => set("returnDate", e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </Field>
              </div>
              <Field
                label={isRo ? "Călători" : "Travelers"}
                icon={<Users className="h-4 w-4 text-emerald-500" />}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set("adults", Math.max(1, form.adults - 1))}
                    className="h-10 w-10 rounded-full border border-border-default text-text-primary hover:bg-surface-sunken"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] text-center text-body font-semibold text-text-primary">
                    {form.adults}
                  </span>
                  <button
                    type="button"
                    onClick={() => set("adults", Math.min(8, form.adults + 1))}
                    className="h-10 w-10 rounded-full border border-border-default text-text-primary hover:bg-surface-sunken"
                  >
                    +
                  </button>
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ModeCard
                  active={form.mode === "car"}
                  onClick={() => set("mode", "car")}
                  icon={<Car className="h-6 w-6" />}
                  label={isRo ? "Mașină" : "Car"}
                  description={isRo ? "Propria ta mașină" : "Your own vehicle"}
                />
                <ModeCard
                  active={form.mode === "bus"}
                  onClick={() => set("mode", "bus")}
                  icon={<Bus className="h-6 w-6" />}
                  label={isRo ? "Autobuz" : "Bus"}
                  description={isRo ? "Flixbus / linii intercity" : "Flixbus / intercity lines"}
                />
                <ModeCard
                  active={form.mode === "train"}
                  onClick={() => set("mode", "train")}
                  icon={<TrainFront className="h-6 w-6" />}
                  label={isRo ? "Tren" : "Train"}
                  description={isRo ? "Tren intercity (cost estimat)" : "Intercity rail (est. fare)"}
                />
              </div>

              {form.mode === "train" && (
                <div className="rounded-lg border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-900/15 p-3 text-xs text-sky-800 dark:text-sky-200">
                  {isRo
                    ? "Estimăm prețul și durata pe baza unei viteze medii europene de ~110 km/h și un tarif clasa 2 (~€0.12/km). Pentru tarif real, verifică Trainline sau operatorul național."
                    : "We estimate fare and duration from a European average of ~110 km/h and a 2nd-class rate (~€0.12/km). For exact prices, check Trainline or the national operator."}
                </div>
              )}

              {form.mode === "car" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={isRo ? "Preț benzină (€/L)" : "Fuel price (€/L)"}>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="5"
                      value={form.fuelPricePerLitre}
                      onChange={(e) => set("fuelPricePerLitre", Number(e.target.value))}
                      className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </Field>
                  <Field label={isRo ? "Consum (L/100km)" : "Consumption (L/100km)"}>
                    <input
                      type="number"
                      step="0.5"
                      min="3"
                      max="20"
                      value={form.consumption}
                      onChange={(e) => set("consumption", Number(e.target.value))}
                      className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {error && !flightSuggestion && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <p className="text-body-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {flightSuggestion && (
            <div className="mt-6 rounded-2xl border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-900/20 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shrink-0">
                  <Plane className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-sky-900 dark:text-sky-100">
                    {isRo
                      ? 'Drumul nu poate fi parcurs cu mașina sau autobuzul'
                      : 'No drivable route to this destination'}
                  </h3>
                  <p className="mt-1 text-sm text-sky-800 dark:text-sky-200">
                    {isRo
                      ? `Destinația e peste apă sau e o insulă fără pod. Caută un zbor de la ${flightSuggestion.origin} la ${flightSuggestion.destination}.`
                      : `The destination is across water or on an isolated island. Search for a flight from ${flightSuggestion.origin} to ${flightSuggestion.destination}.`}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={flightSuggestion.url}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
                    >
                      <Plane className="h-4 w-4" />
                      {isRo
                        ? `Caută zbor ${flightSuggestion.origin} → ${flightSuggestion.destination}`
                        : `Search flight ${flightSuggestion.origin} → ${flightSuggestion.destination}`}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setFlightSuggestion(null)}
                      className="text-xs font-semibold text-sky-700 dark:text-sky-300 hover:underline"
                    >
                      {isRo ? 'sau încearcă altă destinație' : 'or try a different destination'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-text-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              {isRo ? "Înapoi" : "Back"}
            </button>

            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-6 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {isRo ? "Continuă" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-6 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRo ? "Generăm..." : "Generating..."}
                  </>
                ) : (
                  <>
                    {isRo ? "Generează itinerariul" : "Generate itinerary"}
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Step({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const tone = done
    ? "bg-emerald-500 text-white"
    : active
    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
    : "bg-surface-sunken text-text-muted";
  return <span className={`rounded-full px-3 py-1 font-semibold ${tone}`}>{label}</span>;
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-body-sm font-semibold text-text-primary">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function PickCard({
  active,
  label,
  emptyText,
  city,
  onActivate,
  onClear,
}: {
  active: boolean;
  label: string;
  emptyText: string;
  city: MapPickerCity | null;
  onActivate: () => void;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`group flex items-start gap-3 rounded-radius-xl border-2 p-4 text-left transition-all ${
        active
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/15"
          : "border-border-default bg-surface hover:border-emerald-300"
      }`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          active ? "bg-emerald-500 text-white" : "bg-surface-sunken text-text-secondary"
        }`}
      >
        <MapPin className="h-4 w-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </span>
        {city ? (
          <span className="mt-1 flex items-center gap-2">
            <span className="block truncate text-body font-semibold text-text-primary">
              {city.name}, {city.country}
            </span>
          </span>
        ) : (
          <span className="mt-1 block text-body-sm text-text-muted">{emptyText}</span>
        )}
      </span>
      {city && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }
          }}
          className="ml-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-surface-sunken hover:text-text-primary"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-radius-xl border-2 p-4 text-left transition-all ${
        active
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
          : "border-border-default bg-surface hover:border-emerald-300"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          active
            ? "bg-emerald-500 text-white"
            : "bg-surface-sunken text-text-secondary"
        }`}
      >
        {icon}
      </span>
      <span className="text-body font-semibold text-text-primary">{label}</span>
      <span className="text-xs text-text-secondary">{description}</span>
    </button>
  );
}
