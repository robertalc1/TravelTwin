"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { useCurrencyStore } from "@/stores/currencyStore";
import { FlagRO, FlagGB } from "@/components/ui/FlagIcon";

const LANG_LABEL: Record<Locale, { label: string; Flag: (p: { className?: string }) => React.ReactElement }> = {
  en: { label: "English", Flag: FlagGB },
  ro: { label: "Română", Flag: FlagRO },
};

/**
 * Header dropdown to switch the UI language between EN and RO. Routes to the
 * equivalent path with the new locale prefix and applies the locale's default
 * currency unless the user has set one manually (per the i18n plan).
 */
export function LanguageSelector({ className = "" }: { className?: string }) {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const applyLocaleDefault = useCurrencyStore((s) => s.applyLocaleDefault);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function switchTo(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }

    // Swap the leading /en or /ro segment with the new locale.
    const stripped = pathname.replace(/^\/(en|ro)(?=\/|$)/, "") || "/";
    const newPath = `/${next}${stripped === "/" ? "" : stripped}`;

    applyLocaleDefault(next);

    startTransition(() => {
      router.replace(newPath);
    });
    setOpen(false);
  }

  const Current = LANG_LABEL[locale].Flag;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-primary-300 hover:text-text-primary transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("selectorLabel")}
      >
        <Current className="h-3.5 w-5" />
        <span className="uppercase font-semibold">{locale}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface shadow-lg overflow-hidden"
        >
          {routing.locales.map((code) => {
            const meta = LANG_LABEL[code];
            const Flag = meta.Flag;
            const active = locale === code;
            return (
              <button
                key={code}
                onClick={() => switchTo(code)}
                role="option"
                aria-selected={active}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "hover:bg-neutral-50 dark:hover:bg-surface-elevated text-text-primary"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Flag className="h-4 w-6" />
                  <span className="font-medium">{meta.label}</span>
                </span>
                {active && <Check className="h-4 w-4 text-primary-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
