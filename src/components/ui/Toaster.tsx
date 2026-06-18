"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useToastStore, type Toast } from "@/stores/toastStore";

const TONE_STYLES: Record<Toast["tone"], { bg: string; ring: string; icon: typeof CheckCircle2 }> = {
  success: { bg: "bg-emerald-500", ring: "ring-emerald-400/30", icon: CheckCircle2 },
  error: { bg: "bg-red-500", ring: "ring-red-400/30", icon: AlertCircle },
  info: { bg: "bg-primary-500", ring: "ring-primary-400/30", icon: Info },
};

/** Errors dwell longer — they carry a recovery action the user must read. */
const DWELL_MS: Record<Toast["tone"], number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

/**
 * A single toast. Owns its own auto-dismiss timer so it can pause while the
 * pointer (or keyboard focus) is over it — users get time to finish reading.
 */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const tone = TONE_STYLES[toast.tone];
  const Icon = tone.icon;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), DWELL_MS[toast.tone]);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.tone, onDismiss]);

  return (
    <motion.div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={`pointer-events-auto flex items-center gap-3 rounded-xl ${tone.bg} text-white shadow-lg ring-1 ${tone.ring} px-4 py-3`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/**
 * Bottom-right stack of transient toasts. Each toast is keyed by id so
 * AnimatePresence can animate enter/exit independently.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
