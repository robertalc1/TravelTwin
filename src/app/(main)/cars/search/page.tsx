"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Filter, RotateCcw } from "lucide-react";
import RentalCarCard from "@/components/Cars/RentalCarCard";
import { useTripPricing } from "@/stores/tripPricingStore";
import { useToastStore } from "@/stores/toastStore";
import { useCurrencyStore } from "@/stores/currencyStore";
import { buildTransferFromCar } from "@/components/TripDetail/RentalCarsTab";
import type { NormalizedCar } from "@/app/api/cars/search/route";

interface CarsApiResponse {
  cars: NormalizedCar[];
  source: "live" | "cached" | "fallback" | "error";
  count: number;
  cityName?: string;
  warning?: string;
}

function CarsSearchContent() {
  const router = useRouter();
  const search = useSearchParams();
  const cityCode = (search.get("cityCode") || "").toUpperCase();
  const cityName = search.get("cityName") || cityCode;
  const pickUpDate = search.get("pickUpDate") || "";
  const dropOffDate = search.get("dropOffDate") || "";
  const tripId = search.get("tripId") || "";

  const datesMissing = !cityCode || !pickUpDate || !dropOffDate;
  const [cars, setCars] = useState<NormalizedCar[]>([]);
  const [loading, setLoading] = useState(!datesMissing);
  const [warning, setWarning] = useState<string | null>(
    datesMissing ? "Missing rental dates. Open this page from a trip." : null,
  );

  const [sortBy, setSortBy] = useState<"price" | "seats">("price");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectTransferInStore = useTripPricing((s) => s.selectTransfer);
  const selectedTransfer = useTripPricing((s) => s.selectedTransfer);
  const showToast = useToastStore((s) => s.show);
  const formatCurrency = useCurrencyStore((s) => s.format);

  useEffect(() => {
    if (datesMissing) return;
    let cancelled = false;
    const qs = new URLSearchParams({ cityCode, pickUpDate, dropOffDate });
    fetch(`/api/cars/search?${qs.toString()}`)
      .then((r) => r.json())
      .then((data: CarsApiResponse) => {
        if (cancelled) return;
        setCars(data.cars || []);
        setWarning(data.warning || null);
      })
      .catch(() => {
        if (!cancelled) setWarning("Failed to load rental cars.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityCode, pickUpDate, dropOffDate, datesMissing]);

  const days = useMemo(() => {
    if (!pickUpDate || !dropOffDate) return 1;
    return Math.max(
      1,
      Math.ceil(
        (new Date(dropOffDate).getTime() - new Date(pickUpDate).getTime()) /
          86_400_000,
      ),
    );
  }, [pickUpDate, dropOffDate]);

  const filtered = useMemo(() => {
    const minN = minPrice ? parseFloat(minPrice) : -Infinity;
    const maxN = maxPrice ? parseFloat(maxPrice) : Infinity;
    return [...cars]
      .filter((c) => c.totalPrice >= minN && c.totalPrice <= maxN)
      .sort((a, b) => {
        if (sortBy === "price") return a.totalPrice - b.totalPrice;
        return b.seatCount - a.seatCount;
      });
  }, [cars, minPrice, maxPrice, sortBy]);

  function resetFilters() {
    setMinPrice("");
    setMaxPrice("");
    setSortBy("price");
  }

  function handleSelect(car: NormalizedCar) {
    const wrapped = buildTransferFromCar({
      id: car.id,
      vendor: car.vendor,
      vendorLogo: car.vendorLogo,
      vehicleType: car.vehicleType,
      transmission: car.transmission,
      seatCount: car.seatCount,
      bagCount: car.bagCount,
      totalPrice: car.totalPrice,
      currency: car.currency,
      source: car.source,
    });
    selectTransferInStore(wrapped, Math.round(car.totalPrice));
    showToast(
      `Car added · ${formatCurrency(Math.round(car.totalPrice), car.currency)}`,
      "success",
    );
    if (tripId) {
      router.push(`/plan/trip/${tripId}`);
    } else {
      router.back();
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
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
              Rental cars in {cityName}
            </h1>
            <p className="text-xs text-text-muted">
              {cars.length} cars · {days} {days === 1 ? "day" : "days"}
              {pickUpDate ? ` · ${pickUpDate} → ${dropOffDate}` : ""}
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
                onChange={(e) => setSortBy(e.target.value as "price" | "seats")}
                className="w-full text-sm border border-neutral-200 dark:border-border-default rounded-xl px-3 py-2 bg-white dark:bg-surface text-text-primary"
              >
                <option value="price">Lowest price</option>
                <option value="seats">Most seats</option>
              </select>
            </section>

            <section>
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
                    placeholder="0"
                    className="mt-1 w-full border border-neutral-200 dark:border-border-default rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-surface text-text-primary"
                  />
                </label>
                <label className="flex flex-col text-[11px] text-text-muted">
                  Max
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="No limit"
                    className="mt-1 w-full border border-neutral-200 dark:border-border-default rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-surface text-text-primary"
                  />
                </label>
              </div>
            </section>
          </div>
        </aside>

        <section>
          {warning && (
            <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {warning}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🚙</p>
              <p className="text-text-secondary">
                {cars.length === 0
                  ? `No rental cars available in ${cityName} for these dates.`
                  : "No cars match your filters."}
              </p>
              {cars.length > 0 && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((car) => (
                <RentalCarCard
                  key={car.id}
                  car={car}
                  nights={days}
                  onSelect={handleSelect}
                  isSelected={selectedTransfer?.id === car.id}
                />
              ))}
            </div>
          )}
        </section>
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
            <p className="text-text-secondary">Loading rental cars...</p>
          </div>
        </div>
      }
    >
      <CarsSearchContent />
    </Suspense>
  );
}
