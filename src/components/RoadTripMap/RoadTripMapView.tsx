'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Car,
  Bus,
  Footprints,
  Bike,
  MapPin,
  BedDouble,
  Coffee,
  Utensils,
  Compass,
  ExternalLink,
  Info,
  Hotel as HotelIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  buildDirectionsEmbedUrl,
  buildPlaceEmbedUrl,
  TRAVEL_MODES,
  type TravelMode,
} from '@/components/RouteMap/buildEmbedUrl';
import TransitDetails from '@/components/RouteMap/TransitDetails';
import { shortCityFromFormatted, hotelPhotoUrl } from '@/lib/roadTrip';
import type { RoadTripData } from '@/lib/roadTrip';

interface LiveRestaurant {
  id: string;
  name: string;
  cuisine?: string;
  priceRange?: string;
}

interface LiveAttraction {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  description?: string;
  thumbnail?: string;
}

interface Props {
  trip: RoadTripData;
  /** Optional initial focused place from `?place=<name>` deep-link (used
   *  when the user clicks an attraction tile on the road-trip detail page).
   *  Pre-focuses the iframe AND lights up the matching sidebar row. */
  initialFocusedPlace?: string | null;
}

/** Mode toggle metadata — same four modes as the flight RouteMapView so the
 *  road-trip map offers identical functionality (drive the whole way, walk
 *  the last mile from the city centre to a café, see the bus lines via the
 *  transit panel, or cycle). Labels are bilingual to match this file's
 *  inline-ternary i18n style. */
const MODE_META: Record<TravelMode, { en: string; ro: string; icon: typeof Car }> = {
  driving: { en: 'Driving', ro: 'Mașină', icon: Car },
  walking: { en: 'Walking', ro: 'Pe jos', icon: Footprints },
  transit: { en: 'Transit', ro: 'Transport', icon: Bus },
  bicycling: { en: 'Cycling', ro: 'Bicicletă', icon: Bike },
};

function googleMapsSearchUrl(name: string, city: string, country?: string): string {
  const q = country ? `${name}, ${city}, ${country}` : `${name}, ${city}`;
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
}

export default function RoadTripMapView({ trip, initialFocusedPlace = null }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === 'ro';
  const tTransit = useTranslations('transit');
  // Initial mode follows the chosen trip mode; bus trips open on Transit.
  const [mode, setMode] = useState<TravelMode>(trip.mode === 'bus' ? 'transit' : 'driving');
  // Seed from the URL deep-link. Sidebar highlight does
  // `focusedPlace?.startsWith(name + ',')` — match the `${name}, ${city}`
  // shape `focusPlace()` uses for clicks so URL-driven seeds also highlight.
  const [focusedPlace, setFocusedPlace] = useState<string | null>(() => {
    if (!initialFocusedPlace) return null;
    if (initialFocusedPlace.includes(',')) return initialFocusedPlace;
    return `${initialFocusedPlace}, ${trip.destinationCity}`;
  });
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const ai = trip.aiContent;
  const cafes = ai?.topCafes ?? [];
  const originCity = shortCityFromFormatted(trip.origin.formatted);

  // Live restaurants + attractions — same pattern as flight RouteMapView
  const [liveRestaurants, setLiveRestaurants] = useState<LiveRestaurant[]>([]);
  const [liveAttractions, setLiveAttractions] = useState<LiveAttraction[]>([]);
  useEffect(() => {
    if (!trip.destinationCity) return;
    let cancelled = false;
    const qs = new URLSearchParams({ city: trip.destinationCity });
    if (trip.destinationCountry) qs.set('country', trip.destinationCountry);
    Promise.all([
      fetch(`/api/restaurants/search?${qs.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/attractions/search?${qs.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(
      ([rest, attr]: [
        { restaurants?: LiveRestaurant[] } | null,
        { attractions?: LiveAttraction[] } | null,
      ]) => {
        if (cancelled) return;
        if (rest?.restaurants?.length) setLiveRestaurants(rest.restaurants);
        if (attr?.attractions?.length) setLiveAttractions(attr.attractions);
      },
    );
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

  // Attractions list — live Tripadvisor wins, AI/CITY_DATA fallback follows.
  // Normalize both shapes to { name, description } since RouteStop + sidebar
  // only need a name + description-style hover.
  const attractions: Array<{ name: string; description?: string }> =
    liveAttractions.length > 0
      ? liveAttractions.slice(0, 4).map((a) => ({ name: a.name, description: a.description || a.category }))
      : (ai?.topAttractions ?? [])
          .slice(0, 4)
          .map((a) => ({ name: a.name, description: a.description }));

  // Build full route: origin → [stopovers] → destination
  const originLabel = `${originCity}${extractCountrySuffix(trip.origin.formatted)}`;
  const destinationLabel = `${trip.destinationCity}${trip.destinationCountry ? `, ${trip.destinationCountry}` : ''}`;
  const stopoverWaypoints = trip.stopovers.slice(0, 3).map((s) => s.city);

  // Coordinates are far more reliable than free-text geocoding for the
  // Directions API (AI-named attractions often resolve to NOT_FOUND).
  const originCoords = `${trip.origin.lat},${trip.origin.lng}`;
  const destCoords = `${trip.destination.lat},${trip.destination.lng}`;

  const fullRouteUrl = buildDirectionsEmbedUrl({
    apiKey,
    origin: originLabel,
    destination: destinationLabel,
    waypoints: stopoverWaypoints,
    mode,
  });

  // A focused place is "local" (inside the destination city) when it carries
  // the ", <destinationCity>" suffix that focusPlace(name, city) appends.
  // Local places route FROM the destination city centre — mirroring how the
  // flight map routes local hops from the ARRIVAL airport, not the departure
  // one ("din centrul Istanbulului la cafenea"). Stopover focuses (a bare
  // city name) keep the inter-city origin so the macro drive still shows.
  const focusIsLocal =
    !!focusedPlace &&
    focusedPlace.toLowerCase().endsWith(trip.destinationCity.toLowerCase());

  const focusOrigin = focusIsLocal ? destCoords : originLabel;

  const focusedDirectionsUrl = focusedPlace
    ? buildDirectionsEmbedUrl({
        apiKey,
        origin: focusOrigin,
        destination: focusedPlace,
        waypoints: [],
        mode,
      })
    : null;

  const fallbackUrl = buildPlaceEmbedUrl(apiKey, destinationLabel);

  const iframeSrc = focusedDirectionsUrl ?? fullRouteUrl ?? fallbackUrl;
  const iframeKey = focusedPlace ? `focus:${focusedPlace}:${mode}` : `route:${mode}`;

  // ── Transit panel queries ──
  // Full route (no focus): inter-city bus/train lines, origin city → dest city.
  // Focused local place: city-centre transit/walk to that place.
  // Focused stopover: inter-city leg to the stopover.
  const transitOrigin = focusIsLocal ? destCoords : originCoords;
  const transitDestination = focusedPlace ?? destCoords;
  const transitLabel = focusedPlace
    ? tTransit('headerLocal', { place: focusedPlace.split(',')[0] })
    : tTransit('headerMajor', { origin: originCity, destination: trip.destinationCity });

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
            {/* Mode toggle — all four modes, like the flight map. Switching
                works for both the full route and any focused single-stop
                route so the user can compare driving vs walking vs transit
                vs cycling for the place they tapped. */}
            <div className="flex gap-1 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default p-1">
              {TRAVEL_MODES.map((id) => {
                const { en, ro, icon: ModeIcon } = MODE_META[id];
                const active = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all ${
                      active
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated'
                    }`}
                  >
                    <ModeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline sm:inline">{isRo ? ro : en}</span>
                  </button>
                );
              })}
            </div>

            {/* Cycling-only notice — Google's cycling coverage is patchy
                outside cities, so warn before the user reads an empty map. */}
            {mode === 'bicycling' && (
              <div className="flex items-start gap-1.5 bg-amber-50/95 dark:bg-amber-900/20 backdrop-blur-md rounded-xl border border-amber-200/60 dark:border-amber-800/40 px-3 py-1.5 max-w-full">
                <Info className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                  {isRo
                    ? 'Rutele pe bicicletă depind de acoperirea Google. Dacă lipsesc, încearcă mașină sau pe jos.'
                    : 'Cycling routes depend on Google coverage. If the path is missing, try driving or walking.'}
                </p>
              </div>
            )}

            {focusedPlace && (
              <button
                type="button"
                onClick={showFullRoute}
                className="flex items-center gap-2 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default px-3 py-1.5 max-w-full hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
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
            {/* TRANSIT DETAILS — real bus/train lines from Google Directions.
                Default (no focus) shows the inter-city lines (origin city →
                destination city, e.g. the FlixBus connection). Focusing a
                place inside the destination switches it to city-centre →
                place transit. Coordinates are used for origin/destination so
                geocoding of AI-named places can't break the lookup. */}
            {mode === 'transit' && (
              <TransitDetails
                origin={transitOrigin}
                destination={transitDestination}
                mode="transit"
                label={transitLabel}
              />
            )}

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
                    <PlaceItem
                      key={r.id}
                      name={r.name}
                      sub={[r.cuisine, r.priceRange].filter(Boolean).join(' · ')}
                      city={trip.destinationCity}
                      country={trip.destinationCountry}
                      isFocused={focusedPlace?.startsWith(r.name + ',') ?? false}
                      onFocus={() => focusPlace(r.name, trip.destinationCity)}
                    />
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
                    <PlaceItem
                      key={i}
                      name={c.name}
                      sub={c.specialty}
                      city={trip.destinationCity}
                      country={trip.destinationCountry}
                      isFocused={focusedPlace?.startsWith(c.name + ',') ?? false}
                      onFocus={() => focusPlace(c.name, trip.destinationCity)}
                    />
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
                    <PlaceItem
                      key={i}
                      name={a.name}
                      sub={a.description}
                      city={trip.destinationCity}
                      country={trip.destinationCountry}
                      isFocused={focusedPlace?.startsWith(a.name + ',') ?? false}
                      onFocus={() => focusPlace(a.name, trip.destinationCity)}
                    />
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

interface PlaceItemProps {
  name: string;
  sub?: string;
  city: string;
  country?: string;
  isFocused: boolean;
  onFocus: () => void;
}

/**
 * Sidebar list row. Main click focuses the in-app map iframe on this place
 * (no navigation, stays in our UI). The small external-link icon button is a
 * separate optional escape hatch to open Google Maps in a new tab. Green
 * accent mirrors the road-trip identity (the flight map uses orange).
 */
function PlaceItem({ name, sub, city, country, isFocused, onFocus }: PlaceItemProps) {
  return (
    <li>
      <div
        className={`relative flex items-start gap-2 rounded-xl border transition-colors ${
          isFocused
            ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/15 ring-2 ring-emerald-500/20'
            : 'border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
        }`}
      >
        <button
          type="button"
          onClick={onFocus}
          className="flex items-start gap-2 flex-1 min-w-0 px-3 py-2.5 text-left group"
          aria-pressed={isFocused}
        >
          <MapPin
            className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
              isFocused ? 'text-emerald-500' : 'text-text-muted group-hover:text-emerald-500'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold transition-colors truncate ${
                isFocused ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-primary group-hover:text-emerald-600'
              }`}
            >
              {name}
            </p>
            {sub && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{sub}</p>}
          </div>
        </button>
        <a
          href={googleMapsSearchUrl(name, city, country)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name} in Google Maps in a new tab`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-9 w-9 mr-1 my-auto items-center justify-center rounded-lg text-text-muted hover:text-emerald-500 hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
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
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = photo && !imgFailed;
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border-default overflow-hidden hover:shadow-md transition-shadow bg-background"
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photo}
          alt={hotel.title}
          className="h-24 w-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="h-24 w-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
          <HotelIcon className="h-6 w-6 text-emerald-400 dark:text-emerald-500" />
        </div>
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
