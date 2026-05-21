"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";

interface FormState {
  originQuery: string;
  destinationQuery: string;
  departureDate: string;
  returnDate: string;
  mode: "car" | "bus";
  adults: number;
  fuelPricePerLitre: number;
  consumption: number;
}

const ORIGIN_SUGGESTIONS = ["Bucharest, Romania", "Cluj-Napoca, Romania", "Timișoara, Romania", "Iași, Romania"];
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

export default function RoadTripWizardPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user } = useUser();
  const openAuthModal = useAuthModalStore((s) => s.open);
  const isRo = locale === "ro";

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    originQuery: "",
    destinationQuery: "",
    departureDate: todayPlus(14),
    returnDate: todayPlus(20),
    mode: "car",
    adults: 2,
    fuelPricePerLitre: 1.6,
    consumption: 7,
  }));

  const canNext = useMemo(() => {
    if (step === 0) return form.originQuery.length >= 2 && form.destinationQuery.length >= 2;
    if (step === 1) return Boolean(form.departureDate);
    return true;
  }, [step, form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!user) {
      openAuthModal("login", `/${locale}/road-trip`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/road-trip/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
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
      <div className="mx-auto max-w-3xl px-4 py-10 lg:py-16">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            {isRo ? "Fără zbor — doar pe drum" : "No flight — ground only"}
          </span>
          <h1 className="mt-4 text-h1 text-text-primary">
            {isRo ? "Planifică un road trip" : "Plan a road trip"}
          </h1>
          <p className="mt-2 text-body text-text-secondary">
            {isRo
              ? "Mașină sau autobuz — distanță, durată și cost real, plus un itinerariu AI cu popasuri."
              : "Car or bus — real distance, duration and cost, plus an AI itinerary with rest stops."}
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
            <div className="space-y-6">
              <Field
                label={isRo ? "De unde pleci?" : "Where are you leaving from?"}
                icon={<MapPin className="h-4 w-4 text-emerald-500" />}
              >
                <input
                  type="text"
                  value={form.originQuery}
                  onChange={(e) => set("originQuery", e.target.value)}
                  placeholder={isRo ? "ex: Bucharest, Romania" : "e.g. Bucharest, Romania"}
                  className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary placeholder:text-text-muted focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <SuggestionChips
                  suggestions={ORIGIN_SUGGESTIONS}
                  onPick={(v) => set("originQuery", v)}
                />
              </Field>
              <Field
                label={isRo ? "Unde mergi?" : "Where are you going?"}
                icon={<MapPin className="h-4 w-4 text-emerald-500" />}
              >
                <input
                  type="text"
                  value={form.destinationQuery}
                  onChange={(e) => set("destinationQuery", e.target.value)}
                  placeholder={isRo ? "ex: Sofia, Bulgaria" : "e.g. Sofia, Bulgaria"}
                  className="w-full rounded-lg border border-border-default bg-background px-4 py-3 text-body text-text-primary placeholder:text-text-muted focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <SuggestionChips
                  suggestions={DESTINATION_SUGGESTIONS}
                  onPick={(v) => set("destinationQuery", v)}
                />
              </Field>
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
              <div className="grid grid-cols-2 gap-3">
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
              </div>

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

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <p className="text-body-sm text-red-700 dark:text-red-300">{error}</p>
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
