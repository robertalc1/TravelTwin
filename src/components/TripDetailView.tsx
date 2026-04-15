'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Plane, Hotel, ArrowLeft, MapPin, Star, Calendar,
  Coffee, Sun, Moon, Utensils, UtensilsCrossed, Camera,
  ExternalLink, Lightbulb, Navigation, Shield, DollarSign,
} from 'lucide-react';
import type { TripDetail } from '@/lib/tripDetail';
import { resolveHeroUrl } from '@/lib/tripDetail';
import AttractionPhotos from '@/components/AttractionPhotos';
import DestinationVideos from '@/components/DestinationVideos';

const InteractiveMap = dynamic(
  () => import('@/components/InteractiveMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-2xl bg-neutral-100 dark:bg-surface-elevated animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-[3px] border-neutral-200 border-t-primary-500 animate-spin" />
        <p className="text-sm text-text-muted">Loading map...</p>
      </div>
    ),
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso.slice(11, 16) || ''; }
}

function formatDuration(iso: string): string {
  if (!iso) return '';
  const h = iso.match(/(\d+)H/)?.[1];
  const m = iso.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
}

const timeIcons: Record<string, React.ElementType> = {
  transport: Plane,
  sightseeing: Camera,
  dining: Utensils,
  accommodation: Hotel,
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  trip: TripDetail;
  backHref?: string;
  backLabel?: string;
  isSharedView?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TripDetailView({
  trip,
  backHref = '/',
  backLabel = 'Back',
  isSharedView = false,
}: Props) {
  const router = useRouter();
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

  const heroUrl = resolveHeroUrl(trip);
  const ai = trip.aiContent;
  const sym = trip.currency === 'EUR' ? '€' : trip.currency === 'USD' ? '$' : `${trip.currency} `;
  const activitiesEstimate = ai?.estimatedDailyExpenses
    ? (ai.estimatedDailyExpenses.food + ai.estimatedDailyExpenses.transport + ai.estimatedDailyExpenses.activities) * trip.nights
    : 0;

  function handleBook() {
    // Save full TripDetail object so booking/simulate can read all flat fields correctly
    sessionStorage.setItem('bookingTrip', JSON.stringify(trip));
    // Save meta so booking page knows the correct back href + origin city
    try {
      let originCity = '';
      const pr = sessionStorage.getItem('planResults');
      if (pr) {
        const parsed = JSON.parse(pr);
        originCity = parsed.params?.originDisplay?.split(' (')[0] || parsed.params?.originIata || '';
      }
      sessionStorage.setItem('currentBookingMeta', JSON.stringify({
        backHref: window.location.pathname,
        originCity,
      }));
    } catch { /* ignore */ }
    router.push('/booking/simulate');
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">

      {/* ── Hero ── */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={heroUrl}
          alt={trip.destinationCity}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=700&fit=crop&q=85';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white">
            {trip.nights} nights in {trip.destinationCity}, {trip.destinationCountry}
          </h1>
          {trip.departureTime && (
            <p className="text-white/80 mt-2 text-lg">
              {formatTime(trip.departureTime)} – {formatTime(trip.arrivalTime)}
              {trip.duration ? ` · ${formatDuration(trip.duration)}` : ''}
              {` · ${trip.nights} nights`}
            </p>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Left column (2/3) ── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Your Trip */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-3">Your Trip</h2>
              <p className="text-text-secondary leading-relaxed">
                {ai?.description ||
                  `Discover the magic of ${trip.destinationCity} on this perfectly curated ${trip.nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${trip.destinationCountry}'s culture and beauty.`}
              </p>
              {ai?.whyThisTrip && (
                <p className="mt-2 text-sm text-primary-600 dark:text-primary-400 italic">{ai.whyThisTrip}</p>
              )}
            </section>

            {/* Destination Videos */}
            {trip.destinationCity && (
              <DestinationVideos
                city={trip.destinationCity}
                country={trip.destinationCountry}
              />
            )}

            {/* Flight card */}
            {trip.airline && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-4">Your Itinerary</h2>
                <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-secondary-500">Outbound Flight</p>
                      <p className="text-sm text-text-muted">
                        {trip.airline} · {trip.stops === 0 ? 'Direct' : `${trip.stops} stop${trip.stops > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    {trip.airlineCode && (
                      <img
                        src={`https://pics.avs.io/100/40/${trip.airlineCode}.png`}
                        alt={trip.airline}
                        className="ml-auto h-8 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-secondary-500">{formatTime(trip.departureTime)}</p>
                      <p className="text-text-muted text-xs">Departure</p>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                      <span className="text-xs text-text-muted whitespace-nowrap">{formatDuration(trip.duration)}</span>
                      <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-secondary-500">{formatTime(trip.arrivalTime)}</p>
                      <p className="text-text-muted text-xs">{trip.destinationCode} · {trip.destinationCity}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Hotel card */}
            {trip.hotelName && (
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-50 dark:bg-secondary-900/20 text-secondary-500">
                    <Hotel className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-secondary-500">{trip.hotelName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: trip.hotelStars }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-xs text-text-muted ml-1">{trip.hotelStars} stars</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary-500">{sym}{trip.hotelPricePerNight}/night</p>
                    <p className="text-xs text-text-muted">{trip.nights} nights total</p>
                  </div>
                </div>
                {trip.hotelCheckIn && (
                  <div className="flex flex-wrap gap-4 mt-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Check-in: {trip.hotelCheckIn}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Check-out: {trip.hotelCheckOut}
                    </span>
                  </div>
                )}
                {trip.hotelAmenities && trip.hotelAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {trip.hotelAmenities.map((a) => (
                      <span key={a} className="rounded-full bg-neutral-100 dark:bg-surface-elevated px-2.5 py-0.5 text-xs text-text-secondary">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Day-by-Day Plan */}
            {ai?.dayByDay && ai.dayByDay.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-6">Day-by-Day Plan</h2>
                <div className="space-y-4">
                  {ai.dayByDay.map((day) => {
                    const MorningIcon = timeIcons[day.morning?.type] ?? MapPin;
                    const AfternoonIcon = timeIcons[day.afternoon?.type] ?? MapPin;
                    const EveningIcon = timeIcons[day.evening?.type] ?? MapPin;
                    return (
                      <div
                        key={day.day}
                        className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden"
                      >
                        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-3">
                          <h3 className="font-bold text-white">Day {day.day}: {day.title}</h3>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-border-default">
                          {[
                            { label: 'Morning', icon: Coffee, slot: day.morning },
                            { label: 'Afternoon', icon: Sun, slot: day.afternoon },
                            { label: 'Evening', icon: Moon, slot: day.evening },
                          ].map(({ label, icon: TimeIcon, slot }) => (
                            <div key={label} className="flex items-start gap-4 px-5 py-4">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-surface-elevated text-text-secondary shrink-0 mt-0.5">
                                <TimeIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
                                <p className="font-semibold text-secondary-500 text-sm">{slot?.activity}</p>
                                <p className="text-xs text-text-secondary mt-0.5">{slot?.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Top Attractions */}
            {ai?.topAttractions && ai.topAttractions.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-4">Top Attractions</h2>
                <AttractionPhotos
                  names={ai.topAttractions.map((a) => a.name)}
                  city={trip.destinationCity}
                  descriptions={Object.fromEntries(ai.topAttractions.map((a) => [a.name, a.description]))}
                  onSelectPlace={setSelectedPlace}
                  selectedPlace={selectedPlace}
                />
              </section>
            )}

            {/* Explore the City — Interactive Map */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary-500">Explore the City</h2>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    trip.destinationCity + (ai?.topAttractions?.[0]?.name ? ' ' + ai.topAttractions[0].name : ''),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Open in Google Maps
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
                {/* Map (60%) */}
                <div className="lg:col-span-3 space-y-2 lg:sticky lg:top-24">
                  <InteractiveMap
                    centerLat={trip.destinationLat}
                    centerLon={trip.destinationLon}
                    cityName={trip.destinationCity}
                    attractions={ai?.topAttractions ?? []}
                    restaurants={ai?.topRestaurants ?? []}
                    cafes={ai?.topCafes ?? []}
                    selectedPlace={selectedPlace}
                    onSelectPlace={setSelectedPlace}
                  />
                  <p className="text-xs text-text-muted text-center">
                    {trip.destinationCity}, {trip.destinationCountry} ·{' '}
                    {trip.destinationLat.toFixed(4)}°N, {trip.destinationLon.toFixed(4)}°E
                  </p>
                </div>

                {/* Place list (40%) */}
                <div className="lg:col-span-2 max-h-[500px] overflow-y-auto space-y-4 pr-0.5">
                  {ai?.topAttractions && ai.topAttractions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-neutral-50 dark:bg-background py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Attractions</span>
                      </div>
                      <div className="space-y-1.5">
                        {ai.topAttractions.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedPlace(selectedPlace === a.name ? null : a.name)}
                            className={`relative w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                              selectedPlace === a.name
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200'
                                : 'border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300 hover:bg-primary-50/50'
                            }`}
                          >
                            <p className="font-semibold text-secondary-500 text-sm pr-6">{a.name}</p>
                            <p className="text-xs text-text-muted capitalize mt-0.5">{a.category}</p>
                            <MapPin className={`absolute bottom-2.5 right-2.5 h-3.5 w-3.5 transition-all ${
                              selectedPlace === a.name ? 'text-primary-500 opacity-100' : 'text-text-muted opacity-0 group-hover:opacity-50'
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ai?.topRestaurants && ai.topRestaurants.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-neutral-50 dark:bg-background py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Restaurants</span>
                      </div>
                      <div className="space-y-1.5">
                        {ai.topRestaurants.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedPlace(selectedPlace === r.name ? null : r.name)}
                            className={`relative w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                              selectedPlace === r.name
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200'
                                : 'border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300 hover:bg-primary-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between pr-6">
                              <p className="font-semibold text-secondary-500 text-sm">{r.name}</p>
                              <span className="text-xs font-bold text-green-600 shrink-0">{r.priceRange}</span>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">{r.cuisine}</p>
                            <MapPin className={`absolute bottom-2.5 right-2.5 h-3.5 w-3.5 transition-all ${
                              selectedPlace === r.name ? 'text-primary-500 opacity-100' : 'text-text-muted opacity-0 group-hover:opacity-50'
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ai?.topCafes && ai.topCafes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-neutral-50 dark:bg-background py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Cafes</span>
                      </div>
                      <div className="space-y-1.5">
                        {ai.topCafes.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedPlace(selectedPlace === c.name ? null : c.name)}
                            className={`relative w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                              selectedPlace === c.name
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200'
                                : 'border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300 hover:bg-primary-50/50'
                            }`}
                          >
                            <p className="font-semibold text-secondary-500 text-sm pr-6">{c.name}</p>
                            <p className="text-xs text-text-muted mt-0.5">{c.specialty}</p>
                            <MapPin className={`absolute bottom-2.5 right-2.5 h-3.5 w-3.5 transition-all ${
                              selectedPlace === c.name ? 'text-primary-500 opacity-100' : 'text-text-muted opacity-0 group-hover:opacity-50'
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Cost Breakdown */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-4">Cost Breakdown</h2>
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden">
                <div className="divide-y divide-neutral-100 dark:divide-border-default">
                  {[
                    { label: 'Roundtrip flight', icon: Plane, value: trip.flightPrice },
                    { label: `Hotel · ${trip.nights} nights`, icon: Hotel, value: trip.hotelPrice },
                    ...(activitiesEstimate > 0 ? [{ label: 'Est. activities & food', icon: DollarSign, value: activitiesEstimate }] : []),
                  ].map(({ label, icon: Icon, value }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3.5 text-sm">
                      <span className="flex items-center gap-2 text-text-secondary">
                        <Icon className="h-4 w-4" /> {label}
                      </span>
                      <span className="font-semibold text-text-primary">
                        {value > 0 ? `${sym}${Math.round(value).toLocaleString()}` : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 dark:bg-surface-elevated">
                    <span className="font-bold text-text-primary">Total</span>
                    <span className="font-extrabold text-lg text-primary-500">
                      {sym}{trip.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Local Tips */}
            {ai?.localTips && ai.localTips.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-4">Local Tips</h2>
                <div className="space-y-3">
                  {ai.localTips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 bg-white dark:bg-surface rounded-xl border border-neutral-200 dark:border-border-default p-4"
                    >
                      <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-text-secondary">{tip}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Right column: booking card or shared banner ── */}
          <aside className="lg:col-span-1">
            {isSharedView ? (
              /* Shared view banner */
              <div className="sticky top-24 space-y-4">
                <div className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-2xl border border-primary-200 dark:border-primary-800/40 p-6 space-y-4">
                  <div className="text-center">
                    <div className="text-3xl mb-3">✈️</div>
                    <h3 className="font-bold text-secondary-500 mb-1">Planning a similar trip?</h3>
                    <p className="text-sm text-text-secondary">Let our AI find you the perfect package from Bucharest.</p>
                  </div>
                  <Link
                    href="/plan"
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary-500 px-6 py-4 font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
                  >
                    Start Planning Here →
                  </Link>
                  <p className="text-xs text-text-muted text-center">Free · No account required</p>
                </div>
                <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5 text-sm space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary flex items-center gap-2"><Calendar className="h-4 w-4" /> Duration</span>
                    <span className="font-semibold">{trip.nights} nights</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary flex items-center gap-2"><MapPin className="h-4 w-4" /> Destination</span>
                    <span className="font-semibold">{trip.destinationCity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Est. price</span>
                    <span className="font-bold text-primary-500">{sym}{trip.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Booking card */
              <div className="sticky top-24 bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6 shadow-md space-y-5">
                <h3 className="font-bold text-lg text-secondary-500">Price Summary</h3>

                <div className="text-center py-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
                  <p className="text-xs text-text-muted mb-1">Total price</p>
                  <p className="text-4xl font-extrabold text-primary-500">
                    {sym}{trip.totalPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted mt-1">{trip.nights} nights · flight + hotel</p>
                </div>

                <div className="space-y-3 text-sm">
                  {trip.flightPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2 text-text-secondary">
                        <Plane className="h-4 w-4" /> Roundtrip flight
                      </span>
                      <span className="font-semibold">{sym}{Math.round(trip.flightPrice).toLocaleString()}</span>
                    </div>
                  )}
                  {trip.hotelPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2 text-text-secondary">
                        <Hotel className="h-4 w-4" /> Hotel ({trip.nights} nights)
                      </span>
                      <span className="font-semibold">{sym}{Math.round(trip.hotelPrice).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <Calendar className="h-4 w-4" /> Duration
                    </span>
                    <span className="font-semibold">{trip.nights} nights</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <MapPin className="h-4 w-4" /> Destination
                    </span>
                    <span className="font-semibold">{trip.destinationCity}</span>
                  </div>
                </div>

                {ai?.estimatedDailyExpenses && (
                  <div className="bg-neutral-50 dark:bg-surface-elevated rounded-xl p-4">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                      Est. daily expenses
                    </p>
                    {Object.entries(ai.estimatedDailyExpenses).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted capitalize">{key}</span>
                        <span className="font-medium">€{val}/day</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleBook}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary-500 px-6 py-4 font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
                >
                  Book This Trip <ExternalLink className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 text-xs text-text-muted justify-center">
                  <Shield className="h-3.5 w-3.5 text-green-500" /> Free cancellation within 24h
                </div>
                <p className="text-xs text-text-muted text-center">
                  Prices shown are estimates. Final price may vary.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
