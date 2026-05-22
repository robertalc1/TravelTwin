'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Star,
  MapPin,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import type { RoadTripData } from '@/lib/roadTrip';
import type { TAHotel } from '@/lib/tripadvisor-client';

interface HotelDetail {
  id: string;
  name: string;
  about?: string;
  photos: string[];
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

export default function RoadTripHotelPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === 'ro';

  const tripId = (params?.id as string) || '';
  const hotelId = decodeURIComponent((params?.hotelId as string) || '');
  const stopoverIndex = search.get('stopover');
  // Fallback context when the hotel was picked from /hotels/search grid (not
  // already pre-stored in the trip). /hotels/search forwards these params.
  const urlName = search.get('name') || '';
  const urlCheckIn = search.get('checkIn') || '';
  const urlCheckOut = search.get('checkOut') || '';
  const urlTotal = search.get('total') || '';
  const urlCityQuery = search.get('cityQuery') || search.get('cityCode') || '';

  const [trip, setTrip] = useState<RoadTripData | null>(null);
  const [tripError, setTripError] = useState<string | null>(null);
  const [detail, setDetail] = useState<HotelDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailWarning, setDetailWarning] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // 1. Hydrate the trip from sessionStorage
  useEffect(() => {
    if (!tripId) return;
    try {
      const raw = sessionStorage.getItem(`roadTrip_${tripId}`);
      if (!raw) {
        setTripError(isRo ? 'Datele traseului au expirat.' : 'Road trip data expired.');
        return;
      }
      setTrip(JSON.parse(raw) as RoadTripData);
    } catch (e) {
      setTripError((e as Error).message);
    }
  }, [tripId, isRo]);

  // Minimal hotel card from the trip (fallback if API fails)
  const minimalHotel = useMemo<TAHotel | null>(() => {
    if (!trip) return null;
    if (stopoverIndex) {
      const order = parseInt(stopoverIndex, 10);
      const stop = trip.stopovers.find((s) => s.order === order);
      return stop?.hotel ?? null;
    }
    if (trip.hotelDestination?.id === hotelId) return trip.hotelDestination;
    for (const s of trip.stopovers) {
      if (s.hotel?.id === hotelId) return s.hotel;
    }
    return trip.hotelDestination;
  }, [trip, hotelId, stopoverIndex]);

  // 2. Fetch full details from Tripadvisor via /api/hotels/[id]
  useEffect(() => {
    if (!hotelId || !trip) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailWarning(null);

    const qs = new URLSearchParams();
    // Prefer URL params (forwarded by /hotels/search when picked from grid),
    // fall back to deriving dates from the trip context.
    if (urlCheckIn && urlCheckOut) {
      qs.set('checkIn', urlCheckIn);
      qs.set('checkOut', urlCheckOut);
    } else if (stopoverIndex) {
      const order = parseInt(stopoverIndex, 10);
      const stop = trip.stopovers.find((s) => s.order === order);
      if (stop) {
        const checkIn = new Date(
          new Date(trip.departureDate).getTime() + (order - 1) * 86400000,
        )
          .toISOString()
          .split('T')[0];
        const checkOut = new Date(new Date(checkIn).getTime() + 86400000)
          .toISOString()
          .split('T')[0];
        qs.set('checkIn', checkIn);
        qs.set('checkOut', checkOut);
      }
    } else {
      const checkIn = new Date(
        new Date(trip.departureDate).getTime() + trip.stopovers.length * 86400000,
      )
        .toISOString()
        .split('T')[0];
      const checkOut = trip.returnDate || checkIn;
      qs.set('checkIn', checkIn);
      qs.set('checkOut', checkOut);
    }

    fetch(`/api/hotels/${encodeURIComponent(hotelId)}?${qs.toString()}`)
      .then(async (r) => {
        const body = await r.json();
        if (cancelled) return;
        if (body.hotel) {
          setDetail(body.hotel as HotelDetail);
        }
        if (body.warning) setDetailWarning(body.warning);
      })
      .catch((e) => {
        if (!cancelled) setDetailWarning((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotelId, trip, stopoverIndex]);

  if (tripError) {
    return (
      <ErrorState
        message={tripError}
        ctaLabel={isRo ? 'Înapoi la wizard' : 'Back to wizard'}
        onCta={() => router.push(`/${locale}/road-trip`)}
      />
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // No error when minimalHotel is null — that just means the user picked a
  // hotel from /hotels/search grid that isn't pre-stored in the trip yet.
  // We fall back to URL params + the live detail fetch.
  if (!minimalHotel && !urlName && !detail && !detailLoading) {
    return (
      <ErrorState
        message={
          isRo ? 'Hotelul nu a fost găsit.' : 'Hotel not found.'
        }
        ctaLabel={isRo ? 'Înapoi la traseu' : 'Back to trip'}
        onCta={() => router.push(`/${locale}/road-trip/result/${tripId}`)}
      />
    );
  }

  // Merge: live detail overrides minimal card / URL params; minimal still
  // provides priceForDisplay when present.
  const name = (detail?.name || minimalHotel?.title || urlName || 'Hotel')
    .replace(/^\d+\.\s+/, '')
    .trim();
  const aboutText = detail?.about;
  const photos =
    detail && detail.photos.length > 0
      ? detail.photos
      : minimalHotel
        ? photosFromMinimalCard(minimalHotel)
        : [];
  const amenities = detail?.amenities?.length
    ? detail.amenities
    : minimalHotel?.amenities ?? [];
  const rating = detail?.rating ?? minimalHotel?.bubbleRating?.rating;
  const numReviews =
    detail?.numReviews ??
    (Number(minimalHotel?.bubbleRating?.count || '0') || undefined);
  const stars = detail?.stars ?? minimalHotel?.bubbleRating?.rating;
  const address = detail?.address ?? minimalHotel?.secondaryInfo;
  const priceForDisplay =
    minimalHotel?.priceForDisplay ||
    (urlTotal ? `€${Math.round(parseFloat(urlTotal))}` : undefined);
  const tripadvisorUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(name)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border-default bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 lg:px-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/road-trip/result/${tripId}`)}
            aria-label="Back to trip"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="flex-1 text-base sm:text-lg font-bold text-text-primary truncate">
            {name}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {detailLoading && (
            <div className="flex items-center gap-2 text-body-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRo ? 'Încărcăm detalii complete de la Tripadvisor…' : 'Loading full Tripadvisor details…'}
            </div>
          )}
          {detailWarning && !detail && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 p-3 text-body-sm text-amber-700 dark:text-amber-300">
              {detailWarning}
            </div>
          )}

          {/* Gallery */}
          {photos.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-surface-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[Math.min(photoIndex, photos.length - 1)]}
                alt={name}
                className="aspect-video w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/55 backdrop-blur-sm px-2.5 py-1 text-xs text-white">
                    {Math.min(photoIndex, photos.length - 1) + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          ) : !detailLoading ? (
            <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-sky-900/20" />
          ) : null}

          {/* Details */}
          <section className="rounded-radius-xl border border-border-default bg-surface p-6">
            <h2 className="text-h3 text-text-primary mb-3">{name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-body-sm text-text-secondary mb-4">
              {typeof rating === 'number' && rating > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="font-semibold text-text-primary">{rating.toFixed(1)}</span>
                  {numReviews && (
                    <span className="text-text-muted">({numReviews.toLocaleString()})</span>
                  )}
                </span>
              )}
              {typeof stars === 'number' && stars > 0 && stars <= 5 && (
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: Math.round(stars) }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  ))}
                </span>
              )}
              {detail?.rankingString && (
                <span className="text-xs text-text-muted">{detail.rankingString}</span>
              )}
            </div>

            {address && (
              <p className="text-body text-text-secondary mb-3">
                <MapPin className="inline h-4 w-4 text-emerald-500 mr-1" />
                {address}
              </p>
            )}

            {aboutText && (
              <div className="mt-3">
                <p className="text-body-sm text-text-secondary whitespace-pre-line">
                  {aboutText}
                </p>
              </div>
            )}

            {amenities.length > 0 && (
              <div className="mt-5">
                <h3 className="text-body-sm font-semibold text-text-primary mb-2">
                  {isRo ? 'Facilități' : 'Amenities'}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.slice(0, 16).map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-border-default bg-surface-sunken px-2.5 py-0.5 text-xs text-text-secondary capitalize"
                    >
                      {a.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail?.latitude && detail?.longitude && (
              <div className="mt-5">
                <h3 className="text-body-sm font-semibold text-text-primary mb-2">
                  {isRo ? 'Locație' : 'Location'}
                </h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${detail.latitude},${detail.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-body-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {isRo ? 'Vezi pe Google Maps' : 'View on Google Maps'}
                </a>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-radius-xl border border-border-default bg-surface p-5 sticky top-20">
            <h3 className="text-body font-semibold text-text-primary mb-3">
              {isRo ? 'Detalii cazare' : 'Booking details'}
            </h3>
            {priceForDisplay && (
              <p className="text-h3 text-emerald-600 dark:text-emerald-400 mb-2">
                {priceForDisplay}
              </p>
            )}
            {minimalHotel?.priceDetails && (
              <p className="text-xs text-text-muted mb-3">{minimalHotel?.priceDetails}</p>
            )}
            {detail?.priceRange && !priceForDisplay && (
              <p className="text-body text-text-primary mb-3">{detail.priceRange}</p>
            )}
            {minimalHotel?.strikethroughPrice && (
              <p className="text-xs text-text-muted line-through mb-3">
                {minimalHotel?.strikethroughPrice}
              </p>
            )}
            <a
              href={tripadvisorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <ExternalLink className="h-4 w-4" />
              {isRo ? 'Vezi pe Tripadvisor' : 'View on Tripadvisor'}
            </a>
            <p className="mt-3 text-xs text-text-muted">
              {isRo
                ? 'Suntem afișați. Pentru rezervare deschide Tripadvisor.'
                : 'We display, you book. Open Tripadvisor to reserve.'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function photosFromMinimalCard(hotel: TAHotel): string[] {
  if (!hotel.cardPhotos?.length) return [];
  return hotel.cardPhotos
    .map((p) => {
      const t = p.sizes?.urlTemplate;
      if (!t) return undefined;
      // Tripadvisor templates either use {width}/{height} placeholders
      // or a fixed URL — guard both.
      const replaced = t.replace('{width}', '1200').replace('{height}', '675');
      return replaced;
    })
    .filter((u): u is string => Boolean(u));
}

function ErrorState({
  message,
  ctaLabel,
  onCta,
}: {
  message: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
      <p className="text-body text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
