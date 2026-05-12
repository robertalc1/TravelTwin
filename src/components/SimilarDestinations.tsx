'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, MapPin } from 'lucide-react';
import type { DestinationProfile } from '@/lib/destinations';

interface SimilarDestinationsProps {
  referenceIata: string;
  /** Optional total-trip budget in EUR for budget-aware ranking. */
  maxBudget?: number;
  /** Optional travel month (1-12) for seasonality bonus. */
  month?: number;
  /** Heading text. Defaults to "You might also like". */
  title?: string;
  /** Caption beneath the heading. */
  subtitle?: string;
  /** Number of suggestions to fetch (default 6). */
  limit?: number;
  /** Extra Tailwind classes for the wrapper. */
  className?: string;
}

interface ApiResponse {
  reference: string;
  count: number;
  results: DestinationProfile[];
}

function buildImageUrl(imageId: string): string {
  return `https://images.unsplash.com/${imageId}?w=600&h=400&fit=crop&q=80`;
}

export default function SimilarDestinations({
  referenceIata,
  maxBudget,
  month,
  title = 'You might also like',
  subtitle,
  limit = 6,
  className = '',
}: SimilarDestinationsProps) {
  const router = useRouter();
  const [results, setResults] = useState<DestinationProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!referenceIata) return;
    let cancelled = false;

    const qs = new URLSearchParams({ iata: referenceIata, n: String(limit) });
    if (maxBudget != null) qs.set('maxBudget', String(maxBudget));
    if (month != null) qs.set('month', String(month));

    fetch(`/api/destinations/similar?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ApiResponse | null) => {
        if (cancelled || !data) return;
        setResults(data.results || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [referenceIata, maxBudget, month, limit]);

  if (!loading && results.length === 0) return null;

  return (
    <section
      className={`rounded-3xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-5 sm:p-7 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <h2 className="text-base sm:text-lg font-extrabold text-text-primary">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[260px] h-[280px] rounded-2xl bg-neutral-100 dark:bg-surface-elevated animate-pulse snap-start"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {results.map((d) => (
            <button
              key={d.iata}
              type="button"
              onClick={() => router.push(`/plan?destination=${d.iata}`)}
              className="shrink-0 w-[260px] snap-start text-left rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-400 hover:shadow-md transition-all group"
            >
              <div
                className="relative h-32 w-full bg-neutral-200 dark:bg-surface-elevated"
                style={{
                  backgroundImage: `url(${buildImageUrl(d.imageId)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/90 text-text-primary backdrop-blur-sm">
                  {d.budgetLevel}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-extrabold text-text-primary truncate">
                  {d.city}
                </p>
                <p className="text-xs text-text-muted flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" />
                  {d.country}
                </p>
                <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
                  {d.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 capitalize"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:gap-2 transition-all">
                  Plan a trip
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
