"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowLeft, Filter, RotateCcw, Star } from "lucide-react";
import HotelCard, { type HotelOfferData } from "@/components/Hotels/HotelCard";

function HotelsSearchContent() {
  const router = useRouter();
  const locale = useLocale();
  const search = useSearchParams();
  const cityCode = (search.get("cityCode") || "").toUpperCase();
  const cityName = search.get("cityName") || cityCode;
  const checkIn = search.get("checkIn") || "";
  const checkOut = search.get("checkOut") || "";
  const adults = search.get("adults") || "2";
  const tripId = search.get("tripId") || "";

  const datesMissing = !cityCode || !checkIn || !checkOut;
  const [hotels, setHotels] = useState<HotelOfferData[]>([]);
  const [loading, setLoading] = useState(!datesMissing);
  const [warning, setWarning] = useState<string | null>(
    datesMissing ? "Missing search dates. Open this page from a trip." : null,
  );

  const [sortBy, setSortBy] = useState<"recommended" | "price" | "rating">("recommended");
  const [filterStars, setFilterStars] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (datesMissing) return;
    let cancelled = false;
    const qs = new URLSearchParams({ cityCode, checkIn, checkOut, adults });
    fetch(`/api/hotels/search?${qs.toString()}`)
      .then((r) => r.json())
      .then(
        (data: {
          hotels?: HotelOfferData[];
          warning?: string;
        }) => {
          if (cancelled) return;
          setHotels(data.hotels || []);
          setWarning(data.warning || null);
        },
      )
      .catch(() => {
        if (!cancelled) setWarning("Failed to load hotels.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityCode, checkIn, checkOut, adults, datesMissing]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    return Math.max(
      1,
      Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }, [checkIn, checkOut]);

  // Precompute total prices for the budget slider bounds
  const allPrices = hotels.map((h) => parseFloat(h.offers[0]?.price.total || "0"));
  const minPriceAvailable = allPrices.length ? Math.floor(Math.min(...allPrices)) : 0;
  const maxPriceAvailable = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 0;

  const filtered = useMemo(() => {
    const minN = minPrice ? parseFloat(minPrice) : -Infinity;
    const maxN = maxPrice ? parseFloat(maxPrice) : Infinity;
    return hotels
      .filter((h) => {
        const stars = parseInt(h.hotel.rating || "0", 10);
        if (filterStars > 0 && stars < filterStars) return false;
        const total = parseFloat(h.offers[0]?.price.total || "0");
        if (total < minN || total > maxN) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price") {
          return (
            parseFloat(a.offers[0]?.price.total || "999999") -
            parseFloat(b.offers[0]?.price.total || "999999")
          );
        }
        if (sortBy === "rating") {
          return (
            parseInt(b.hotel.rating || "0", 10) -
            parseInt(a.hotel.rating || "0", 10)
          );
        }
        return 0;
      });
  }, [hotels, filterStars, minPrice, maxPrice, sortBy]);

  function resetFilters() {
    setFilterStars(0);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("recommended");
  }

  function handleHotelClick(h: HotelOfferData) {
    const qs = new URLSearchParams();
    if (checkIn) qs.set("checkIn", checkIn);
    if (checkOut) qs.set("checkOut", checkOut);
    if (cityCode) qs.set("cityCode", cityCode);
    if (h.offers[0]?.price.total) qs.set("total", h.offers[0].price.total);
    if (h.hotel.name) qs.set("name", h.hotel.name);
    // Hotel detail lives under the trip context. Without a tripId there's no
    // package to attach the choice to, so we bounce back to /plan.
    if (!tripId) {
      router.push(`/${locale}/plan`);
      return;
    }
    router.push(
      `/${locale}/plan/trip/${encodeURIComponent(tripId)}/hotel/${encodeURIComponent(
        h.hotel.hotelId,
      )}?${qs.toString()}`,
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-200 dark:border-border-default">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-3 flex items-center gap-3">
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
              Find stays in {cityName}
            </h1>
            <p className="text-xs text-text-muted">
              {hotels.length} results
              {checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="lg:hidden inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 py-2 text-sm font-semibold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Filters sidebar */}
        <aside
          className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block lg:sticky lg:top-24 lg:self-start`}
        >
          <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-text-primary">Filters</h2>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-primary-500 hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>

            <section className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Sort by
              </h3>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "recommended" | "price" | "rating")
                }
                className="w-full text-sm border border-neutral-200 dark:border-border-default rounded-xl px-3 py-2 bg-white dark:bg-surface text-text-primary"
              >
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price</option>
                <option value="rating">Highest stars</option>
              </select>
            </section>

            <section className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Stars
              </h3>
              <div className="flex flex-wrap gap-2">
                {[0, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterStars(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      filterStars === s
                        ? "bg-primary-500 text-white"
                        : "bg-neutral-100 dark:bg-surface-elevated text-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {s === 0 ? "All" : (
                      <>
                        {s}
                        <Star className="h-3 w-3 fill-current" />
                      </>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Budget (total)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col text-[11px] text-text-muted">
                  Min
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder={String(minPriceAvailable || 0)}
                    className="mt-1 w-full border border-neutral-200 dark:border-border-default rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-surface text-text-primary"
                  />
                </label>
                <label className="flex flex-col text-[11px] text-text-muted">
                  Max
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder={maxPriceAvailable ? String(maxPriceAvailable) : "No limit"}
                    className="mt-1 w-full border border-neutral-200 dark:border-border-default rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-surface text-text-primary"
                  />
                </label>
              </div>
            </section>
          </div>
        </aside>

        {/* Hotel list */}
        <section>
          {warning && (
            <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {warning}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🏨</p>
              <p className="text-text-secondary">
                {hotels.length === 0
                  ? "No hotels available for these dates."
                  : "No hotels match your filters."}
              </p>
              {hotels.length > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 text-sm text-primary-500 hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((h) => (
                <HotelCard
                  key={h.hotel.hotelId}
                  hotelOffer={h}
                  nights={nights}
                  onSelect={handleHotelClick}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function HotelsSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">🏨</div>
            <p className="text-text-secondary">Loading hotels...</p>
          </div>
        </div>
      }
    >
      <HotelsSearchContent />
    </Suspense>
  );
}
