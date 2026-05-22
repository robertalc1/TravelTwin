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
  originQuery: string;
  destinationQuery: string;
  /** Set when picked via map. Kept in sync with originQuery to power the
   *  selected-pin highlight; cleared when the user types over the input. */
  origin: MapPickerCity | null;
  destination: MapPickerCity | null;
  departureDate: string;
  returnDate: string;
  mode: "car" | "bus" | "train";
  adults: number;
  fuelPricePerLitre: number;
  consumption: number;
}

const ORIGIN_SUGGESTIONS = [
  "Bucharest, Romania",
  "Cluj-Napoca, Romania",
  "Timișoara, Romania",
  "Iași, Romania",
];
const DESTINATION_SUGGESTIONS = [
  "Sofia, Bulgaria",
  "Budapest, Hungary",
  "Vienna, Austria",
  "Istanbul, Turkey",
  "Belgrade, Serbia",
  "Thessaloniki, Greece",
];

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
  const [showMap, setShowMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Mirror the /plan loading overlay (two visible steps + smooth progress bar)
  // so the road-trip wait doesn't feel like a frozen button.
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flightSuggestion, setFlightSuggestion] = useState<{
    url: string;
    origin: string;
    destination: string;
  } | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    originQuery: "",
    destinationQuery: "",
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
    if (step === 0) {
      return form.originQuery.trim().length >= 2 && form.destinationQuery.trim().length >= 2;
    }
    if (step === 1) return Boolean(form.departureDate);
    return true;
  }, [step, form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOriginText(value: string) {
    setForm((prev) => ({
      ...prev,
      originQuery: value,
      // Typing breaks the link to the map-picked city; the input takes over.
      origin: prev.origin && formatCity(prev.origin) === value ? prev.origin : null,
    }));
  }
  function handleDestinationText(value: string) {
    setForm((prev) => ({
      ...prev,
      destinationQuery: value,
      destination: prev.destination && formatCity(prev.destination) === value ? prev.destination : null,
    }));
  }

  function handlePickCity(city: MapPickerCity) {
    const formatted = formatCity(city);
    if (pickMode === "origin") {
      // Same-city guard: never let origin == destination
      if (form.destination && form.destination.name === city.name) return;
      setForm((prev) => ({ ...prev, origin: city, originQuery: formatted }));
      // Auto-advance to destination if it isn't picked yet
      if (!form.destination && !form.destinationQuery) setPickMode("destination");
    } else {
      if (form.origin && form.origin.name === city.name) return;
      setForm((prev) => ({ ...prev, destination: city, destinationQuery: formatted }));
    }
  }

  async function handleSubmit() {
    if (!user) {
      openAuthModal("login", `/${locale}/road-trip`);
      return;
    }
    const originQuery = form.originQuery.trim();
    const destinationQuery = form.destinationQuery.trim();
    if (!originQuery || !destinationQuery) return;
    setSubmitting(true);
    setLoadingStep(0);
    setLoadingProgress(0);
    setError(null);
    setFlightSuggestion(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => {
        if (s < 1) return s + 1;
        clearInterval(stepInterval);
        return s;
      });
    }, 2000);
    const progressInterval = setInterval(() => {
      setLoadingProgress((p) => {
        if (p >= 95) { clearInterval(progressInterval); return 95; }
        return p + 1;
      });
    }, 70);

    try {
      const res = await fetch("/api/road-trip/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originQuery,
          destinationQuery,
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
            origin: data.origin || originQuery,
            destination: data.destination || destinationQuery,
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
      setLoadingProgress(100);
      router.push(`/${locale}/road-trip/result/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setSubmitting(false);
    }
  }

  if (submitting) {
    // Mirror the /plan loading screen so road-trip generation feels equally
    // intentional. Vehicle emoji follows the user's selected transport mode.
    const heroIcon = form.mode === "train" ? "🚆" : form.mode === "bus" ? "🚌" : "🚗";
    const steps: Array<{ icon: string; label: string }> = [
      {
        icon: "🗺️",
        label: isRo ? "Construiesc itinerariul tău personalizat..." : "Building your personalized itinerary...",
      },
      {
        icon: "⭐",
        label: isRo ? "Selectez cele mai bune popasuri pentru tine..." : "Picking the best stops for you...",
      },
    ];
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-8 animate-bounce">{heroIcon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isRo ? "Agentul tău AI lucrează..." : "Your AI travel agent is working..."}
          </h2>
          <p className="text-white/70 mb-10">
            {isRo ? "Căutăm road trip-ul tău perfect" : "We're finding your perfect road trip"}
          </p>
          <div className="space-y-3 mb-10 text-left">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-all duration-500 ${i <= loadingStep ? "opacity-100" : "opacity-30"}`}
              >
                <span className="text-xl">{i < loadingStep ? "✅" : s.icon}</span>
                <span className={`text-sm ${i <= loadingStep ? "text-white" : "text-white/50"}`}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-white/50 text-sm mt-2">{loadingProgress}%</p>
        </div>
      </div>
    );
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
              <Field
                label={isRo ? "De unde pleci?" : "Where are you leaving from?"}
                icon={<MapPin className="h-4 w-4 text-emerald-500" />}
              >
                <input
                  type="text"
                  value={form.originQuery}
                  onChange={(e) => handleOriginText(e.target.value)}
                  onFocus={() => setPickMode("origin")}
                  placeholder={isRo ? "ex: Bucharest, Romania" : "e.g. Bucharest, Romania"}
                  className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary placeholder:text-text-muted focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <SuggestionChips
                  suggestions={ORIGIN_SUGGESTIONS}
                  onPick={(v) => handleOriginText(v)}
                />
              </Field>
              <Field
                label={isRo ? "Unde mergi?" : "Where are you going?"}
                icon={<MapPin className="h-4 w-4 text-emerald-500" />}
              >
                <input
                  type="text"
                  value={form.destinationQuery}
                  onChange={(e) => handleDestinationText(e.target.value)}
                  onFocus={() => setPickMode("destination")}
                  placeholder={isRo ? "ex: Sofia, Bulgaria" : "e.g. Sofia, Bulgaria"}
                  className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary placeholder:text-text-muted focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <SuggestionChips
                  suggestions={DESTINATION_SUGGESTIONS}
                  onPick={(v) => handleDestinationText(v)}
                />
              </Field>

              <button
                type="button"
                onClick={() => setShowMap((s) => !s)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" />
                {showMap
                  ? (isRo ? "Ascunde harta" : "Hide map")
                  : (isRo ? "Sau alege de pe hartă" : "Or pick from the map")}
              </button>

              {showMap && (
                <div className="space-y-3">
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
                    height="380px"
                  />

                  <p className="text-xs text-text-muted">
                    {isRo
                      ? "Pini verzi = orașe mari. Pini gri = orașe secundare. Click pe un pin completează automat câmpul de mai sus."
                      : "Green pins = major cities. Grey pins = smaller ones. Clicking a pin fills the field above."}
                  </p>
                </div>
              )}
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

function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-full border border-border-default bg-surface-sunken px-3 py-1 text-xs text-text-secondary hover:border-emerald-500 hover:text-emerald-600"
        >
          {s}
        </button>
      ))}
    </div>
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
