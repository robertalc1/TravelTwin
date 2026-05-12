"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Car } from "lucide-react";
import { buildRentalcarsUrl } from "@/lib/rentalcarsLink";

function CarsSearchContent() {
  const router = useRouter();
  const search = useSearchParams();
  const cityCode = (search.get("cityCode") || "").toUpperCase();
  const cityName = search.get("cityName") || cityCode;
  const pickUpDate = search.get("pickUpDate") || "";
  const dropOffDate = search.get("dropOffDate") || "";

  const datesMissing = !cityCode || !pickUpDate || !dropOffDate;
  const days = !datesMissing
    ? Math.max(
        1,
        Math.ceil(
          (new Date(dropOffDate).getTime() - new Date(pickUpDate).getTime()) /
            86_400_000,
        ),
      )
    : 0;

  const partnerUrl = !datesMissing
    ? buildRentalcarsUrl({ iata: cityCode, pickUpDate, dropOffDate })
    : "";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-200 dark:border-border-default">
        <div className="mx-auto max-w-[1100px] px-4 lg:px-8 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-text-primary truncate">
              Rental cars in {cityName}
            </h1>
            {!datesMissing && (
              <p className="text-xs text-text-muted">
                {pickUpDate} → {dropOffDate} · {days} {days === 1 ? "day" : "days"}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 lg:px-8 py-10 lg:py-16">
        {datesMissing ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <p className="text-5xl mb-4">🚙</p>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Missing rental dates
            </h2>
            <p className="text-sm text-text-secondary">
              Open this page from a trip so we can pre-fill pickup and drop-off.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto rounded-3xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-7 lg:p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 shrink-0">
                <Car className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                  Rental cars
                </p>
                <h2 className="text-xl font-extrabold text-text-primary truncate">
                  {cityName}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-7 rounded-2xl border border-neutral-100 dark:border-border-default p-4 bg-neutral-50/50 dark:bg-surface-elevated/50">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-1">
                  Pick-up
                </p>
                <p className="text-sm font-bold text-text-primary">{pickUpDate}</p>
                <p className="text-xs text-text-secondary">{cityCode} airport · 10:00</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-1">
                  Drop-off
                </p>
                <p className="text-sm font-bold text-text-primary">{dropOffDate}</p>
                <p className="text-xs text-text-secondary">{cityCode} airport · 10:00</p>
              </div>
            </div>

            <a
              href={partnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 transition-colors"
            >
              Search rental cars on Rentalcars.com
              <ExternalLink className="h-4 w-4" />
            </a>

            <p className="mt-5 text-xs text-text-muted text-center leading-relaxed">
              We partner with Rentalcars.com to compare offers from Hertz, Avis,
              Europcar and 900+ local suppliers. Your city and dates are pre-filled —
              browse cars on their site, then come back to keep planning.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CarsSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">🚙</div>
            <p className="text-text-secondary">Loading...</p>
          </div>
        </div>
      }
    >
      <CarsSearchContent />
    </Suspense>
  );
}
