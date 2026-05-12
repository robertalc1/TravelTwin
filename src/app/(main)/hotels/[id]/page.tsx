"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, MapPin, Heart, Share2, ChevronLeft, ChevronRight, Quote, Navigation,
} from "lucide-react";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useToastStore } from "@/stores/toastStore";
import { useTripPricing } from "@/stores/tripPricingStore";
import { getHotelImage } from "@/lib/hotelImages";
import type { HotelOfferData } from "@/components/Hotels/HotelCard";

interface TAReview {
  id?: string;
  title?: string;
  text?: string;
  rating?: number;
  publishedDate?: string;
  authorName?: string;
}

interface TAHotelDetail {
  id: string;
  name: string;
  about?: string;
  photos: string[];
  reviews: TAReview[];
  amenities: string[];
  rating?: number;
  numReviews?: number;
  stars?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  priceRange?: string;
  rankingString?: string;
}

function prettifyAmenity(a: string): string {
  return a
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HotelDetailPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = (params?.id as string) || "";
  const checkIn = search.get("checkIn") || "";
  const checkOut = search.get("checkOut") || "";
  const cityCode = (search.get("cityCode") || "").toUpperCase();
  const totalQs = search.get("total") || "";
  const nameQs = search.get("name") || "";
  const tripId = search.get("tripId") || "";

  const [hotel, setHotel] = useState<TAHotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const formatCurrency = useCurrencyStore((s) => s.format);
  const showToast = useToastStore((s) => s.show);
  const selectHotelInStore = useTripPricing((s) => s.selectHotel);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const qs = new URLSearchParams();
    if (checkIn) qs.set("checkIn", checkIn);
    if (checkOut) qs.set("checkOut", checkOut);

    // Stale-while-revalidate: keep current hotel visible during refetches on
    // search-param changes. Initial mount already starts with loading=true.
    fetch(`/api/hotels/${encodeURIComponent(id)}?${qs.toString()}`)
      .then((r) => r.json())
      .then((data: { hotel: TAHotelDetail | null; warning?: string }) => {
        if (cancelled) return;
        setHotel(data.hotel);
        setWarning(data.warning || null);
      })
      .catch(() => {
        if (!cancelled) setWarning("Could not load hotel details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, checkIn, checkOut]);

  const nights = Math.max(
    1,
    checkIn && checkOut
      ? Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 1,
  );

  const total = Number(totalQs) > 0 ? Number(totalQs) : 0;
  const perNight = total > 0 ? total / nights : 0;
  const displayName = hotel?.name || nameQs || "Hotel";
  const stars = Math.max(1, Math.min(5, hotel?.stars || Math.round(hotel?.rating || 3) || 3));
  const fallbackImg = getHotelImage(displayName, cityCode, stars);
  const photos = hotel?.photos?.length ? hotel.photos : [fallbackImg];
  const heroPhoto = photos[photoIndex] || photos[0];

  function handleSelectStay() {
    const offer: HotelOfferData = {
      hotel: {
        hotelId: id,
        name: displayName,
        rating: String(stars),
        cityCode,
        address: {
          lines: hotel?.address ? [hotel.address] : undefined,
          cityName: cityCode,
        },
        amenities: hotel?.amenities,
        media:
          hotel?.photos && hotel.photos.length > 0
            ? hotel.photos.slice(0, 4).map((uri) => ({ uri }))
            : undefined,
      },
      offers: [
        {
          id: `live-${id}`,
          price: {
            currency: "EUR",
            total: String(total),
            base: String(Math.round(total * 0.85 * 100) / 100),
          },
          checkInDate: checkIn,
          checkOutDate: checkOut,
          policies: {
            cancellations: [{ amount: "0", deadline: checkIn }],
          },
        },
      ],
    };
    selectHotelInStore(offer, total);
    showToast(
      total > 0
        ? `Hotel added · ${formatCurrency(total, "EUR")}`
        : "Hotel added to your trip",
      "success",
    );
    if (tripId) {
      router.push(`/plan/trip/${tripId}`);
    } else {
      router.back();
    }
  }

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapEmbedUrl = (() => {
    if (!mapsApiKey) return null;
    if (hotel?.latitude && hotel?.longitude) {
      return `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${hotel.latitude},${hotel.longitude}&zoom=15`;
    }
    if (hotel?.address) {
      return `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(
        `${displayName}, ${hotel.address}`,
      )}&zoom=15`;
    }
    return null;
  })();
  const directionsUrl =
    hotel?.latitude && hotel?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}`
      : hotel?.address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
            `${displayName}, ${hotel.address}`,
          )}`
        : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🏨</div>
          <p className="text-text-secondary">Loading hotel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      {/* Header bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-200 dark:border-border-default">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="flex-1 text-base sm:text-lg font-bold text-text-primary truncate">
            {displayName}
          </h1>
          <button
            type="button"
            aria-label="Share"
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-border-default text-text-secondary hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Save"
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-border-default text-text-secondary hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6 lg:py-10">
        {warning && (
          <div className="mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </div>
        )}

        {/* Gallery */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mb-8"
        >
          <div className="relative aspect-[16/10] lg:aspect-auto lg:h-[480px] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-surface-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImg;
              }}
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() =>
                    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-surface/90 backdrop-blur-md shadow-md text-text-primary hover:scale-105 transition-transform"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-surface/90 backdrop-blur-md shadow-md text-text-primary hover:scale-105 transition-transform"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-semibold rounded-full px-3 py-1">
                  {photoIndex + 1} / {photos.length}
                </span>
              </>
            )}
          </div>
          {/* Thumbnail strip */}
          <div className="hidden lg:grid grid-cols-2 gap-3 h-[480px] auto-rows-fr">
            {photos.slice(0, 4).map((p, i) => (
              <button
                key={p + i}
                type="button"
                onClick={() => setPhotoIndex(i)}
                className={`relative rounded-2xl overflow-hidden transition-all ${
                  photoIndex === i
                    ? "ring-2 ring-primary-500"
                    : "ring-1 ring-neutral-200 dark:ring-border-default opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p}
                  alt={`${displayName} photo ${i + 2}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackImg;
                  }}
                />
              </button>
            ))}
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Main column */}
          <div className="space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-yellow-400 fill-yellow-400"
                  />
                ))}
                {hotel?.rankingString && (
                  <span className="text-xs text-text-muted ml-2 truncate">
                    {hotel.rankingString}
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-2">
                {displayName}
              </h2>
              {(hotel?.address || cityCode) && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{hotel?.address || cityCode}</span>
                </div>
              )}
              {hotel?.rating != null && hotel.rating > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-500/10 px-3 py-1.5">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    {hotel.rating.toFixed(1)}
                  </span>
                  {hotel.numReviews ? (
                    <span className="text-xs text-text-secondary">
                      · {hotel.numReviews} reviews
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* About */}
            {hotel?.about && (
              <section>
                <h3 className="text-lg font-bold text-text-primary mb-3">
                  About this hotel
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {hotel.about}
                </p>
              </section>
            )}

            {/* Amenities */}
            {hotel?.amenities && hotel.amenities.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-text-primary mb-3">
                  Amenities
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {hotel.amenities.map((a) => (
                    <div
                      key={a}
                      className="rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 py-2 text-sm text-text-secondary"
                    >
                      {prettifyAmenity(a)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {hotel?.reviews && hotel.reviews.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-text-primary mb-3">
                  Recent reviews
                </h3>
                <div className="space-y-3">
                  {hotel.reviews.slice(0, 4).map((r, i) => (
                    <article
                      key={r.id || i}
                      className="rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-4"
                    >
                      <header className="flex items-start gap-2 mb-2">
                        <Quote className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-text-primary text-sm truncate">
                            {r.title || "Guest review"}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {r.authorName || "Anonymous"}
                            {r.publishedDate ? ` · ${r.publishedDate.split("T")[0]}` : ""}
                          </p>
                        </div>
                        {r.rating ? (
                          <span className="text-xs font-bold text-primary-500 ml-auto">
                            {r.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </header>
                      {r.text && (
                        <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
                          {r.text}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Location */}
            {(mapEmbedUrl || hotel?.address) && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-text-primary">
                    Location
                  </h3>
                  {directionsUrl && (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Open in Google Maps
                    </a>
                  )}
                </div>
                {hotel?.address && (
                  <p className="text-sm text-text-secondary mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
                    {hotel.address}
                  </p>
                )}
                {mapEmbedUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default aspect-[16/9] bg-neutral-100 dark:bg-surface-elevated">
                    <iframe
                      title={`Map of ${displayName}`}
                      src={mapEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-border-default px-4 py-6 text-center text-sm text-text-muted">
                    Map preview requires a Google Maps API key.
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-5 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                Your stay
              </p>
              <div className="mt-3 mb-4 space-y-1">
                {checkIn && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Check-in</span>
                    <span className="font-semibold text-text-primary">
                      {checkIn}
                    </span>
                  </div>
                )}
                {checkOut && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Check-out</span>
                    <span className="font-semibold text-text-primary">
                      {checkOut}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Nights</span>
                  <span className="font-semibold text-text-primary">{nights}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-border-default">
                {perNight > 0 ? (
                  <>
                    <p className="text-xs text-text-muted">per night from</p>
                    <p className="text-3xl font-extrabold text-primary-500">
                      {formatCurrency(perNight, "EUR")}
                    </p>
                    <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-neutral-100 dark:border-border-default">
                      <span className="text-text-secondary">
                        Total for {nights} {nights === 1 ? "night" : "nights"}
                      </span>
                      <span className="font-bold text-text-primary">
                        {formatCurrency(total, "EUR")}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Pricing fetched separately — go back to the hotel list to
                    see live offers.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSelectStay}
                className="mt-5 w-full rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
              >
                {tripId ? "Select Stay" : "Add to Trip"}
              </button>
              {tripId && (
                <p className="mt-2 text-[11px] text-text-muted text-center">
                  You won&apos;t be charged yet
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
