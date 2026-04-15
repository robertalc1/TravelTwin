"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
// Travel style options
const TRAVEL_STYLES = [
  { id: "beach", emoji: "🏖", label: "Beach & Relaxation" },
  { id: "nature", emoji: "🏔", label: "Mountains & Nature" },
  { id: "culture", emoji: "🏛", label: "Culture & History" },
  { id: "nightlife", emoji: "🎉", label: "Nightlife & Entertainment" },
  { id: "food", emoji: "🍕", label: "Food & Culinary" },
  { id: "snow", emoji: "❄️", label: "Winter & Snow" },
  { id: "adventure", emoji: "🏄", label: "Adventure & Sports" },
  { id: "romantic", emoji: "💑", label: "Romantic Getaway" },
  { id: "family", emoji: "👨‍👩‍👧‍👦", label: "Family Friendly" },
  { id: "nomad", emoji: "💼", label: "Digital Nomad" },
];

const CLIMATE_OPTIONS = [
  { id: "warm", emoji: "☀️", label: "Warm (25°C+)" },
  { id: "mild", emoji: "🌤", label: "Mild (15-25°C)" },
  { id: "cold", emoji: "❄️", label: "Cold (< 15°C)" },
  { id: "no-preference", emoji: "🤷", label: "No preference" },
];

const PRIORITY_OPTIONS = [
  { id: "cheapest", emoji: "💰", label: "Cheapest price" },
  { id: "best-hotel", emoji: "⭐", label: "Best hotel rating" },
  { id: "direct-flights", emoji: "✈️", label: "Direct flights only" },
  { id: "shortest-time", emoji: "🕐", label: "Shortest travel time" },
  { id: "central-location", emoji: "📍", label: "Central hotel location" },
  { id: "free-cancellation", emoji: "🆓", label: "Free cancellation" },
];

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
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState("");

  // Clear any stale error when component mounts (e.g. navigating back from results)
  useEffect(() => { setError(""); }, []);

  const [state, setState] = useState<PlanState>({
    originIata: "OTP",
    originDisplay: "Bucharest",
    budget: 800,
    currency: "EUR",
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
    setAiLoading(true);
    setLoadingStep(0);
    setLoadingProgress(0);
    setError("");

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(s => {
        if (s < LOADING_STEPS.length - 1) return s + 1;
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

    try {
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
        }),
      });

      clearInterval(stepInterval);
      clearInterval(progressInterval);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to plan trip");
      if (!data.packages?.length) throw new Error(data.warning || "No trips found for your criteria. Try adjusting your budget or dates.");

      setLoadingProgress(100);

      // Store results in sessionStorage
      sessionStorage.setItem("planResults", JSON.stringify({ packages: data.packages, params: state, warning: data.warning || null }));

      setTimeout(() => router.push("/plan/results"), 500);
    } catch (e: any) {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setAiLoading(false);
      setError(e.message || "Something went wrong. Please try again.");
      setStep(3); // back to last step
    }
  }

  // Loading screen
  if (aiLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-500 via-secondary-600 to-primary-600 flex items-center justify-center">
        <div className="w-full max-w-lg px-6 text-center">
          {/* Animated plane */}
          <div className="text-6xl mb-8 animate-bounce">✈️</div>

          <h2 className="text-2xl font-bold text-white mb-2">Your AI travel agent is working...</h2>
          <p className="text-white/70 mb-10">We&apos;re finding your perfect trip</p>

          {/* Steps */}
          <div className="space-y-3 mb-10 text-left">
            {LOADING_STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-all duration-500 ${i <= loadingStep ? "opacity-100" : "opacity-30"}`}
              >
                <span className="text-xl">{i < loadingStep ? "✅" : s.icon}</span>
                <span className={`text-sm ${i <= loadingStep ? "text-white" : "text-white/50"}`}>{s.text}</span>
              </div>
            ))}
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

  const totalSteps = 4;
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
          Step {step + 1} of {totalSteps}
        </p>

        <div className="w-full max-w-2xl relative overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            {/* STEP 1 OF 4: Budget */}
            {step === 0 && (
              <motion.div
                key="step0"
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
                  What&apos;s your total budget?
                </h2>
                <p className="text-text-secondary mb-10 text-lg">
                  Including flights and hotel for all travelers
                </p>
                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-8">
                  {/* Budget display */}
                  <div className="text-center mb-6">
                    <span className="text-5xl font-extrabold text-primary-500">
                      {state.currency === "EUR" ? "€" : state.currency === "USD" ? "$" : ""}
                      {state.budget.toLocaleString()}
                      {state.currency === "RON" ? " RON" : ""}
                    </span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min={150}
                    max={3000}
                    step={50}
                    value={state.budget}
                    onChange={e => set("budget", parseInt(e.target.value))}
                    className="w-full accent-primary-500 mb-6"
                  />
                  <div className="flex justify-between text-xs text-text-muted mb-8">
                    <span>€150</span><span>€3,000</span>
                  </div>

                  {/* Currency selector */}
                  <div className="flex justify-center gap-3">
                    {["EUR", "USD", "RON"].map(c => (
                      <button
                        key={c}
                        onClick={() => set("currency", c)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${state.currency === c ? "bg-primary-500 text-white" : "bg-neutral-100 text-text-secondary hover:bg-neutral-200 dark:bg-surface-elevated"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={goNext} className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 transition-all shadow-lg">
                    Next <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 OF 4: When & How Long */}
            {step === 1 && (
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
                  When do you want to travel?
                </h2>
                <p className="text-text-secondary mb-10 text-lg">Choose your departure date and duration</p>
                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-8 space-y-6">
                  {/* Departure date */}
                  <div className="text-left">
                    <label className="block text-sm font-semibold text-text-primary mb-2">Departure date</label>
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
                      Duration: <span className="text-primary-500">{state.nights} nights</span>
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
                      Return: {new Date(state.returnDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Travelers */}
                  <div className="text-left">
                    <label className="block text-sm font-semibold text-text-primary mb-3">Travelers</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {[{ label: "Adults", field: "adults" as const }, { label: "Children", field: "children" as const }].map(({ label, field }) => (
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
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button onClick={goNext} className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white hover:bg-primary-600 transition-all shadow-lg">
                    Next <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 OF 4: Travel Style & Climate */}
            {step === 2 && (
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
                  What kind of trip are you dreaming of?
                </h2>
                <p className="text-text-secondary mb-8 text-lg">Select all that apply</p>

                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-6 space-y-6">
                  {/* Travel styles grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {TRAVEL_STYLES.map(style => {
                      const selected = state.travelStyles.includes(style.id);
                      return (
                        <button
                          key={style.id}
                          onClick={() => toggleStyle(style.id)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-all border-2 ${selected
                            ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 shadow-sm"
                            : "border-neutral-200 dark:border-border-default text-text-secondary hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/5"
                            }`}
                        >
                          <span className="text-xl">{style.emoji}</span>
                          <span className="text-left text-xs leading-tight">{style.label}</span>
                          {selected && <CheckCircle2 className="h-4 w-4 text-primary-500 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Climate preference */}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary mb-3">Climate preference</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CLIMATE_OPTIONS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => set("climate", c.id)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all border-2 ${state.climate === c.id
                            ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10"
                            : "border-neutral-200 dark:border-border-default text-text-secondary hover:border-primary-300"
                            }`}
                        >
                          <span className="text-lg">{c.emoji}</span>
                          {c.label}
                        </button>
                      ))}
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

            {/* STEP 4 OF 4: Priorities */}
            {step === 3 && (
              <motion.div
                key="step3"
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
                  Almost there! What matters most?
                </h2>
                <p className="text-text-secondary mb-8 text-lg">Pick up to 3 priorities</p>

                {error && (
                  <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="bg-white dark:bg-surface rounded-2xl shadow-lg p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRIORITY_OPTIONS.map(p => {
                      const selected = state.priorities.includes(p.id);
                      const disabled = !selected && state.priorities.length >= 3;
                      return (
                        <button
                          key={p.id}
                          onClick={() => !disabled && togglePriority(p.id)}
                          className={`flex items-center gap-3 rounded-xl px-4 py-4 text-sm font-medium transition-all border-2 text-left ${selected
                            ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10"
                            : disabled
                              ? "border-neutral-100 bg-neutral-50 text-text-muted cursor-not-allowed opacity-50"
                              : "border-neutral-200 dark:border-border-default text-text-secondary hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/5"
                            }`}
                        >
                          <span className="text-xl">{p.emoji}</span>
                          <span className="flex-1">{p.label}</span>
                          {selected && <CheckCircle2 className="h-4 w-4 text-primary-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-text-muted mt-4 text-center">
                    {state.priorities.length}/3 selected
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
                    Find My Trip <Plane className="h-5 w-5" />
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
