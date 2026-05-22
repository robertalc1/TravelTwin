"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Plane,
  Hotel,
  Map,
  Star,
  CheckCircle2,
  Loader2,
  MapPin,
  Umbrella,
  Mountain,
  Landmark,
  PartyPopper,
  UtensilsCrossed,
  Snowflake,
  Bike,
  Heart,
  Users,
  Briefcase,
  Sun,
  CloudSun,
  Cloud,
  Compass,
  Wallet,
  Clock,
  ShieldCheck,
  Sparkles,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";

const BUDGET_CONFIG: Record<string, { min: number; max: number; step: number; presets: number[]; default: number }> = {
  EUR: { min: 150, max: 8000, step: 50,  presets: [150, 500, 1000, 2000, 3000, 5000, 8000], default: 800 },
  USD: { min: 160, max: 8600, step: 50,  presets: [160, 540, 1080, 2160, 3240, 5400, 8600], default: 860 },
  RON: { min: 750, max: 40000, step: 250, presets: [750, 2500, 5000, 10000, 15000, 25000, 40000], default: 4000 },
};

function formatBudget(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

const ORIGIN_SUGGESTIONS: Array<{ iata: string; label: string }> = [
  { iata: "OTP", label: "Bucharest (OTP)" },
  { iata: "CLJ", label: "Cluj-Napoca (CLJ)" },
  { iata: "TSR", label: "Timișoara (TSR)" },
  { iata: "CND", label: "Constanța (CND)" },
  { iata: "IAS", label: "Iași (IAS)" },
];

const DESTINATION_SUGGESTIONS: Array<{ iata: string; label: string }> = [
  { iata: "MLA", label: "Malta (MLA)" },
  { iata: "PMI", label: "Mallorca (PMI)" },
  { iata: "TFS", label: "Tenerife (TFS)" },
  { iata: "AYT", label: "Antalya (AYT)" },
  { iata: "JTR", label: "Santorini (JTR)" },
  { iata: "BCN", label: "Barcelona (BCN)" },
];
// Travel style options — lucide icons + brand color tokens
interface VisualOption {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  tone: "amber" | "emerald" | "indigo" | "pink" | "rose" | "sky" | "violet" | "orange" | "teal" | "slate";
}

const TRAVEL_STYLES: VisualOption[] = [
  { id: "beach", icon: Umbrella, label: "Beach & Relaxation", description: "Sun, sand, slow days", tone: "amber" },
  { id: "nature", icon: Mountain, label: "Mountains & Nature", description: "Hiking, fresh air, scenery", tone: "emerald" },
  { id: "culture", icon: Landmark, label: "Culture & History", description: "Museums, monuments, art", tone: "indigo" },
  { id: "nightlife", icon: PartyPopper, label: "Nightlife & Entertainment", description: "Bars, clubs, live music", tone: "pink" },
  { id: "food", icon: UtensilsCrossed, label: "Food & Culinary", description: "Local cuisine, fine dining", tone: "rose" },
  { id: "snow", icon: Snowflake, label: "Winter & Snow", description: "Skiing, cozy retreats", tone: "sky" },
  { id: "adventure", icon: Bike, label: "Adventure & Sports", description: "Active, outdoor, thrills", tone: "orange" },
  { id: "romantic", icon: Heart, label: "Romantic Getaway", description: "Intimate, scenic, special", tone: "rose" },
  { id: "family", icon: Users, label: "Family Friendly", description: "Kid-safe, varied activities", tone: "teal" },
  { id: "nomad", icon: Briefcase, label: "Digital Nomad", description: "Wi-Fi, cafes, long stays", tone: "violet" },
];

const CLIMATE_OPTIONS: VisualOption[] = [
  { id: "warm", icon: Sun, label: "Warm", description: "25°C and above", tone: "amber" },
  { id: "mild", icon: CloudSun, label: "Mild", description: "15–25°C", tone: "teal" },
  { id: "cold", icon: Cloud, label: "Cold", description: "Below 15°C", tone: "sky" },
  { id: "no-preference", icon: Compass, label: "No preference", description: "Surprise me", tone: "slate" },
];

const PRIORITY_OPTIONS: VisualOption[] = [
  { id: "cheapest", icon: Wallet, label: "Cheapest price", description: "Lowest total cost", tone: "emerald" },
  { id: "best-hotel", icon: Star, label: "Best hotel rating", description: "4★ and 5★ stays first", tone: "amber" },
  { id: "direct-flights", icon: Plane, label: "Direct flights only", description: "No layovers", tone: "sky" },
  { id: "shortest-time", icon: Clock, label: "Shortest travel time", description: "Fastest flights & transfers", tone: "violet" },
  { id: "central-location", icon: MapPin, label: "Central hotel location", description: "Walk-everywhere stays", tone: "rose" },
  { id: "free-cancellation", icon: ShieldCheck, label: "Free cancellation", description: "Flexible bookings only", tone: "teal" },
];

// Tailwind doesn't support fully dynamic class names — map tones explicitly.
const TONE_STYLES: Record<VisualOption["tone"], { iconBg: string; iconFg: string }> = {
  amber:   { iconBg: "bg-amber-100 dark:bg-amber-900/30",   iconFg: "text-amber-600 dark:text-amber-400" },
  emerald: { iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconFg: "text-emerald-600 dark:text-emerald-400" },
  indigo:  { iconBg: "bg-indigo-100 dark:bg-indigo-900/30", iconFg: "text-indigo-600 dark:text-indigo-400" },
  pink:    { iconBg: "bg-pink-100 dark:bg-pink-900/30",     iconFg: "text-pink-600 dark:text-pink-400" },
  rose:    { iconBg: "bg-rose-100 dark:bg-rose-900/30",     iconFg: "text-rose-600 dark:text-rose-400" },
  sky:     { iconBg: "bg-sky-100 dark:bg-sky-900/30",       iconFg: "text-sky-600 dark:text-sky-400" },
  violet:  { iconBg: "bg-violet-100 dark:bg-violet-900/30", iconFg: "text-violet-600 dark:text-violet-400" },
  orange:  { iconBg: "bg-orange-100 dark:bg-orange-900/30", iconFg: "text-orange-600 dark:text-orange-400" },
  teal:    { iconBg: "bg-teal-100 dark:bg-teal-900/30",     iconFg: "text-teal-600 dark:text-teal-400" },
  slate:   { iconBg: "bg-slate-100 dark:bg-slate-800",      iconFg: "text-slate-600 dark:text-slate-300" },
};

const NIGHT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30];

const LOADING_STEPS = [
  { icon: "✈️", text: "Searching 400+ airlines for the best flights..." },
  { icon: "🏨", text: "Comparing 150,000+ hotels worldwide..." },
  { icon: "🗺️", text: "Building your personalized itinerary..." },
  { icon: "⭐", text: "Selecting the top matches for you..." },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
};

interface PlanState {
  originIata: string;
  originDisplay: string;
  /** 'surprise' = clasic discovery flow; 'specific' = utilizatorul a ales o destinație și vrem 3 variante */
  destinationMode: "surprise" | "specific";
  destinationIata: string;
  destinationDisplay: string;
  budget: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  adults: number;
  children: number;
  travelStyles: string[];
  climate: string;
  priorities: string[];
}

const today = new Date();
// Default: today (user can change). Return = today + 7 nights.
const defaultDep = today.toISOString().split("T")[0];
const defaultRet = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

export default function PlanPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("plan.wizard");
  const tCommon = useTranslations("common");
  const isRo = locale === "ro";
  const storeCurrency = useCurrencyStore((s) => s.currency);
  const { user, loading: userLoading } = useUser();
  const openAuthModal = useAuthModalStore((s) => s.open);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState("");

  // Clear any stale error when component mounts (e.g. navigating back from results)
  useEffect(() => { setError(""); }, []);

  // Auth gate — require sign-in before showing the planner.
  useEffect(() => {
    if (userLoading) return;
    if (!user) openAuthModal("login", `/${locale}/plan`);
  }, [user, userLoading, openAuthModal, locale]);

  // Sync currency/budget when Zustand persist hydrates (storeCurrency may start as EUR default)
  useEffect(() => {
    const cfg = BUDGET_CONFIG[storeCurrency] ?? BUDGET_CONFIG.EUR;
    setState(prev => ({ ...prev, currency: storeCurrency, budget: cfg.default }));
  }, [storeCurrency]);

  const defaultCfg = BUDGET_CONFIG[storeCurrency] ?? BUDGET_CONFIG.EUR;
  const [state, setState] = useState<PlanState>({
    originIata: "",
    originDisplay: "",
    destinationMode: "surprise",
    destinationIata: "",
    destinationDisplay: "",
    budget: defaultCfg.default,
    currency: storeCurrency,
    departureDate: defaultDep,
    returnDate: defaultRet,
    nights: 7,
    adults: 2,
    children: 0,
    travelStyles: [],
    climate: "no-preference",
    priorities: [],
  });

  function set(field: keyof PlanState, value: any) {
    setState(prev => ({ ...prev, [field]: value }));
  }

  function goNext() {
    setDirection(1);
    setStep(s => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep(s => s - 1);
  }

  function updateNights(n: number) {
    const dep = new Date(state.departureDate);
    const ret = new Date(dep.getTime() + n * 24 * 60 * 60 * 1000);
    set("nights", n);
    set("returnDate", ret.toISOString().split("T")[0]);
  }

  function toggleStyle(id: string) {
    set("travelStyles", state.travelStyles.includes(id)
      ? state.travelStyles.filter(s => s !== id)
      : [...state.travelStyles, id]);
  }

  function togglePriority(id: string) {
    set("priorities", state.priorities.includes(id)
      ? state.priorities.filter(p => p !== id)
      : state.priorities.length < 3
        ? [...state.priorities, id]
        : state.priorities);
  }

  async function handleSubmit() {
    if (!user) {
      openAuthModal("login", `/${locale}/plan`);
      return;
    }
    setAiLoading(true);
    setLoadingStep(0);
    setLoadingProgress(0);
    setError("");

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(s => {
        if (s < 3) return s + 1;
        clearInterval(stepInterval);
        return s;
      });
    }, 2000);

    const progressInterval = setInterval(() => {
      setLoadingProgress(p => {
        if (p >= 95) { clearInterval(progressInterval); return 95; }
        return p + 1;
      });
    }, 70);

    // Pull destinations the user already saw on the homepage so the AI
    // planner surfaces fresh ones instead of repeating those tiles.
    let excludeIatas: string[] = [];
    try {
      const raw = sessionStorage.getItem("homepage_destinations");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) excludeIatas = parsed.filter((c): c is string => typeof c === "string");
      }
    } catch { /* ignore */ }

    try {
      const isSpecific = state.destinationMode === "specific" && !!state.destinationIata;
      const res = await fetch("/api/ai/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: state.originIata,
          budget: state.budget,
          currency: state.currency,
          departureDate: state.departureDate,
          returnDate: state.returnDate,
          adults: state.adults,
          children: state.children,
          travelStyles: state.travelStyles,
          climate: state.climate,
          priorities: state.priorities,
          destinationIata: isSpecific ? state.destinationIata : undefined,
          destinationName: isSpecific ? state.destinationDisplay : undefined,
          excludeIatas: isSpecific ? undefined : excludeIatas,
          locale,
        }),
      });

      clearInterval(stepInterval);
      clearInterval(progressInterval);

      // Defensive parse: when Vercel kills the function (timeout / crash) it
      // returns a plain-text gateway page starting with "An error occurred…".
      // Calling res.json() on that throws "Unexpected token 'A'…" which then
      // leaks straight to the user. Read as text first, parse safely.
      const rawBody = await res.text();
      type PlanResponse = {
        error?: string;
        warning?: string;
        packages?: unknown[];
        budget?: number;
        inBudgetCount?: number;
        overflowCount?: number;
        relaxed?: boolean;
      };
      let data: PlanResponse | null = null;
      try { data = rawBody ? (JSON.parse(rawBody) as PlanResponse) : null; } catch { /* non-JSON gateway page */ }
      if (!res.ok) {
        throw new Error(data?.error || `${t("errorGeneric")} (${res.status})`);
      }
      if (!data) throw new Error(t("errorGeneric"));
      if (!data.packages?.length) throw new Error(data.warning || t("errorNoTrips"));

      setLoadingProgress(100);

      // Store results in sessionStorage
      sessionStorage.setItem("planResults_v2", JSON.stringify({
        packages: data.packages,
        params: state,
        warning: data.warning || null,
        budget: data.budget ?? state.budget ?? null,
        inBudgetCount: data.inBudgetCount ?? null,
        overflowCount: data.overflowCount ?? null,
        relaxed: data.relaxed ?? false,
      }));

      setTimeout(() => router.push(`/${locale}/plan/results`), 500);
    } catch (e: any) {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setAiLoading(false);
      setError(e.message || t("errorGeneric"));
      setStep(5); // back to last step
    }
  }

  // Loading screen
  if (aiLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-500 via-secondary-600 to-primary-600 flex items-center justify-center">
        <div className="w-full max-w-lg px-6 text-center">
          {/* Animated plane */}
          <div className="text-6xl mb-8 animate-bounce">✈️</div>

          <h2 className="text-2xl font-bold text-white mb-2">{t("loadingTitle")}</h2>
          <p className="text-white/70 mb-10">{t("loadingSubtitle")}</p>

          {/* Steps */}
          <div className="space-y-3 mb-10 text-left">
            {(["loadingStep1", "loadingStep2", "loadingStep3", "loadingStep4"] as const).map((key, i) => {
              const icon = ["✈️", "🏨", "🗺️", "⭐"][i];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 transition-all duration-500 ${i <= loadingStep ? "opacity-100" : "opacity-30"}`}
                >
                  <span className="text-xl">{i < loadingStep ? "✅" : icon}</span>
                  <span className={`text-sm ${i <= loadingStep ? "text-white" : "text-white/50"}`}>{t(key)}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
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

  const totalSteps = 6;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-neutral-200 dark:bg-border-default">
        <div
          className="h-full bg-primary-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Step counter */}
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-8">
          {t("stepCounter", { current: step + 1, total: totalSteps })}
        </p>

        <div className="w-full max-w-2xl relative overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            {/* STEP 1 OF 5: Origin */}
            {step === 0 && (
              <motion.div
                key="step-origin"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="text-center"
              >
                <div className="text-5xl mb-4">📍</div>
                <h2 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">
                  {t("step1Title")}
                </h2>
                <p className="text-text-secondary mb-10 text-lg">
                  {t("step1Subtitle")}
                </p>
                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-6">
                  <LocationAutocomplete
                    value={state.originIata}
                    displayValue={state.originDisplay}
                    onSelect={(iata, display) => {
                      set("originIata", iata);
                      set("originDisplay", display);
                    }}
                    placeholder={t("originPlaceholder")}
                    icon="origin"
                  />

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3 text-left">
                      {t("popularInRomania")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ORIGIN_SUGGESTIONS.map((s) => (
                        <button
                          key={s.iata}
                          onClick={() => {
                            set("originIata", s.iata);
                            set("originDisplay", s.label);
                          }}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all border ${
                            state.originIata === s.iata
                              ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10"
                              : "border-neutral-200 dark:border-border-default text-text-secondary hover:border-primary-300"
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <button
                    onClick={goNext}
                    disabled={!state.originIata}
                    className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {tCommon("next")} <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 OF 6: Destination — pick a city OR "Surprise me" */}
            {step === 1 && (
              <motion.div
                key="step-destination"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="text-center"
              >
                <div className="text-5xl mb-4">🌍</div>
                <h2 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">
                  {t("step2Title")}
                </h2>
                <p className="text-text-secondary mb-10 text-lg">
                  {t("step2Subtitle")}
                </p>

                {/* Search card */}
                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-6">
                  <LocationAutocomplete
                    value={state.destinationIata}
                    displayValue={state.destinationDisplay}
                    onSelect={(iata, display) => {
                      set("destinationIata", iata);
                      set("destinationDisplay", display);
                      set("destinationMode", "specific");
                    }}
                    placeholder={t("destinationPlaceholder")}
                    icon="destination"
                  />

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3 text-left">
                      {t("popularDestinations")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DESTINATION_SUGGESTIONS.map((s) => (
                        <button
                          key={s.iata}
                          onClick={() => {
                            set("destinationIata", s.iata);
                            set("destinationDisplay", s.label);
                            set("destinationMode", "specific");
                          }}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all border ${
                            state.destinationMode === "specific" && state.destinationIata === s.iata
                              ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10"
                              : "border-neutral-200 dark:border-border-default text-text-secondary hover:border-primary-300"
                          }`}
                        >
                          <Globe2 className="h-3.5 w-3.5" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* OR divider */}
                <div className="flex items-center gap-3 my-6 max-w-md mx-auto">
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">{tCommon("or")}</span>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                </div>

                {/* Surprise me card */}
                <button
                  onClick={() => {
                    set("destinationMode", "surprise");
                    set("destinationIata", "");
                    set("destinationDisplay", "");
                    goNext();
                  }}
                  className="w-full group relative overflow-hidden rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-500/40 bg-gradient-to-br from-primary-50/60 to-amber-50/60 dark:from-primary-500/10 dark:to-amber-500/10 px-6 py-5 text-left transition-all hover:border-primary-500 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-md group-hover:scale-105 transition-transform">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-secondary-500 dark:text-primary-300">
                        {t("surpriseMeTitle")}
                      </p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {t("surpriseMeSubtitle")}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary-500 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={goBack} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-text-secondary hover:bg-neutral-100 dark:border-border-default dark:hover:bg-surface-elevated transition-all">
                    <ArrowLeft className="h-4 w-4" /> {tCommon("back")}
                  </button>
                  <button
                    onClick={goNext}
                    disabled={state.destinationMode !== "specific" || !state.destinationIata}
                    className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {tCommon("continue")} <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 OF 6: Budget */}
            {step === 2 && (
              <motion.div
                key="step-budget"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="text-center"
              >
                <div className="text-5xl mb-4">💰</div>
                <h2 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">
                  {t("step3Title")}
                </h2>
                <p className="text-text-secondary mb-10 text-lg">
                  {t("step3Subtitle")}
                </p>
                {(() => {
                  const cfg = BUDGET_CONFIG[state.currency] ?? BUDGET_CONFIG.EUR;
                  return (
                    <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-8">
                      {/* Budget display */}
                      <div className="text-center mb-6">
                        <span className="text-5xl font-extrabold text-primary-500">
                          {formatBudget(state.budget, state.currency)}
                        </span>
                      </div>

                      {/* Slider */}
                      <input
                        type="range"
                        min={cfg.min}
                        max={cfg.max}
                        step={cfg.step}
                        value={state.budget}
                        onChange={e => set("budget", parseInt(e.target.value))}
                        className="w-full accent-primary-500 mb-4"
                      />
                      <div className="flex justify-between text-xs text-text-muted mb-6">
                        <span>{formatBudget(cfg.min, state.currency)}</span>
                        <span>{formatBudget(cfg.max, state.currency)}</span>
                      </div>

                      {/* Quick presets */}
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {cfg.presets.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => set("budget", preset)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                              state.budget === preset
                                ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10"
                                : "border-neutral-200 dark:border-border-default text-text-secondary hover:border-primary-300"
                            }`}
                          >
                            {formatBudget(preset, state.currency)}
                          </button>
                        ))}
                      </div>

                      {/* Currency selector */}
                      <div className="flex justify-center gap-3">
                        {(["EUR", "USD", "RON"] as const).map(c => (
                          <button
                            key={c}
                            onClick={() => {
                              const newCfg = BUDGET_CONFIG[c] ?? BUDGET_CONFIG.EUR;
                              setState(prev => ({ ...prev, currency: c, budget: newCfg.default }));
                            }}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${state.currency === c ? "bg-primary-500 text-white" : "bg-neutral-100 text-text-secondary hover:bg-neutral-200 dark:bg-surface-elevated"}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={goBack} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-text-secondary hover:bg-neutral-100 transition-all">
                    <ArrowLeft className="h-4 w-4" /> {tCommon("back")}
                  </button>
                  <button onClick={goNext} className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 transition-all shadow-lg">
                    {tCommon("next")} <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 OF 6: When & How Long */}
            {step === 3 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="text-center"
              >
                <div className="text-5xl mb-4">📅</div>
                <h2 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">
                  {t("step4Title")}
                </h2>
                <p className="text-text-secondary mb-10 text-lg">{t("step4Subtitle")}</p>
                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-8 space-y-6">
                  {/* Departure date */}
                  <div className="text-left">
                    <label className="block text-sm font-semibold text-text-primary mb-2">{t("departureDate")}</label>
                    <input
                      type="date"
                      value={state.departureDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => {
                        set("departureDate", e.target.value);
                        const dep = new Date(e.target.value);
                        const ret = new Date(dep.getTime() + state.nights * 24 * 60 * 60 * 1000);
                        set("returnDate", ret.toISOString().split("T")[0]);
                      }}
                      className="w-full rounded-xl border border-neutral-200 dark:border-border-default px-4 py-3 text-text-primary dark:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Nights selector */}
                  <div className="text-left">
                    <label className="block text-sm font-semibold text-text-primary mb-3">
                      {t("duration", { nights: state.nights })}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {NIGHT_OPTIONS.map(n => (
                        <button
                          key={n}
                          onClick={() => updateNights(n)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${state.nights === n ? "bg-primary-500 text-white shadow-sm" : "bg-neutral-100 text-text-secondary hover:bg-neutral-200 dark:bg-surface-elevated"}`}
                        >
                          {n}n
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-text-muted mt-3">
                      {t("returnLabel", { date: new Date(state.returnDate).toLocaleDateString(isRo ? "ro-RO" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) })}
                    </p>
                  </div>

                  {/* Travelers */}
                  <div className="text-left">
                    <label className="block text-sm font-semibold text-text-primary mb-3">{t("travelers")}</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {[{ label: t("adults"), field: "adults" as const }, { label: t("children"), field: "children" as const }].map(({ label, field }) => (
                        <div key={field} className="flex items-center gap-3 flex-1">
                          <span className="text-sm text-text-secondary w-16">{label}</span>
                          <button
                            onClick={() => set(field, Math.max(field === "adults" ? 1 : 0, state[field] - 1))}
                            className="h-9 w-9 rounded-full border border-neutral-200 flex items-center justify-center text-lg font-medium hover:bg-neutral-100 transition-colors"
                          >-</button>
                          <span className="w-6 text-center font-bold text-text-primary">{state[field]}</span>
                          <button
                            onClick={() => set(field, Math.min(9, state[field] + 1))}
                            className="h-9 w-9 rounded-full border border-neutral-200 flex items-center justify-center text-lg font-medium hover:bg-neutral-100 transition-colors"
                          >+</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={goBack} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-text-secondary hover:bg-neutral-100 transition-all">
                    <ArrowLeft className="h-4 w-4" /> {tCommon("back")}
                  </button>
                  <button onClick={goNext} className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 transition-all shadow-lg">
                    {tCommon("next")} <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5 OF 6: Travel Style & Climate */}
            {step === 4 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="text-center"
              >
                <div className="text-5xl mb-4">✨</div>
                <h2 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">
                  {t("step5Title")}
                </h2>
                <p className="text-text-secondary mb-8 text-lg">{t("step5Subtitle")}</p>

                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-5 sm:p-6 space-y-6">
                  {/* Travel styles grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {TRAVEL_STYLES.map(style => {
                      const selected = state.travelStyles.includes(style.id);
                      const tone = TONE_STYLES[style.tone];
                      const Icon = style.icon;
                      return (
                        <button
                          key={style.id}
                          onClick={() => toggleStyle(style.id)}
                          className={`group relative flex flex-col items-start gap-2 rounded-2xl p-3 sm:p-3.5 text-left transition-all border-2 min-h-[120px] ${
                            selected
                              ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/10 shadow-md"
                              : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-primary-300 hover:shadow-md"
                          }`}
                        >
                          <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${tone.iconBg}`}>
                            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${tone.iconFg}`} />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-bold leading-tight ${selected ? "text-primary-600 dark:text-primary-400" : "text-text-primary"}`}>
                              {t(`travelStyles.${style.id}` as never)}
                            </p>
                            <p className="text-[11px] text-text-muted leading-snug mt-0.5 line-clamp-2">
                              {t(`travelStyles.${style.id}Desc` as never)}
                            </p>
                          </div>
                          {selected && (
                            <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Climate preference */}
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">{t("climatePreference")}</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {CLIMATE_OPTIONS.map(c => {
                        const tone = TONE_STYLES[c.tone];
                        const Icon = c.icon;
                        const selected = state.climate === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => set("climate", c.id)}
                            className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all border-2 ${
                              selected
                                ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/10 shadow-md"
                                : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-primary-300"
                            }`}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.iconBg}`}>
                              <Icon className={`h-4.5 w-4.5 ${tone.iconFg}`} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-bold leading-tight ${selected ? "text-primary-600 dark:text-primary-400" : "text-text-primary"}`}>
                                {t(`climates.${c.id === "no-preference" ? "noPreference" : c.id}` as never)}
                              </p>
                              <p className="text-[11px] text-text-muted leading-snug">{t(`climates.${c.id === "no-preference" ? "noPreferenceDesc" : c.id + "Desc"}` as never)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={goBack} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-text-secondary hover:bg-neutral-100 transition-all">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={goNext}
                    disabled={state.travelStyles.length === 0}
                    className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    Next <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6 OF 6: Priorities */}
            {step === 5 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="text-center"
              >
                <div className="text-5xl mb-4">🎯</div>
                <h2 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">
                  {t("step6Title")}
                </h2>
                <p className="text-text-secondary mb-8 text-lg">{t("step6Subtitle")}</p>

                {error && (
                  <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-5 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRIORITY_OPTIONS.map(p => {
                      const selected = state.priorities.includes(p.id);
                      const disabled = !selected && state.priorities.length >= 3;
                      const tone = TONE_STYLES[p.tone];
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => !disabled && togglePriority(p.id)}
                          disabled={disabled}
                          className={`group relative flex items-center gap-3 rounded-2xl p-4 text-left transition-all border-2 ${
                            selected
                              ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/10 shadow-md"
                              : disabled
                                ? "border-neutral-100 bg-neutral-50 dark:bg-surface-elevated/50 cursor-not-allowed opacity-40"
                                : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-primary-300 hover:shadow-md"
                          }`}
                        >
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${tone.iconBg}`}>
                            <Icon className={`h-5 w-5 ${tone.iconFg}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold leading-tight ${selected ? "text-primary-600 dark:text-primary-400" : "text-text-primary"}`}>
                              {t(`priorities.${p.id === "best-hotel" ? "bestHotel" : p.id === "direct-flights" ? "directFlights" : p.id === "shortest-time" ? "shortestTime" : p.id === "central-location" ? "centralLocation" : p.id === "free-cancellation" ? "freeCancellation" : p.id}` as never)}
                            </p>
                            <p className="text-[11px] text-text-muted leading-snug mt-0.5">
                              {t(`priorities.${p.id === "best-hotel" ? "bestHotelDesc" : p.id === "direct-flights" ? "directFlightsDesc" : p.id === "shortest-time" ? "shortestTimeDesc" : p.id === "central-location" ? "centralLocationDesc" : p.id === "free-cancellation" ? "freeCancellationDesc" : p.id + "Desc"}` as never)}
                            </p>
                          </div>
                          {selected && (
                            <CheckCircle2 className="h-5 w-5 text-primary-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-text-muted mt-5 text-center">
                    {t("selectedOfMax", { selected: state.priorities.length, max: 3 })}
                  </p>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={goBack} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-text-secondary hover:bg-neutral-100 transition-all">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl"
                  >
                    {t("finalCta")} <Plane className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
