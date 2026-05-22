'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Car,
  Bus,
  TrainFront,
  Ship,
  MapPin,
  Clock,
  Route as RouteIcon,
  CircleDollarSign,
  ExternalLink,
  Hotel as HotelIcon,
  Star,
  Camera,
  Utensils,
  Coffee,
  Lightbulb,
  Sun,
  Moon,
  ChevronRight,
  EyeOff,
  RotateCcw,
  Share2,
  Heart,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { resolveRoadTripHero, formatHours, formatDate, hotelPhotoUrl } from '@/lib/roadTrip';
import type { RoadTripData } from '@/lib/roadTrip';
import HeroWeatherStrip from '@/components/Weather/HeroWeatherStrip';
import HeroVideo from '@/components/HeroVideo';
import ShareModal from '@/components/ShareModal';
import AttractionPhotos from '@/components/AttractionPhotos';
import { useCurrency } from '@/hooks/useCurrency';
import { decodeWeatherCode } from '@/lib/weatherService';
import { useUser } from '@/hooks/useUser';
import { useAuthModalStore } from '@/stores/authModalStore';
import { useToastStore } from '@/stores/toastStore';

const WEATHER_ICONS: Record<string, LucideIcon> = {
  Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Snowflake,
};

interface LiveAttraction {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  thumbnail?: string;
  description?: string;
}

interface LiveRestaurant {
  id: string;
  name: string;
  cuisine?: string;
  priceRange?: string;
  thumbnail?: string;
  description?: string;
}

function buildHotelSearchHref(opts: {
  locale: string;
  tripId: string;
  cityQuery: string;
  cityName?: string;
  iata?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  stopoverOrder?: number;
}): string {
  const displayName = opts.cityName || opts.cityQuery.split(',')[0].trim();
  const qs = new URLSearchParams({
    cityName: displayName,
    checkIn: opts.checkIn,
    checkOut: opts.checkOut,
    adults: String(opts.adults),
    tripId: opts.tripId,
    tripType: 'road-trip',
  });
  if (opts.iata) {
    // Identical URL shape to the flight side, which is proven to populate the
    // 30-card grid. Tripadvisor's hotels searchLocation is reliable for IATA
    // queries even when it returns nothing for the same city's free text.
    qs.set('cityCode', opts.iata);
  } else {
    qs.set('cityQuery', opts.cityQuery);
  }
  if (opts.stopoverOrder !== undefined) {
    qs.set('stopover', String(opts.stopoverOrder));
  }
  return `/${opts.locale}/hotels/search?${qs.toString()}`;
}

function addDays(date: string, n: number): string {
  return new Date(new Date(date).getTime() + n * 86_400_000).toISOString().split('T')[0];
}

const RoadTripRouteTeaser = dynamic(
  () => import('@/components/RoadTripMap/RoadTripRouteTeaser'),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 lg:h-[360px] rounded-2xl bg-neutral-100 dark:bg-surface-elevated animate-pulse" />
    ),
  },
);

interface Props {
  trip: RoadTripData;
}

export default function RoadTripDetailView({ trip }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === 'ro';
  // All cost numbers from the API are in EUR. The user's chosen display
  // currency (header selector → persisted store) is applied at render via
  // `money()`, which both converts and locale-formats. Hotel prices come
  // pre-formatted from Tripadvisor and stay as-is.
  const { format } = useCurrency();
  // Defensive money formatter — coerce undefined/NaN to 0 so a stale
  // sessionStorage trip (missing fields added in a later deploy, e.g.
  // `trainFarePerPerson`) renders as `€0` instead of `NaN` or crashing.
  const money = (eur: number | undefined | null) => {
    const n = typeof eur === 'number' && Number.isFinite(eur) ? eur : 0;
    return format(n, 'EUR');
  };
  const trainFarePerPerson = trip.cost.trainFarePerPerson ?? 0;

  const heroUrl = resolveRoadTripHero(trip);
  const originCity = trip.origin.formatted.split(',')[0]?.trim() || trip.origin.formatted;
  const Icon = trip.mode === 'car' ? Car : trip.mode === 'train' ? TrainFront : Bus;

  // Per-trip persisted set of stopover orders the user has opted out of.
  // Skipping is client-only — the route stays the same length, only the
  // overnight stop is dropped (no hotel, no per-stop weather/restaurants
  // displayed). Saved in sessionStorage so a refresh keeps the user's edits.
  // Share button — modal with social links + copy-to-clipboard. Same UX as
  // the flight detail page (`TripDetailView`) so road-trip feels consistent.
  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  // Favorite (save trip) — persists to /api/favorites with item_type='trip'
  // and stashes the full RoadTripData in item_data so the favorites page can
  // re-hydrate sessionStorage and bring the user straight back here.
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const { user } = useUser();
  const openAuthModal = useAuthModalStore((s) => s.open);
  const showFavToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;
    fetch('/api/favorites')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { favorites?: Array<{ item_type: string; item_id: string }> } | null) => {
        if (cancelled || !data?.favorites) return;
        const hit = data.favorites.some(
          (f) => f.item_type === 'trip' && f.item_id === trip.id,
        );
        if (hit) setIsFavorited(true);
      })
      .catch(() => { /* unauth or offline — silent */ });
    return () => { cancelled = true; };
  }, [trip?.id]);

  async function toggleFavorite() {
    if (favoritePending || !trip?.id) return;
    if (!user) { openAuthModal('login'); return; }
    setFavoritePending(true);
    try {
      if (isFavorited) {
        const qs = new URLSearchParams({ item_type: 'trip', item_id: trip.id });
        const res = await fetch(`/api/favorites?${qs.toString()}`, { method: 'DELETE' });
        if (res.ok) {
          setIsFavorited(false);
          showFavToast(isRo ? 'Eliminat din favorite' : 'Removed from favorites', 'info');
        } else {
          showFavToast(isRo ? 'Nu am putut elimina' : 'Could not remove favorite', 'error');
        }
      } else {
        // Slim copy: drop aiContent (regenerable, fat) and strip any
        // non-serializable fields so Supabase JSONB insert never silently
        // fails on undefined / store-bound values.
        const tripForStorage = JSON.parse(
          JSON.stringify({ ...trip, aiContent: null }),
        ) as RoadTripData;
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_type: 'trip',
            item_id: trip.id,
            item_name: `${originCity} → ${trip.destinationCity}`,
            item_data: {
              trip_type: 'road-trip',
              destinationCity: trip.destinationCity,
              destinationCountry: trip.destinationCountry,
              originCity,
              departureDate: trip.departureDate,
              returnDate: trip.returnDate,
              mode: trip.mode,
              totalCost: trip.cost.total,
              currency: trip.cost.currency,
              fullData: tripForStorage,
            },
          }),
        });
        if (res.ok) {
          setIsFavorited(true);
          showFavToast(isRo ? 'Salvat în favorite' : 'Saved to favorites', 'success');
        } else {
          const errBody = await res.json().catch(() => null);
          console.error('favorite save failed', res.status, errBody);
          showFavToast(
            res.status === 401
              ? (isRo ? 'Autentifică-te ca să salvezi' : 'Sign in to save favorites')
              : (isRo ? 'Nu am putut salva' : 'Could not save favorite'),
            'error',
          );
        }
      }
    } catch {
      showFavToast(isRo ? 'Eroare de rețea' : 'Network error — try again', 'error');
    }
    finally { setFavoritePending(false); }
  }

  const excludedStorageKey = `roadTrip_${trip.id}_excludedStops`;
  const [excludedStops, setExcludedStops] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(excludedStorageKey);
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        if (Array.isArray(arr)) setExcludedStops(new Set(arr));
      }
    } catch { /* ignore corrupt storage */ }
  }, [excludedStorageKey]);
  const persistExcluded = useCallback(
    (next: Set<number>) => {
      setExcludedStops(next);
      try {
        sessionStorage.setItem(excludedStorageKey, JSON.stringify([...next]));
      } catch { /* quota — non-fatal */ }
    },
    [excludedStorageKey],
  );
  const toggleStop = useCallback(
    (order: number) => {
      const next = new Set(excludedStops);
      if (next.has(order)) next.delete(order);
      else next.add(order);
      persistExcluded(next);
    },
    [excludedStops, persistExcluded],
  );
  const resetStops = useCallback(() => persistExcluded(new Set()), [persistExcluded]);

  // Pull a numeric value out of Tripadvisor's `priceForDisplay` ("$120" /
  // "€95"). Used to compute "you save" when the user skips a stopover —
  // not for charging; if the string can't be parsed we fall back to €60
  // (mid-range European nightly rate) so we still show *something* useful.
  const estimateHotelEUR = (priceForDisplay?: string): number => {
    if (!priceForDisplay) return 60;
    const m = priceForDisplay.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    return m ? Math.round(Number(m[1])) : 60;
  };
  const savings = useMemo(() => {
    return trip.stopovers
      .filter((s) => excludedStops.has(s.order))
      .reduce((sum, s) => sum + estimateHotelEUR(s.hotel?.priceForDisplay), 0);
  }, [trip.stopovers, excludedStops]);
  const modeLabel =
    trip.mode === 'car'
      ? (isRo ? 'Cu mașina' : 'By car')
      : trip.mode === 'train'
        ? (isRo ? 'Cu trenul' : 'By train')
        : (isRo ? 'Cu autobuzul' : 'By bus');

  // ── Live data from Tripadvisor: attractions + restaurants per destination
  // (cafes stay AI/CITY_DATA — Tripadvisor has no dedicated cafe endpoint).
  // Falls back to aiContent (CITY_DATA fallback) when live calls return empty.
  const [liveAttractions, setLiveAttractions] = useState<LiveAttraction[]>([]);
  const [liveRestaurants, setLiveRestaurants] = useState<LiveRestaurant[]>([]);
  useEffect(() => {
    if (!trip.destinationCity) return;
    let cancelled = false;
    const qs = new URLSearchParams({ city: trip.destinationCity });
    if (trip.destinationCountry) qs.set('country', trip.destinationCountry);
    Promise.all([
      fetch(`/api/attractions/search?${qs.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/restaurants/search?${qs.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([attrData, restData]) => {
      if (cancelled) return;
      if (attrData?.attractions?.length) setLiveAttractions(attrData.attractions);
      if (restData?.restaurants?.length) setLiveRestaurants(restData.restaurants);
    });
    return () => {
      cancelled = true;
    };
  }, [trip.destinationCity, trip.destinationCountry]);

  // Dates for hotel search deep-links
  const destinationCheckIn = addDays(trip.departureDate, trip.stopovers.length);
  const destinationCheckOut =
    trip.returnDate || addDays(destinationCheckIn, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header bar with back ── */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 pt-4 sm:pt-6 pb-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/road-trip`)}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="flex-1 text-lg sm:text-xl font-bold text-text-primary truncate">
            {originCity} → {trip.destinationCity}
          </h1>
          <button
            type="button"
            onClick={() => setShowShare(true)}
            aria-label="Share trip"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors shrink-0"
          >
            <Share2 className="h-4 w-4 text-text-primary" />
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favoritePending}
            aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
            aria-pressed={isFavorited}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${
              isFavorited
                ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                : 'bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken text-text-primary'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {showShare && (
        <ShareModal
          title={`${originCity} → ${trip.destinationCity}`}
          onClose={() => { setShowShare(false); setShareCopied(false); }}
          copied={shareCopied}
          onCopy={() => {
            navigator.clipboard.writeText(window.location.href).then(() => {
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            }).catch(() => {});
          }}
        />
      )}

      {/* ── Hero ── */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
        <div className="relative h-56 sm:h-72 md:h-[420px] rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900 shadow-lg">
          <HeroVideo
            city={trip.destinationCity}
            country={trip.destinationCountry}
            fallbackImageUrl={heroUrl}
            alt={trip.destinationCity}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white shadow-md">
              <Icon className="h-3.5 w-3.5" />
              {modeLabel}
            </div>
            {trip.ferry && (
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white shadow-md">
                <Ship className="h-3.5 w-3.5" />
                {isRo ? 'Include feribot' : 'Includes ferry'}
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 text-white">
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-black/55 backdrop-blur-sm px-3 py-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5" />
              {trip.destinationCity}
              {trip.destinationCountry && (
                <span className="text-white/70">, {trip.destinationCountry}</span>
              )}
            </div>
            <p className="mt-2 text-sm sm:text-base">
              {formatDate(trip.departureDate, locale)}
              {trip.returnDate ? ` — ${formatDate(trip.returnDate, locale)}` : ''} ·{' '}
              {trip.adults} {isRo ? 'călători' : 'travelers'}
            </p>
          </div>

          {/* Weather strip overlay (desktop only) — matches the flight detail page. */}
          {trip.departureDate && trip.destination.lat && trip.destination.lng && (
            <div className="hidden sm:block absolute bottom-4 right-4 max-w-[min(60%,560px)]">
              <HeroWeatherStrip
                lat={trip.destination.lat}
                lon={trip.destination.lng}
                startDate={trip.departureDate}
                endDate={trip.returnDate || trip.departureDate}
                cityName={trip.destinationCity}
                variant="overlay"
              />
            </div>
          )}
        </div>

        {/* Mobile inline weather strip — sits under the hero so the photo stays clean. */}
        {trip.departureDate && trip.destination.lat && trip.destination.lng && (
          <div className="sm:hidden mt-3">
            <HeroWeatherStrip
              lat={trip.destination.lat}
              lon={trip.destination.lng}
              startDate={trip.departureDate}
              endDate={trip.returnDate || trip.departureDate}
              cityName={trip.destinationCity}
              variant="inline"
            />
          </div>
        )}
      </div>

      {/* ── Stats strip ── */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 mt-6">
        <div className={`grid gap-3 sm:gap-4 ${trip.ferry ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
          <StatCard
            icon={<RouteIcon className="h-4 w-4" />}
            label={isRo ? 'Distanță' : 'Distance'}
            value={`${trip.drive.distanceKm} km`}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label={isRo ? 'Durată' : 'Duration'}
            value={formatHours(trip.drive.durationHours)}
          />
          {trip.ferry && (
            <StatCard
              icon={<Ship className="h-4 w-4" />}
              label={isRo ? 'Feribot' : 'Ferry'}
              value={formatHours(trip.ferry.totalDurationHours)}
            />
          )}
          <StatCard
            icon={<CircleDollarSign className="h-4 w-4" />}
            label={isRo ? 'Cost estimat' : 'Estimated cost'}
            value={money(trip.cost.total)}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route teaser → links to /map */}
          <RoadTripRouteTeaser
            originCity={originCity}
            originLat={trip.origin.lat}
            originLon={trip.origin.lng}
            destinationCity={trip.destinationCity}
            destinationLat={trip.destination.lat}
            destinationLon={trip.destination.lng}
            stopovers={trip.stopovers.map((s) => ({ lat: s.lat, lng: s.lng }))}
            mode={trip.mode}
            href={`/${locale}/road-trip/result/${trip.id}/map`}
            locale={isRo ? 'ro' : 'en'}
          />

          {/* Stopovers section */}
          {trip.stopovers.length > 0 && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-h3 text-text-primary flex items-center gap-2">
                    <HotelIcon className="h-5 w-5 text-emerald-500" />
                    {isRo
                      ? `Popasuri peste noapte (${trip.stopovers.length})`
                      : `Overnight stopovers (${trip.stopovers.length})`}
                  </h2>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    {isRo
                      ? `Drumul de ${formatHours(trip.drive.durationHours)} e împărțit în ${trip.stopovers.length + 1} etape. Sari peste oricare nu îți place — costul scade.`
                      : `The ${formatHours(trip.drive.durationHours)} journey is split into ${trip.stopovers.length + 1} legs. Skip any stop you don't like — the cost drops.`}
                  </p>
                </div>
                {excludedStops.size > 0 && (
                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-bold">
                      {isRo ? `Economii estimate: ${money(savings)}` : `Estimated savings: ${money(savings)}`}
                    </span>
                    <button
                      type="button"
                      onClick={resetStops}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {isRo ? 'Resetează' : 'Reset stops'}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trip.stopovers.map((s) => {
                  const photo = hotelPhotoUrl(s.hotel, 320, 180);
                  const hotelHref = s.hotel
                    ? `/${locale}/road-trip/result/${trip.id}/hotel/${encodeURIComponent(s.hotel.id)}?stopover=${s.order}`
                    : null;
                  const stopCheckIn = addDays(trip.departureDate, s.order - 1);
                  const stopCheckOut = addDays(stopCheckIn, 1);
                  const browseAllHref = buildHotelSearchHref({
                    locale,
                    tripId: trip.id,
                    cityQuery: s.country ? `${s.city}, ${s.country}` : s.city,
                    cityName: s.city,
                    iata: s.iata,
                    checkIn: stopCheckIn,
                    checkOut: stopCheckOut,
                    adults: trip.adults,
                    stopoverOrder: s.order,
                  });
                  const isSkipped = excludedStops.has(s.order);
                  return (
                    <div
                      key={s.order}
                      className={`rounded-lg border overflow-hidden bg-background flex flex-col transition-opacity ${
                        isSkipped
                          ? 'border-dashed border-border-default opacity-50'
                          : 'border-border-default'
                      }`}
                    >
                      <div className="relative">
                        <StopoverPhoto
                          photo={photo}
                          alt={s.hotel?.title || s.city}
                          isSkipped={isSkipped}
                        />
                        <button
                          type="button"
                          onClick={() => toggleStop(s.order)}
                          className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow-md backdrop-blur-sm ${
                            isSkipped
                              ? 'bg-emerald-500/95 text-white hover:bg-emerald-600/95'
                              : 'bg-white/95 dark:bg-surface/95 text-text-primary hover:bg-white dark:hover:bg-surface'
                          }`}
                          aria-label={isSkipped ? 'Restore stop' : 'Skip stop'}
                        >
                          {isSkipped ? (
                            <>
                              <RotateCcw className="h-3 w-3" />
                              {isRo ? 'Adaugă înapoi' : 'Restore'}
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              {isRo ? 'Sari peste' : 'Skip stop'}
                            </>
                          )}
                        </button>
                        {isSkipped && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="rounded-full bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1 shadow-md">
                              {isRo ? 'Sărit' : 'Skipped'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <p className="text-xs uppercase tracking-wide text-text-muted">
                          {isRo ? `Noaptea ${s.order}` : `Night ${s.order}`} ·{' '}
                          {Math.round(s.arrivalHourFromStart)}h
                        </p>
                        <p
                          className={`text-body font-semibold line-clamp-1 ${
                            isSkipped ? 'text-text-muted line-through' : 'text-text-primary'
                          }`}
                        >
                          {s.city}
                        </p>
                        {s.hotel ? (
                          <>
                            <p className="text-body-sm text-text-secondary line-clamp-1">
                              {s.hotel.title}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                              {hotelHref && (
                                <Link
                                  href={hotelHref}
                                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                  {isRo ? 'Vezi hotelul' : 'View hotel'}
                                  <ChevronRight className="h-3 w-3" />
                                </Link>
                              )}
                              <Link
                                href={browseAllHref}
                                className="inline-flex items-center gap-1 text-text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                              >
                                {isRo ? `Toate hotelurile în ${s.city}` : `All hotels in ${s.city}`}
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-body-sm text-text-muted">
                              {isRo ? 'Niciun hotel preselectat — caută în Tripadvisor:' : 'No pre-selected hotel — browse Tripadvisor:'}
                            </p>
                            <Link
                              href={browseAllHref}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              {isRo ? `Hoteluri în ${s.city}` : `Hotels in ${s.city}`}
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </>
                        )}

                        {isSkipped && (
                          <p className="mt-2 text-xs text-text-muted italic">
                            {isRo
                              ? 'Continui drumul fără cazare în această noapte.'
                              : 'Drive through — no overnight stay here.'}
                          </p>
                        )}

                        {!isSkipped && s.weather && (
                          <StopoverWeatherChip weather={s.weather} isRo={isRo} />
                        )}

                        {!isSkipped && s.restaurants && s.restaurants.length > 0 && (
                          <div className="mt-3 border-t border-border-default pt-2">
                            <p className="text-[11px] uppercase tracking-wide font-semibold text-text-muted flex items-center gap-1">
                              <Utensils className="h-3 w-3" />
                              {isRo ? 'Unde mănânci' : 'Where to eat'}
                            </p>
                            <ul className="mt-1.5 space-y-1">
                              {s.restaurants.slice(0, 3).map((r) => (
                                <li
                                  key={r.id}
                                  className="text-xs text-text-secondary line-clamp-1"
                                >
                                  <span className="font-semibold text-text-primary">{r.name}</span>
                                  {r.cuisine && (
                                    <span className="text-text-muted"> · {r.cuisine.split(',')[0]}</span>
                                  )}
                                  {r.priceRange && (
                                    <span className="text-text-muted"> · {r.priceRange}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Top attractions — photo grid identical to flight detail page.
              Surfaced BEFORE Day-by-Day so the visual section anchors the
              reader before they dive into the textual plan. */}
          {(liveAttractions.length > 0 ||
            (trip.aiContent?.topAttractions && trip.aiContent.topAttractions.length > 0)) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                  {isRo ? `Atracții în ${trip.destinationCity}` : `Top Attractions`}
                </span>
              </div>
              <AttractionPhotos
                names={
                  liveAttractions.length > 0
                    ? liveAttractions.slice(0, 6).map((a) => a.name)
                    : trip.aiContent!.topAttractions.slice(0, 6).map((a) => a.name)
                }
                city={trip.destinationCity}
                descriptions={Object.fromEntries(
                  liveAttractions.length > 0
                    ? liveAttractions.map((a) => [a.name, a.description || a.category || ''])
                    : trip.aiContent!.topAttractions.map((a) => [a.name, a.description]),
                )}
              />
            </section>
          )}

          {/* Day-by-day — gradient bar header to match flight detail */}
          {trip.aiContent && (
            <section>
              <h2 className="text-xl font-bold text-secondary-500 dark:text-white mb-6">
                {isRo ? 'Itinerariu zi cu zi' : 'Day-by-Day Plan'}
              </h2>

              {trip.ferry && (
                <div className="mb-4 rounded-2xl border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-900/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-5 py-3">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      {isRo ? 'Traversare cu feribotul' : 'Ferry crossing'}
                    </h3>
                  </div>
                  <div className="divide-y divide-sky-100 dark:divide-sky-800/40">
                    {trip.ferry.segments.map((seg, i) => (
                      <div key={i} className="px-4 sm:px-5 py-3 sm:py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="font-semibold text-sky-900 dark:text-sky-100 text-sm">
                            {seg.fromName || (isRo ? `Segment ${i + 1}` : `Segment ${i + 1}`)}
                          </p>
                          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                            {formatHours(seg.durationHours)} · {seg.distanceKm} km
                          </p>
                        </div>
                        <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">
                          {isRo
                            ? 'Verifică orarul la operatori reali (Direct Ferries, AFerry, etc.)'
                            : 'Check live sailings with operators (Direct Ferries, AFerry, etc.)'}
                        </p>
                      </div>
                    ))}
                    <div className="px-5 py-3 bg-sky-100/60 dark:bg-sky-900/30 flex items-center justify-between text-sm">
                      <span className="font-semibold text-sky-900 dark:text-sky-100">
                        {isRo ? 'Cost estimat feribot' : 'Estimated ferry cost'}
                      </span>
                      <span className="font-bold text-sky-700 dark:text-sky-300">
                        {money(trip.ferry.estimatedCost)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {trip.aiContent.dayByDay.map((d) => (
                  <div
                    key={d.day}
                    className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3">
                      <h3 className="font-bold text-white">
                        {isRo ? `Ziua ${d.day}` : `Day ${d.day}`}: {d.title}
                      </h3>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-border-default">
                      {[
                        { label: isRo ? 'Dimineață' : 'Morning', Icon: Coffee, slot: d.morning },
                        { label: isRo ? 'După-amiază' : 'Afternoon', Icon: Sun, slot: d.afternoon },
                        { label: isRo ? 'Seara' : 'Evening', Icon: Moon, slot: d.evening },
                      ].map(({ label, Icon: TimeIcon, slot }) => (
                        <div
                          key={label}
                          className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-surface-elevated text-text-secondary shrink-0 mt-0.5">
                            <TimeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">
                              {label}
                            </p>
                            <p className="font-semibold text-secondary-500 dark:text-white text-sm">
                              {slot.activity}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">{slot.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Restaurants — live first, AI/CITY_DATA fallback */}
          {(liveRestaurants.length > 0 ||
            (trip.aiContent?.topRestaurants && trip.aiContent.topRestaurants.length > 0)) && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <h2 className="mb-1 text-h3 text-text-primary flex items-center gap-2">
                <Utensils className="h-5 w-5 text-emerald-500" />
                {isRo ? `Restaurante în ${trip.destinationCity}` : `Restaurants in ${trip.destinationCity}`}
              </h2>
              <p className="mb-4 text-xs text-text-muted">
                {liveRestaurants.length > 0
                  ? (isRo ? 'Live Tripadvisor' : 'Live Tripadvisor')
                  : (isRo ? 'Selecție locală' : 'Local picks')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {liveRestaurants.length > 0
                  ? liveRestaurants.slice(0, 8).map((r) => (
                      <div key={r.id} className="rounded-lg border border-border-default overflow-hidden bg-background">
                        {r.thumbnail && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={r.thumbnail} alt={r.name} className="h-32 w-full object-cover" loading="lazy" />
                        )}
                        <div className="p-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-body font-semibold text-text-primary line-clamp-1">{r.name}</p>
                            {r.priceRange && <span className="text-xs text-text-muted">{r.priceRange}</span>}
                          </div>
                          {r.cuisine && <p className="text-xs text-text-muted line-clamp-1">{r.cuisine}</p>}
                          {r.description && (
                            <p className="mt-1 text-body-sm text-text-secondary line-clamp-2">{r.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  : trip.aiContent!.topRestaurants.map((r, i) => (
                      <div key={i} className="rounded-lg border border-border-default p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-body font-semibold text-text-primary">{r.name}</p>
                          <span className="text-xs text-text-muted">{r.priceRange}</span>
                        </div>
                        <p className="text-xs text-text-muted">{r.cuisine}</p>
                        <p className="mt-1 text-body-sm text-text-secondary">{r.description}</p>
                      </div>
                    ))}
              </div>
            </section>
          )}

          {/* Cafes */}
          {trip.aiContent?.topCafes && trip.aiContent.topCafes.length > 0 && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <h2 className="mb-4 text-h3 text-text-primary flex items-center gap-2">
                <Coffee className="h-5 w-5 text-emerald-500" />
                {isRo ? 'Cafenele' : 'Cafés'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trip.aiContent.topCafes.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border-default p-3">
                    <p className="text-body font-semibold text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-muted">{c.specialty}</p>
                    <p className="mt-1 text-body-sm text-text-secondary">{c.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Local tips */}
          {trip.aiContent?.localTips && trip.aiContent.localTips.length > 0 && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <h2 className="mb-4 text-h3 text-text-primary flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-emerald-500" />
                {isRo ? 'Sfaturi pentru drum' : 'Road tips'}
              </h2>
              <ul className="space-y-2 text-body-sm text-text-secondary">
                {trip.aiContent.localTips.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Cost Breakdown — main-column section identical in shape to flight detail */}
          <section>
            <h2 className="text-xl font-bold text-secondary-500 dark:text-white mb-4">
              {isRo ? 'Detalii cost' : 'Cost Breakdown'}
            </h2>
            <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden">
              <div className="divide-y divide-neutral-100 dark:divide-border-default">
                {trip.mode === 'car' ? (
                  <>
                    <CostRow
                      icon={<Car className="h-4 w-4" />}
                      label={isRo ? 'Combustibil' : 'Fuel'}
                      value={money(trip.cost.fuel)}
                    />
                    <CostRow
                      icon={<RouteIcon className="h-4 w-4" />}
                      label={isRo ? 'Taxe drum (est.)' : 'Tolls (est.)'}
                      value={money(trip.cost.tolls)}
                    />
                  </>
                ) : trip.mode === 'train' ? (
                  <>
                    <CostRow
                      icon={<TrainFront className="h-4 w-4" />}
                      label={isRo ? 'Bilet tren / persoană (est.)' : 'Train fare / person (est.)'}
                      value={money(trainFarePerPerson)}
                    />
                    <CostRow
                      icon={<TrainFront className="h-4 w-4" />}
                      label={isRo ? `× ${trip.adults} pasageri` : `× ${trip.adults} passengers`}
                      value={money(trainFarePerPerson * trip.adults)}
                    />
                  </>
                ) : (
                  <>
                    <CostRow
                      icon={<Bus className="h-4 w-4" />}
                      label={isRo ? 'Bilet / persoană' : 'Fare / person'}
                      value={money(trip.cost.busFarePerPerson)}
                    />
                    <CostRow
                      icon={<Bus className="h-4 w-4" />}
                      label={isRo ? `× ${trip.adults} pasageri` : `× ${trip.adults} passengers`}
                      value={money(trip.cost.busFarePerPerson * trip.adults)}
                    />
                  </>
                )}
                {trip.ferry && trip.ferry.estimatedCost > 0 && (
                  <CostRow
                    icon={<Ship className="h-4 w-4" />}
                    label={isRo ? 'Feribot (estimat)' : 'Ferry crossing (est.)'}
                    value={money(trip.ferry.estimatedCost)}
                  />
                )}
                {trip.hotelDestination?.priceForDisplay && (
                  <CostRow
                    icon={<HotelIcon className="h-4 w-4" />}
                    label={
                      isRo
                        ? `Cazare în ${trip.destinationCity}`
                        : `Stay in ${trip.destinationCity}`
                    }
                    value={trip.hotelDestination.priceForDisplay}
                  />
                )}
                {trip.stopovers.length > 0 && (
                  <CostRow
                    icon={<HotelIcon className="h-4 w-4" />}
                    label={
                      isRo
                        ? `${trip.stopovers.length} popas${trip.stopovers.length === 1 ? '' : 'uri'} peste noapte`
                        : `${trip.stopovers.length} overnight stop${trip.stopovers.length === 1 ? '' : 's'}`
                    }
                    value={isRo ? 'Vezi card-uri' : 'See cards'}
                  />
                )}
                <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 dark:bg-surface-elevated">
                  <span className="font-bold text-text-primary">
                    {isRo ? 'Total estimat' : 'Quote total'}
                  </span>
                  <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                    {money(trip.cost.total)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-6">
          {/* Cost breakdown */}
          <section className="rounded-radius-xl border border-border-default bg-surface p-5 sticky top-4">
            <h3 className="mb-3 flex items-center gap-2 text-body font-semibold text-text-primary">
              <CircleDollarSign className="h-4 w-4 text-emerald-500" />
              {isRo ? 'Cost estimat' : 'Estimated cost'}
            </h3>
            <dl className="space-y-2 text-body-sm">
              {trip.mode === 'car' ? (
                <>
                  <Row label={isRo ? 'Combustibil' : 'Fuel'} value={money(trip.cost.fuel)} />
                  <Row label={isRo ? 'Taxe drum' : 'Tolls (est.)'} value={money(trip.cost.tolls)} />
                </>
              ) : trip.mode === 'train' ? (
                <>
                  <Row
                    label={isRo ? 'Bilet / pers. (est.)' : 'Fare / person (est.)'}
                    value={money(trainFarePerPerson)}
                  />
                  <Row
                    label={isRo ? `× ${trip.adults} pers.` : `× ${trip.adults} pax`}
                    value={money(trainFarePerPerson * trip.adults)}
                  />
                </>
              ) : (
                <>
                  <Row
                    label={isRo ? 'Bilet / pers.' : 'Fare / person'}
                    value={money(trip.cost.busFarePerPerson)}
                  />
                  <Row
                    label={isRo ? `× ${trip.adults} pers.` : `× ${trip.adults} pax`}
                    value={money(trip.cost.busFarePerPerson * trip.adults)}
                  />
                </>
              )}
              <div className="mt-2 flex justify-between border-t border-border-default pt-2">
                <dt className="font-semibold text-text-primary">Total</dt>
                <dd className="text-body font-bold text-emerald-600 dark:text-emerald-400">
                  {money(trip.cost.total)}
                </dd>
              </div>
            </dl>
            <a
              href={trip.externalLinks.googleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-border-default px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-sunken"
            >
              <ExternalLink className="h-4 w-4" />
              {isRo ? 'Vezi pe Google Maps' : 'View in Google Maps'}
            </a>
            {trip.externalLinks.flixbus && (
              <a
                href={trip.externalLinks.flixbus}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Rezervă pe Flixbus
              </a>
            )}
            {trip.externalLinks.trainline && (
              <a
                href={trip.externalLinks.trainline}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-sky-500 hover:bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md"
              >
                <TrainFront className="h-4 w-4" />
                {isRo ? 'Caută bilete pe Trainline' : 'Search tickets on Trainline'}
              </a>
            )}
          </section>

          {/* Destination hotel + browse-all button */}
          {trip.hotelDestination && (
            <HotelMiniCard
              hotel={trip.hotelDestination}
              label={isRo ? `Cazare în ${trip.destinationCity}` : `Stay in ${trip.destinationCity}`}
              href={`/${locale}/road-trip/result/${trip.id}/hotel/${encodeURIComponent(trip.hotelDestination.id)}`}
              isRo={isRo}
            />
          )}
          <Link
            href={buildHotelSearchHref({
              locale,
              tripId: trip.id,
              cityQuery: trip.destinationCountry
                ? `${trip.destinationCity}, ${trip.destinationCountry}`
                : trip.destinationCity,
              cityName: trip.destinationCity,
              iata: trip.destinationIata,
              checkIn: destinationCheckIn,
              checkOut: destinationCheckOut,
              adults: trip.adults,
            })}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            <HotelIcon className="h-4 w-4" />
            {isRo ? `Vezi toate hotelurile în ${trip.destinationCity}` : `View all hotels in ${trip.destinationCity}`}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-radius-lg border border-border-default bg-surface p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-lg sm:text-xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

function CostRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-sm">
      <span className="flex items-center gap-2 text-text-secondary">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function StopoverPhoto({
  photo,
  alt,
  isSkipped,
}: {
  photo: string | null;
  alt: string;
  isSkipped: boolean;
}) {
  // Tripadvisor's CDN occasionally serves expired/404 photo URLs even when
  // `urlTemplate` is well-formed. The onError handler swaps in the same
  // gradient placeholder we use when there's no photo at all — never a
  // broken-image icon.
  const [failed, setFailed] = useState(false);
  if (!photo || failed) {
    return (
      <div className="h-32 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
        <HotelIcon className="h-7 w-7 text-emerald-400 dark:text-emerald-500" />
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={photo}
      alt={alt}
      className={`h-32 w-full object-cover ${isSkipped ? 'grayscale' : ''}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function StopoverWeatherChip({
  weather,
  isRo,
}: {
  weather: NonNullable<RoadTripData['stopovers'][number]['weather']>;
  isRo: boolean;
}) {
  const decoded = decodeWeatherCode(weather.weatherCode);
  const Icon = WEATHER_ICONS[decoded.icon] ?? Cloud;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-md bg-sky-50 dark:bg-sky-900/15 border border-sky-100 dark:border-sky-900/40 px-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300 shrink-0" />
      <span className="text-[11px] font-semibold text-sky-900 dark:text-sky-100">
        {Math.round(weather.tempMin)}° / {Math.round(weather.tempMax)}°
      </span>
      <span className="text-[11px] text-sky-700 dark:text-sky-300 line-clamp-1">
        {isRo ? translateWeather(decoded.label) : decoded.label}
      </span>
    </div>
  );
}

function translateWeather(en: string): string {
  const map: Record<string, string> = {
    'Clear sky': 'Senin',
    'Mainly clear': 'În mare parte senin',
    'Partly cloudy': 'Parțial înnorat',
    'Overcast': 'Înnorat',
    'Fog': 'Ceață',
    'Drizzle': 'Burniță',
    'Rain': 'Ploaie',
    'Snow': 'Ninsoare',
    'Rain showers': 'Averse',
    'Snow showers': 'Averse de zăpadă',
    'Thunderstorm': 'Furtună',
    'Unknown': 'Necunoscut',
  };
  return map[en] ?? en;
}

function HotelMiniCard({
  hotel,
  label,
  href,
  isRo,
}: {
  hotel: NonNullable<RoadTripData['hotelDestination']>;
  label: string;
  href: string;
  isRo: boolean;
}) {
  const photo = hotelPhotoUrl(hotel, 400, 240);
  const rating = hotel.bubbleRating?.rating;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = photo && !imgFailed;
  return (
    <Link
      href={href}
      className="block rounded-radius-xl border border-border-default bg-surface overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="px-5 pt-4 pb-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <HotelIcon className="h-3.5 w-3.5" />
          {label}
        </h3>
      </div>
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photo}
          alt={hotel.title}
          className="h-40 w-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : photo === null ? null : (
        <div className="h-40 w-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
          <HotelIcon className="h-8 w-8 text-emerald-400 dark:text-emerald-500" />
        </div>
      )}
      <div className="px-5 pb-4 pt-3">
        <h4 className="text-body font-semibold text-text-primary line-clamp-1">{hotel.title}</h4>
        {hotel.secondaryInfo && (
          <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{hotel.secondaryInfo}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
          {typeof rating === 'number' && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              {rating.toFixed(1)}
            </span>
          )}
          {hotel.priceForDisplay && (
            <span className="font-semibold text-text-primary">{hotel.priceForDisplay}</span>
          )}
        </div>
        <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {isRo ? 'Vezi detaliile →' : 'View details →'}
        </p>
      </div>
    </Link>
  );
}
