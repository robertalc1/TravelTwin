"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, type Toast } from "@/stores/toastStore";

const TONE_STYLES: Record<Toast["tone"], { bg: string; ring: string; icon: typeof CheckCircle2 }> = {
  success: { bg: "bg-emerald-500", ring: "ring-emerald-400/30", icon: CheckCircle2 },
  error: { bg: "bg-red-500", ring: "ring-red-400/30", icon: AlertCircle },
  info: { bg: "bg-primary-500", ring: "ring-primary-400/30", icon: Info },
};

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
        {toasts.map((t) => {
          const tone = TONE_STYLES[t.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl ${tone.bg} text-white shadow-lg ring-1 ${tone.ring} px-4 py-3`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-white/70 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
