'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Star,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import type { RoadTripData } from '@/lib/roadTrip';
import type { TAHotel } from '@/lib/tripadvisor-client';

const SECTIONS = [
  { id: 'images', label: 'Images', labelRo: 'Imagini' },
  { id: 'details', label: 'Details', labelRo: 'Detalii' },
  { id: 'location', label: 'Location', labelRo: 'Locație' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

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
  const [activeSection, setActiveSection] = useState<SectionId>('images');

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

  // Dates derived from the trip context when /hotels/search didn't forward
  // explicit URL params. Mirror the logic from the detail-fetch useEffect so
  // the YOUR-STAY sidebar can show the same dates the API used.
  const derivedDates = useMemo<{ checkIn: string; checkOut: string }>(() => {
    if (!trip) return { checkIn: '', checkOut: '' };
    if (stopoverIndex) {
      const order = parseInt(stopoverIndex, 10);
      const checkIn = new Date(
        new Date(trip.departureDate).getTime() + (order - 1) * 86_400_000,
      )
        .toISOString()
        .split('T')[0];
      const checkOut = new Date(new Date(checkIn).getTime() + 86_400_000)
        .toISOString()
        .split('T')[0];
      return { checkIn, checkOut };
    }
    const checkIn = new Date(
      new Date(trip.departureDate).getTime() + trip.stopovers.length * 86_400_000,
    )
      .toISOString()
      .split('T')[0];
    const checkOut = trip.returnDate || checkIn;
    return { checkIn, checkOut };
  }, [trip, stopoverIndex]);
  const qsCheckIn = derivedDates.checkIn;
  const qsCheckOut = derivedDates.checkOut;

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
  if (!minimalHotel && !urlName && !detail && !detailLoading) {
    return (
      <ErrorState
        message={isRo ? 'Hotelul nu a fost găsit.' : 'Hotel not found.'}
        ctaLabel={isRo ? 'Înapoi la traseu' : 'Back to trip'}
        onCta={() => router.push(`/${locale}/road-trip/result/${tripId}`)}
      />
    );
  }

  const displayName = (detail?.name || minimalHotel?.title || urlName || 'Hotel')
    .replace(/^\d+\.\s+/, '')
    .trim();
  const aboutText = detail?.about;
  const photos =
    detail && detail.photos.length > 0
      ? detail.photos
      : minimalHotel
        ? photosFromMinimalCard(minimalHotel)
        : [];
  const heroPhoto = photos[Math.min(photoIndex, Math.max(photos.length - 1, 0))];
  const amenities = detail?.amenities?.length ? detail.amenities : minimalHotel?.amenities ?? [];
  const rating = detail?.rating ?? minimalHotel?.bubbleRating?.rating;
  // Important: detail.numReviews can legitimately be 0 — coerce that to
  // undefined so the "0" never renders as a literal next to the rating.
  const numReviewsRaw = detail?.numReviews ?? Number(minimalHotel?.bubbleRating?.count || '0');
  const numReviews = numReviewsRaw > 0 ? numReviewsRaw : undefined;
  const stars = Math.round(detail?.stars ?? minimalHotel?.bubbleRating?.rating ?? 0);
  const address = detail?.address ?? minimalHotel?.secondaryInfo ?? '';

  // Stay context — prefer URL params, fall back to trip-derived dates.
  const stayCheckIn = urlCheckIn || qsCheckIn;
  const stayCheckOut = urlCheckOut || qsCheckOut;
  const nights = stayCheckIn && stayCheckOut
    ? Math.max(
        1,
        Math.round(
          (new Date(stayCheckOut).getTime() - new Date(stayCheckIn).getTime()) / 86_400_000,
        ),
      )
    : 1;
  const total = urlTotal ? Math.round(parseFloat(urlTotal)) : 0;
  const perNight = total > 0 && nights > 0 ? Math.round(total / nights) : 0;

  const directionsUrl = detail?.latitude && detail?.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${detail.latitude},${detail.longitude}`
    : address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${displayName}, ${address}`)}`
      : null;

  function scrollToSection(id: SectionId) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  }

  function handleSelectStay() {
    if (!trip) return;
    // Materialize a TAHotel-shaped record so RoadTripDetailView's inline cards
    // pick up the user's choice. Photos come from the detail fetch when
    // available; fall back to the minimal card the user clicked from.
    const photoTemplates: TAHotel['cardPhotos'] = photos.slice(0, 6).map((url) => ({
      sizes: { urlTemplate: url },
    }));
    const synthesized: TAHotel = {
      id: hotelId,
      title: displayName,
      primaryInfo: minimalHotel?.primaryInfo,
      secondaryInfo: address || minimalHotel?.secondaryInfo,
      bubbleRating: {
        count: numReviews ? String(numReviews) : minimalHotel?.bubbleRating?.count,
        rating: rating ?? minimalHotel?.bubbleRating?.rating,
      },
      priceForDisplay: total > 0 ? `€${total}` : minimalHotel?.priceForDisplay,
      strikethroughPrice: minimalHotel?.strikethroughPrice,
      priceDetails:
        perNight > 0 && nights > 0
          ? `€${perNight}/night × ${nights}`
          : minimalHotel?.priceDetails,
      cardPhotos: photoTemplates.length ? photoTemplates : minimalHotel?.cardPhotos,
      amenities: amenities.length ? amenities : minimalHotel?.amenities,
    };

    const updated: RoadTripData = { ...trip };
    if (stopoverIndex) {
      const order = parseInt(stopoverIndex, 10);
      updated.stopovers = updated.stopovers.map((s) =>
        s.order === order ? { ...s, hotel: synthesized } : s,
      );
    } else {
      updated.hotelDestination = synthesized;
    }
    try {
      sessionStorage.setItem(`roadTrip_${tripId}`, JSON.stringify(updated));
    } catch {
      /* sessionStorage quota — degrade gracefully, the user just won't see the pick persisted */
    }
    router.push(`/${locale}/road-trip/result/${tripId}`);
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-200 dark:border-border-default">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={isRo ? 'Înapoi' : 'Back'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="flex-1 text-base sm:text-lg font-bold text-text-primary truncate">
            {displayName}
          </h1>
        </div>
      </div>

      <nav className="sticky top-[57px] z-30 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-100 dark:border-border-default">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <ul className="flex gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className={`whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeSection === s.id
                      ? 'text-primary-500 border-primary-500'
                      : 'text-text-secondary border-transparent hover:text-text-primary'
                  }`}
                >
                  {isRo ? s.labelRo : s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6 lg:py-10">
        {detailLoading && (
          <div className="mb-4 inline-flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isRo ? 'Încărcăm detalii complete…' : 'Loading full details…'}
          </div>
        )}
        {detailWarning && !detail && (
          <div className="mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {detailWarning}
          </div>
        )}

        <section
          id="images"
          className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mb-8 scroll-mt-[120px]"
        >
          <div className="relative aspect-[16/10] lg:aspect-auto lg:h-[480px] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-surface-elevated">
            {heroPhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={heroPhoto}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-sky-900/20" />
            )}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
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
          {photos.length > 1 && (
            <div className="hidden lg:grid grid-cols-2 gap-3 h-[480px] auto-rows-fr">
              {photos.slice(0, 4).map((p, i) => (
                <button
                  key={p + i}
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className={`relative rounded-2xl overflow-hidden transition-all ${
                    photoIndex === i
                      ? 'ring-2 ring-primary-500'
                      : 'ring-1 ring-neutral-200 dark:ring-border-default opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p}
                    alt={`${displayName} photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-8">
            <section id="details" className="scroll-mt-[120px]">
              <div className="flex items-center gap-2 mb-2">
                {Array.from({ length: Math.max(stars, 0) }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
                {detail?.rankingString && (
                  <span className="text-xs text-text-muted ml-2 truncate">
                    {detail.rankingString}
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-2">
                {displayName}
              </h2>
              {address && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{address}</span>
                </div>
              )}
              {typeof rating === 'number' && rating > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-500/10 px-3 py-1.5">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    {rating.toFixed(1)}
                  </span>
                  {numReviews && (
                    <span className="text-xs text-text-secondary">
                      · {numReviews.toLocaleString()} {isRo ? 'recenzii' : 'reviews'}
                    </span>
                  )}
                </div>
              )}

              {aboutText && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-text-primary mb-3">
                    {isRo ? 'Descriere proprietate' : 'Property description'}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {aboutText}
                  </p>
                </div>
              )}

              {amenities.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-text-primary mb-3">
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
            </section>

            <section id="location" className="scroll-mt-[120px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-text-primary">
                  {isRo ? 'Locația proprietății' : 'Property location'}
                </h3>
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    {isRo ? 'Deschide în Google Maps' : 'Open in Google Maps'}
                  </a>
                )}
              </div>
              {address && (
                <p className="text-sm text-text-secondary mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
                  {address}
                </p>
              )}
              {tripId && (
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/road-trip/result/${tripId}/map`)}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-border-default bg-neutral-50 dark:bg-surface-elevated px-4 py-6 text-sm font-semibold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors flex items-center justify-center gap-2"
                >
                  {isRo ? 'Vezi pe harta traseului →' : 'View on trip map →'}
                </button>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-[110px] lg:self-start">
            <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-5 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                {isRo ? 'Cazarea ta' : 'Your stay'}
              </p>
              <div className="mt-3 mb-4 space-y-1">
                {stayCheckIn && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{isRo ? 'Check-in' : 'Check-in'}</span>
                    <span className="font-semibold text-text-primary">{stayCheckIn}</span>
                  </div>
                )}
                {stayCheckOut && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{isRo ? 'Check-out' : 'Check-out'}</span>
                    <span className="font-semibold text-text-primary">{stayCheckOut}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{isRo ? 'Nopți' : 'Nights'}</span>
                  <span className="font-semibold text-text-primary">{nights}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-border-default">
                {perNight > 0 ? (
                  <>
                    <p className="text-xs text-text-muted">
                      {isRo ? 'pe noapte de la' : 'per night from'}
                    </p>
                    <p className="text-3xl font-extrabold text-primary-500">
                      €{perNight}
                    </p>
                    <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-neutral-100 dark:border-border-default">
                      <span className="text-text-secondary">
                        {isRo
                          ? `Total ${nights} ${nights === 1 ? 'noapte' : 'nopți'}`
                          : `Total for ${nights} ${nights === 1 ? 'night' : 'nights'}`}
                      </span>
                      <span className="font-bold text-text-primary">€{total}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">
                    {isRo
                      ? 'Vezi prețul live în lista de hoteluri.'
                      : 'See live pricing in the hotel list.'}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSelectStay}
                className="mt-5 w-full rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
              >
                {isRo ? 'Alege această cazare' : 'Select Stay'}
              </button>
              <p className="mt-2 text-[11px] text-text-muted text-center">
                {isRo ? 'Nu vei fi taxat acum' : "You won't be charged yet"}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function photosFromMinimalCard(hotel: TAHotel): string[] {
  if (!hotel.cardPhotos?.length) return [];
  return hotel.cardPhotos
    .map((p) => {
      const t = p.sizes?.urlTemplate;
      if (!t) return undefined;
      return t.replace('{width}', '1200').replace('{height}', '675');
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
