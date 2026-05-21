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

export default function RoadTripHotelPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === 'ro';

  const tripId = (params?.id as string) || '';
  const hotelId = decodeURIComponent((params?.hotelId as string) || '');
  const stopoverIndex = search.get('stopover');

  const [data, setData] = useState<RoadTripData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!tripId) return;
    try {
      const raw = sessionStorage.getItem(`roadTrip_${tripId}`);
      if (!raw) {
        setError(isRo ? 'Datele traseului au expirat.' : 'Road trip data expired.');
        return;
      }
      setData(JSON.parse(raw) as RoadTripData);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [tripId, isRo]);

  const hotel = useMemo<TAHotel | null>(() => {
    if (!data) return null;
    if (stopoverIndex) {
      const order = parseInt(stopoverIndex, 10);
      const stop = data.stopovers.find((s) => s.order === order);
      return stop?.hotel ?? null;
    }
    if (data.hotelDestination?.id === hotelId) return data.hotelDestination;
    // Fall back: search stopovers + destination by id
    for (const s of data.stopovers) {
      if (s.hotel?.id === hotelId) return s.hotel;
    }
    return data.hotelDestination;
  }, [data, hotelId, stopoverIndex]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <p className="text-body text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/road-trip`)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          {isRo ? 'Înapoi la wizard' : 'Back to wizard'}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <p className="text-body text-text-secondary">
          {isRo ? 'Hotelul nu a fost găsit în datele călătoriei.' : 'Hotel not found in trip data.'}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/road-trip/result/${tripId}`)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          {isRo ? 'Înapoi la traseu' : 'Back to trip'}
        </button>
      </div>
    );
  }

  const photos = (hotel.cardPhotos ?? [])
    .map((p) =>
      p.sizes?.urlTemplate
        ?.replace('{width}', '1200')
        .replace('{height}', '675'),
    )
    .filter((u): u is string => Boolean(u));

  const rating = hotel.bubbleRating?.rating;
  const reviewCount = hotel.bubbleRating?.count;
  const tripadvisorSearchUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(hotel.title || '')}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
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
            {hotel.title}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          {photos.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-surface-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[photoIndex]}
                alt={hotel.title}
                className="aspect-video w-full object-cover"
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
                    {photoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-sky-900/20" />
          )}

          {/* Details */}
          <section className="rounded-radius-xl border border-border-default bg-surface p-6">
            <h2 className="text-h3 text-text-primary mb-3">{hotel.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-body-sm text-text-secondary mb-4">
              {typeof rating === 'number' && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="font-semibold text-text-primary">{rating.toFixed(1)}</span>
                  {reviewCount && <span className="text-text-muted">({reviewCount})</span>}
                </span>
              )}
              {hotel.primaryInfo && <span>{hotel.primaryInfo}</span>}
            </div>
            {hotel.secondaryInfo && (
              <p className="text-body text-text-secondary mb-3">
                <MapPin className="inline h-4 w-4 text-emerald-500 mr-1" />
                {hotel.secondaryInfo}
              </p>
            )}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div className="mt-4">
                <h3 className="text-body-sm font-semibold text-text-primary mb-2">
                  {isRo ? 'Facilități' : 'Amenities'}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {hotel.amenities.slice(0, 12).map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-border-default bg-surface-sunken px-2.5 py-0.5 text-xs text-text-secondary"
                    >
                      {a.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="rounded-radius-xl border border-border-default bg-surface p-5 sticky top-20">
            <h3 className="text-body font-semibold text-text-primary mb-3">
              {isRo ? 'Detalii cazare' : 'Booking details'}
            </h3>
            {hotel.priceForDisplay && (
              <p className="text-h3 text-emerald-600 dark:text-emerald-400 mb-2">
                {hotel.priceForDisplay}
              </p>
            )}
            {hotel.priceDetails && (
              <p className="text-xs text-text-muted mb-3">{hotel.priceDetails}</p>
            )}
            {hotel.strikethroughPrice && (
              <p className="text-xs text-text-muted line-through mb-3">{hotel.strikethroughPrice}</p>
            )}
            <a
              href={tripadvisorSearchUrl}
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
