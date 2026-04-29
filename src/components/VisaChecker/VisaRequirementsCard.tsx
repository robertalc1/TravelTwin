"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  FileText,
  Clock,
  Banknote,
} from "lucide-react";
import type { VisaInfo } from "@/app/api/ai/visa-check/route";

interface Props {
  nationality: string;
  country: string;
  nights: number;
}

/**
 * Card with visa & entry requirements for a given citizenship and destination.
 * Calls /api/ai/visa-check which itself caches answers for 24h.
 */
export function VisaRequirementsCard({ nationality, country, nights }: Props) {
  const [data, setData] = useState<VisaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nationality || !country) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/visa-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nationality, country, nights }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as VisaInfo;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Visa check failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [nationality, country, nights]);

  if (!nationality) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-border-default p-6 text-center text-text-muted text-sm">
        Set your nationality in your profile to see visa requirements.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6 flex items-center gap-3 text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking visa requirements…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-800 p-4 flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Could not load visa info — please verify with the embassy directly.</span>
      </div>
    );
  }

  const tone = data.visaRequired
    ? { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", icon: AlertTriangle }
    : { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", icon: ShieldCheck };
  const Icon = tone.icon;

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.bg}`}>
          <Icon className={`h-5 w-5 ${tone.text}`} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Visa &amp; entry — {nationality} → {country}
          </p>
          <h3 className="text-lg font-bold text-secondary-500">
            {data.visaRequired
              ? `Visa required (${data.visaType})`
              : `Visa-free up to ${data.maxStayDays} days`}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-neutral-50 dark:bg-surface-elevated p-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Clock className="h-3.5 w-3.5" /> Processing
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {data.processingTime || "—"}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 dark:bg-surface-elevated p-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Banknote className="h-3.5 w-3.5" /> Cost
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {data.costEur != null ? `≈ €${data.costEur}` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 dark:bg-surface-elevated p-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Max stay
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {data.maxStayDays} days
          </p>
        </div>
      </div>

      {data.documents.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documents
          </p>
          <ul className="space-y-1.5">
            {data.documents.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.importantNotes.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Important notes
          </p>
          <ul className="space-y-1.5">
            {data.importantNotes.map((n) => (
              <li key={n} className="text-sm text-text-secondary leading-relaxed">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 pt-4 border-t border-neutral-200 dark:border-border-default text-xs text-text-muted italic">
        {data.disclaimer}
      </p>
    </div>
  );
}
