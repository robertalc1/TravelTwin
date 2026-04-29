"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCY_LIST, type CurrencyCode } from "@/stores/currencyStore";

/**
 * Compact dropdown picker for the active display currency.
 * Persists to localStorage automatically via the Zustand store.
 */
export function CurrencySelector({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-primary-300 hover:text-text-primary transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5" />
        {currency}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface shadow-lg overflow-hidden"
        >
          {CURRENCY_LIST.map((c) => {
            const active = currency === c.code;
            return (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code as CurrencyCode);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "hover:bg-neutral-50 dark:hover:bg-surface-elevated text-text-primary"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs w-8 text-text-muted">{c.code}</span>
                  <span>{c.label}</span>
                </span>
                <span className="flex items-center gap-2 text-text-muted">
                  <span>{c.symbol}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary-500" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
