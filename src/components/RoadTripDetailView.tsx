'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Car,
  Bus,
  MapPin,
  Clock,
  Route as RouteIcon,
  Fuel,
  CircleDollarSign,
  ExternalLink,
  Hotel as HotelIcon,
  Star,
  AlertCircle,
  Sparkles,
  Camera,
  Utensils,
  Coffee,
  Lightbulb,
  Sun,
  Moon,
  Plane as PlaneIcon,
} from 'lucide-react';
import Link from 'next/link';
import { resolveRoadTripHero, formatHours, formatDate, hotelPhotoUrl } from '@/lib/roadTrip';
import type { RoadTripData } from '@/lib/roadTrip';

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

  const heroUrl = resolveRoadTripHero(trip);
  const originCity = trip.origin.formatted.split(',')[0]?.trim() || trip.origin.formatted;
  const Icon = trip.mode === 'car' ? Car : Bus;

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
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
        <div className="relative h-56 sm:h-72 md:h-[420px] rounded-2xl sm:rounded-3xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroUrl} alt={trip.destinationCity} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white shadow-md">
            <Icon className="h-3.5 w-3.5" />
            {trip.mode === 'car' ? (isRo ? 'Cu mașina' : 'By car') : isRo ? 'Cu autobuzul' : 'By bus'}
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
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 mt-6">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
          <StatCard
            icon={<CircleDollarSign className="h-4 w-4" />}
            label={isRo ? 'Cost estimat' : 'Estimated cost'}
            value={`€${trip.cost.total}`}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {trip.warnings.length > 0 && (
            <div className="rounded-radius-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 p-4">
              <p className="mb-2 text-body-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {isRo ? 'Note despre rezultate' : 'Notes about the results'}
              </p>
              <ul className="space-y-1 text-body-sm text-amber-700 dark:text-amber-200">
                {trip.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Route teaser → links to /map */}
          <RoadTripRouteTeaser
            originCity={originCity}
            destinationCity={trip.destinationCity}
            destinationLat={trip.destination.lat}
            destinationLon={trip.destination.lng}
            mode={trip.mode}
            href={`/${locale}/road-trip/result/${trip.id}/map`}
            locale={isRo ? 'ro' : 'en'}
          />

          {/* Stopovers section */}
          {trip.stopovers.length > 0 && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <h2 className="mb-4 text-h3 text-text-primary flex items-center gap-2">
                <HotelIcon className="h-5 w-5 text-emerald-500" />
                {isRo
                  ? `Popasuri peste noapte (${trip.stopovers.length})`
                  : `Overnight stopovers (${trip.stopovers.length})`}
              </h2>
              <p className="mb-4 text-body-sm text-text-secondary">
                {isRo
                  ? `Drumul de ${formatHours(trip.drive.durationHours)} e împărțit în ${trip.stopovers.length + 1} etape. Fiecare popas are un hotel preselectat.`
                  : `The ${formatHours(trip.drive.durationHours)} journey is split into ${trip.stopovers.length + 1} legs. Each overnight stop has a pre-selected hotel.`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trip.stopovers.map((s) => {
                  const photo = hotelPhotoUrl(s.hotel, 320, 180);
                  const hotelHref = s.hotel
                    ? `/${locale}/road-trip/result/${trip.id}/hotel/${encodeURIComponent(s.hotel.id)}?stopover=${s.order}`
                    : null;
                  return (
                    <div
                      key={s.order}
                      className="rounded-lg border border-border-default overflow-hidden bg-background"
                    >
                      {photo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={photo} alt={s.hotel?.title || s.city} className="h-32 w-full object-cover" />
                      ) : (
                        <div className="h-32 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20" />
                      )}
                      <div className="p-3">
                        <p className="text-xs uppercase tracking-wide text-text-muted">
                          {isRo ? `Noaptea ${s.order}` : `Night ${s.order}`} ·{' '}
                          {Math.round(s.arrivalHourFromStart)}h
                        </p>
                        <p className="text-body font-semibold text-text-primary line-clamp-1">{s.city}</p>
                        {s.hotel ? (
                          <>
                            <p className="text-body-sm text-text-secondary line-clamp-1">
                              {s.hotel.title}
                            </p>
                            {hotelHref && (
                              <Link
                                href={hotelHref}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                {isRo ? 'Vezi hotelul' : 'View hotel'}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </>
                        ) : (
                          <p className="text-body-sm text-text-muted">
                            {isRo ? 'Niciun hotel găsit pentru acest popas' : 'No hotel found for this stopover'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Day-by-day */}
          {trip.aiContent && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <h2 className="mb-4 text-h3 text-text-primary">
                {isRo ? 'Itinerariu zi cu zi' : 'Day-by-day plan'}
              </h2>
              <div className="space-y-4">
                {trip.aiContent.dayByDay.map((d) => (
                  <article key={d.day} className="rounded-lg border border-border-default p-4">
                    <header className="mb-3 flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        {d.day}
                      </span>
                      <h3 className="text-body font-semibold text-text-primary">{d.title}</h3>
                    </header>
                    <div className="space-y-2 text-body-sm">
                      <DaySlot icon={<Sun className="h-4 w-4 text-amber-500" />} label={isRo ? 'Dimineață' : 'Morning'} slot={d.morning} />
                      <DaySlot icon={<Sun className="h-4 w-4 text-orange-500" />} label={isRo ? 'După-amiază' : 'Afternoon'} slot={d.afternoon} />
                      <DaySlot icon={<Moon className="h-4 w-4 text-indigo-500" />} label={isRo ? 'Seara' : 'Evening'} slot={d.evening} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Top attractions */}
          {trip.aiContent?.topAttractions && trip.aiContent.topAttractions.length > 0 && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <h2 className="mb-4 text-h3 text-text-primary flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-500" />
                {isRo ? 'Atracții principale' : 'Top attractions'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trip.aiContent.topAttractions.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border-default p-3">
                    <p className="text-body font-semibold text-text-primary">{a.name}</p>
                    <p className="text-xs uppercase tracking-wide text-text-muted mt-0.5">
                      {a.category}
                    </p>
                    <p className="mt-1 text-body-sm text-text-secondary">{a.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Restaurants */}
          {trip.aiContent?.topRestaurants && trip.aiContent.topRestaurants.length > 0 && (
            <section className="rounded-radius-xl border border-border-default bg-surface p-6">
              <h2 className="mb-4 text-h3 text-text-primary flex items-center gap-2">
                <Utensils className="h-5 w-5 text-emerald-500" />
                {isRo ? 'Restaurante' : 'Restaurants'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trip.aiContent.topRestaurants.map((r, i) => (
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
                  <Row label={isRo ? 'Combustibil' : 'Fuel'} value={`€${trip.cost.fuel}`} />
                  <Row label={isRo ? 'Taxe drum' : 'Tolls (est.)'} value={`€${trip.cost.tolls}`} />
                </>
              ) : (
                <>
                  <Row
                    label={isRo ? 'Bilet / pers.' : 'Fare / person'}
                    value={`€${trip.cost.busFarePerPerson}`}
                  />
                  <Row
                    label={isRo ? `× ${trip.adults} pers.` : `× ${trip.adults} pax`}
                    value={`€${trip.cost.busFarePerPerson * trip.adults}`}
                  />
                </>
              )}
              <div className="mt-2 flex justify-between border-t border-border-default pt-2">
                <dt className="font-semibold text-text-primary">Total</dt>
                <dd className="text-body font-bold text-emerald-600 dark:text-emerald-400">
                  €{trip.cost.total}
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
          </section>

          {/* Destination hotel */}
          {trip.hotelDestination && (
            <HotelMiniCard
              hotel={trip.hotelDestination}
              label={isRo ? `Cazare în ${trip.destinationCity}` : `Stay in ${trip.destinationCity}`}
              href={`/${locale}/road-trip/result/${trip.id}/hotel/${encodeURIComponent(trip.hotelDestination.id)}`}
              isRo={isRo}
            />
          )}
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

function DaySlot({
  icon,
  label,
  slot,
}: {
  icon: React.ReactNode;
  label: string;
  slot: { activity: string; description: string; type: string };
}) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-text-primary">
          <span className="font-semibold">{label}:</span> {slot.activity}
        </p>
        <p className="text-text-secondary text-xs">{slot.description}</p>
      </div>
    </div>
  );
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
      {photo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={photo} alt={hotel.title} className="h-40 w-full object-cover" loading="lazy" />
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
