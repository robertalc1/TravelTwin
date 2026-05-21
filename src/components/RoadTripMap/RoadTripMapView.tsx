'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Car,
  Bus,
  MapPin,
  BedDouble,
  Coffee,
  Utensils,
  Compass,
  ExternalLink,
  Hotel as HotelIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  buildDirectionsEmbedUrl,
  buildPlaceEmbedUrl,
} from '@/components/RouteMap/buildEmbedUrl';
import { shortCityFromFormatted, hotelPhotoUrl } from '@/lib/roadTrip';
import type { RoadTripData } from '@/lib/roadTrip';

type RoadMode = 'driving' | 'transit';

interface LiveRestaurant {
  id: string;
  name: string;
  cuisine?: string;
  priceRange?: string;
}

interface Props {
  trip: RoadTripData;
}

export default function RoadTripMapView({ trip }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === 'ro';
  const [mode, setMode] = useState<RoadMode>(trip.mode === 'bus' ? 'transit' : 'driving');
  const [focusedPlace, setFocusedPlace] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const ai = trip.aiContent;
  const attractions = (ai?.topAttractions ?? []).slice(0, 4);
  const cafes = ai?.topCafes ?? [];
  const originCity = shortCityFromFormatted(trip.origin.formatted);

  // Live restaurants — same pattern as flight RouteMapView
  const [liveRestaurants, setLiveRestaurants] = useState<LiveRestaurant[]>([]);
  useEffect(() => {
    if (!trip.destinationCity) return;
    let cancelled = false;
    const qs = new URLSearchParams({ city: trip.destinationCity });
    if (trip.destinationCountry) qs.set('country', trip.destinationCountry);
    fetch(`/api/restaurants/search?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { restaurants?: LiveRestaurant[] } | null) => {
        if (cancelled || !data?.restaurants?.length) return;
        setLiveRestaurants(data.restaurants);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trip.destinationCity, trip.destinationCountry]);

  const restaurants =
    liveRestaurants.length > 0
      ? liveRestaurants
      : (ai?.topRestaurants ?? []).map((r) => ({
          id: `ai-${r.name}`,
          name: r.name,
          cuisine: r.cuisine,
          priceRange: r.priceRange,
        }));

  // Build full route: origin → [stopovers] → destination
  const originLabel = `${originCity}${extractCountrySuffix(trip.origin.formatted)}`;
  const destinationLabel = `${trip.destinationCity}${trip.destinationCountry ? `, ${trip.destinationCountry}` : ''}`;
  const stopoverWaypoints = trip.stopovers.slice(0, 3).map((s) => s.city);

  const fullRouteUrl = buildDirectionsEmbedUrl({
    apiKey,
    origin: originLabel,
    destination: destinationLabel,
    waypoints: stopoverWaypoints,
    mode,
  });

  const focusedDirectionsUrl = focusedPlace
    ? buildDirectionsEmbedUrl({
        apiKey,
        origin: originLabel,
        destination: focusedPlace,
        waypoints: [],
        mode,
      })
    : null;

  const fallbackUrl = buildPlaceEmbedUrl(apiKey, destinationLabel);

  const iframeSrc = focusedDirectionsUrl ?? fullRouteUrl ?? fallbackUrl;
  const iframeKey = focusedPlace ? `focus:${focusedPlace}:${mode}` : `route:${mode}`;

  const Icon = trip.mode === 'car' ? Car : Bus;

  function focusPlace(name: string, city?: string) {
    const place = city ? `${name}, ${city}` : name;
    setFocusedPlace(place);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function showFullRoute() {
    setFocusedPlace(null);
  }

  // Body scroll lock on desktop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-neutral-200 dark:border-border-default bg-white dark:bg-surface">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/road-trip/result/${trip.id}`)}
            aria-label="Back to trip"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted leading-none">
              {isRo ? 'Traseu pe hartă' : 'Route map'}
            </p>
            <h1 className="text-base sm:text-xl font-extrabold text-text-primary truncate mt-1">
              {originCity} → {trip.destinationCity}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Map column */}
        <section className="order-1 lg:order-2 lg:flex-1 relative bg-neutral-100 dark:bg-neutral-900">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[calc(100%-1.5rem)]">
            <div className="flex gap-1 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default p-1">
              <ModeButton active={mode === 'driving'} onClick={() => setMode('driving')} icon={<Car className="h-4 w-4" />}>
                {isRo ? 'Mașină' : 'Driving'}
              </ModeButton>
              <ModeButton active={mode === 'transit'} onClick={() => setMode('transit')} icon={<Bus className="h-4 w-4" />}>
                Transit
              </ModeButton>
            </div>

            {focusedPlace && (
              <button
                type="button"
                onClick={showFullRoute}
                className="flex items-center gap-2 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default px-3 py-1.5 max-w-full hover:bg-neutral-50"
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                  {focusedPlace.split(',')[0]} · {isRo ? 'Înapoi la traseu' : 'Back to route'}
                </span>
              </button>
            )}
          </div>

          <div className="h-[55vh] lg:h-[calc(100vh-4rem)]">
            {iframeSrc ? (
              <iframe
                key={iframeKey}
                title={focusedPlace ? `Route to ${focusedPlace}` : `Route from ${originCity} to ${trip.destinationCity}`}
                src={iframeSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-50 dark:bg-surface-elevated text-center px-6">
                <div>
                  <p className="text-sm font-bold text-text-primary mb-1">
                    {isRo ? 'Cheia Google Maps nu e configurată' : 'Google Maps key not configured'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {isRo ? 'Adaugă' : 'Add'} <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> {isRo ? 'în variabilele de mediu.' : 'to your environment.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="order-2 lg:order-1 lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:h-[calc(100vh-4rem)] border-t lg:border-t-0 lg:border-r border-neutral-200 dark:border-border-default bg-white dark:bg-surface">
          <div className="p-4 sm:p-5 space-y-6">
            {/* ROUTE STOPS */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                {isRo ? 'Traseul tău' : 'Your route'}
              </h2>
              <ol className="relative space-y-2">
                <span className="absolute left-[15px] top-3 bottom-3 w-px bg-neutral-200 dark:bg-border-default" aria-hidden />

                <RouteStop
                  icon={<Icon className="h-4 w-4" />}
                  isActive={!focusedPlace}
                  label={isRo ? 'Plecare din' : 'Departure from'}
                  name={originCity}
                  onClick={showFullRoute}
                />

                {trip.stopovers.map((s) => (
                  <RouteStop
                    key={s.order}
                    icon={<BedDouble className="h-4 w-4" />}
                    isActive={focusedPlace === s.city}
                    isStopover
                    label={isRo ? `Popas ${s.order}` : `Stopover ${s.order}`}
                    name={s.city}
                    onClick={() => focusPlace(s.city)}
                  />
                ))}

                {trip.hotelDestination && (
                  <RouteStop
                    icon={<HotelIcon className="h-4 w-4" />}
                    isActive={
                      focusedPlace?.startsWith(trip.hotelDestination.title + ',') ?? false
                    }
                    label={isRo ? 'Cazare' : 'Stay'}
                    name={trip.hotelDestination.title ?? trip.destinationCity}
                    onClick={() => focusPlace(trip.hotelDestination!.title || '', trip.destinationCity)}
                  />
                )}

                {attractions.map((a, i) => (
                  <RouteStop
                    key={`attr-${i}`}
                    icon={<span className="text-[11px] font-bold">{i + 1}</span>}
                    isActive={focusedPlace?.startsWith(a.name + ',') ?? false}
                    label={isRo ? 'Atracție' : 'Attraction'}
                    name={a.name}
                    onClick={() => focusPlace(a.name, trip.destinationCity)}
                  />
                ))}
              </ol>
            </section>

            {/* DESTINATION HOTEL */}
            {trip.hotelDestination && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  {isRo ? `Cazare în ${trip.destinationCity}` : `Stay in ${trip.destinationCity}`}
                </h2>
                <SidebarHotelCard
                  hotel={trip.hotelDestination}
                  href={`/${locale}/road-trip/result/${trip.id}/hotel/${encodeURIComponent(trip.hotelDestination.id)}`}
                />
              </section>
            )}

            {/* STOPOVER HOTELS */}
            {trip.stopovers.length > 0 && trip.stopovers.some((s) => s.hotel) && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  {isRo ? 'Popasuri pe drum' : 'Stopover hotels'}
                </h2>
                <div className="space-y-2">
                  {trip.stopovers
                    .filter((s) => s.hotel)
                    .map((s) => (
                      <SidebarHotelCard
                        key={s.order}
                        hotel={s.hotel!}
                        href={`/${locale}/road-trip/result/${trip.id}/hotel/${encodeURIComponent(s.hotel!.id)}?stopover=${s.order}`}
                        subtitle={`${isRo ? 'Noaptea' : 'Night'} ${s.order} · ${s.city}`}
                      />
                    ))}
                </div>
              </section>
            )}

            {/* RESTAURANTS */}
            {restaurants.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5" />
                  {isRo ? 'Restaurante' : 'Restaurants'}
                </h2>
                <ul className="space-y-1.5">
                  {restaurants.slice(0, 6).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => focusPlace(r.name, trip.destinationCity)}
                        className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-surface-sunken transition-colors"
                      >
                        <p className="text-body-sm font-semibold text-text-primary line-clamp-1">{r.name}</p>
                        <p className="text-xs text-text-muted line-clamp-1">
                          {[r.cuisine, r.priceRange].filter(Boolean).join(' · ')}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* CAFES */}
            {cafes.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5" />
                  {isRo ? 'Cafenele' : 'Cafés'}
                </h2>
                <ul className="space-y-1.5">
                  {cafes.slice(0, 5).map((c, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => focusPlace(c.name, trip.destinationCity)}
                        className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-surface-sunken transition-colors"
                      >
                        <p className="text-body-sm font-semibold text-text-primary line-clamp-1">{c.name}</p>
                        <p className="text-xs text-text-muted line-clamp-1">{c.specialty}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ATTRACTIONS */}
            {attractions.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  {isRo ? 'De făcut' : 'Things to do'}
                </h2>
                <ul className="space-y-1.5">
                  {attractions.map((a, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => focusPlace(a.name, trip.destinationCity)}
                        className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-surface-sunken transition-colors"
                      >
                        <p className="text-body-sm font-semibold text-text-primary line-clamp-1">{a.name}</p>
                        <p className="text-xs text-text-muted line-clamp-1">{a.description}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* External link */}
            <section>
              <a
                href={trip.externalLinks.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border-default px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-sunken"
              >
                <ExternalLink className="h-4 w-4" />
                {isRo ? 'Deschide în Google Maps' : 'Open in Google Maps'}
              </a>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all ${
        active
          ? 'bg-emerald-500 text-white shadow-md'
          : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function RouteStop({
  icon,
  isActive,
  isStopover,
  label,
  name,
  onClick,
}: {
  icon: React.ReactNode;
  isActive: boolean;
  isStopover?: boolean;
  label: string;
  name: string;
  onClick: () => void;
}) {
  return (
    <li className="relative flex items-start gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full z-10 ${
          isActive
            ? 'bg-emerald-500 text-white shadow-md'
            : isStopover
            ? 'bg-white dark:bg-surface border-2 border-amber-400 text-amber-600 dark:text-amber-300'
            : 'bg-white dark:bg-surface border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {icon}
      </span>
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 pt-1 text-left flex-1 group"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted leading-none">{label}</p>
        <p
          className={`text-sm font-semibold transition-colors mt-0.5 truncate ${
            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-primary group-hover:text-emerald-600'
          }`}
        >
          {name}
        </p>
      </button>
    </li>
  );
}

function SidebarHotelCard({
  hotel,
  href,
  subtitle,
}: {
  hotel: NonNullable<RoadTripData['hotelDestination']>;
  href: string;
  subtitle?: string;
}) {
  const photo = hotelPhotoUrl(hotel, 320, 160);
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border-default overflow-hidden hover:shadow-md transition-shadow bg-background"
    >
      {photo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={photo} alt={hotel.title} className="h-24 w-full object-cover" loading="lazy" />
      )}
      <div className="p-3">
        {subtitle && <p className="text-xs uppercase tracking-wide text-text-muted">{subtitle}</p>}
        <p className="text-body-sm font-semibold text-text-primary line-clamp-1">{hotel.title}</p>
        {hotel.secondaryInfo && (
          <p className="text-xs text-text-muted line-clamp-1">{hotel.secondaryInfo}</p>
        )}
        {hotel.priceForDisplay && (
          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {hotel.priceForDisplay}
          </p>
        )}
      </div>
    </Link>
  );
}

function extractCountrySuffix(formatted: string): string {
  const parts = formatted.split(',').map((p) => p.trim());
  if (parts.length <= 1) return '';
  return `, ${parts[parts.length - 1]}`;
}
