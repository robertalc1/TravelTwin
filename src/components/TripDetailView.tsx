'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Plane, Hotel, ArrowLeft, MapPin, Star, Calendar,
  Coffee, Sun, Moon, Utensils, Camera,
  Lightbulb, Navigation, DollarSign, Share2,
  X as XClose, Copy, Check,
} from 'lucide-react';
import type { TripDetail } from '@/lib/tripDetail';
import { resolveHeroUrl } from '@/lib/tripDetail';
import { buildLegsFromTrip, buildStopsFromTrip } from '@/lib/itineraryHelpers';
import AttractionPhotos from '@/components/AttractionPhotos';
import DestinationVideos from '@/components/DestinationVideos';
import ItinerarySection from '@/components/itinerary/ItinerarySection';
import { WeatherForecastCard } from '@/components/Weather/WeatherForecastCard';
import { useUser } from '@/hooks/useUser';
import HotelsTab from '@/components/TripDetail/HotelsTab';
import TransfersTab from '@/components/TripDetail/TransfersTab';
import PriceBreakdown from '@/components/TripDetail/PriceBreakdown';
import type { HotelOfferData } from '@/components/Hotels/HotelCard';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';

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
  const { profile } = useUser();
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [originCity, setOriginCity] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moreOptionsTab, setMoreOptionsTab] = useState<'hotels' | 'transfers'>('hotels');
  const [extraHotel, setExtraHotel] = useState<HotelOfferData | null>(null);
  const [extraTransfer, setExtraTransfer] = useState<TransferOffer | null>(null);

  const initTripPricing = useTripPricing((s) => s.initTrip);
  const pricingTotal = useTripPricing((s) => s.breakdown.flightPrice + s.breakdown.hotelPrice + s.breakdown.transferPrice);

  // Seed flight price into the dynamic pricing store on trip mount.
  useEffect(() => {
    if (trip?.id) {
      initTripPricing(trip.id, trip.flightPrice || 0, trip.currency || 'EUR');
    }
  }, [trip.id, trip.flightPrice, trip.currency, initTripPricing]);

  // Read origin from sessionStorage (populated by AI planner)
  useEffect(() => {
    try {
      const pr = sessionStorage.getItem('planResults');
      if (pr) {
        const parsed: { params?: { originIata?: string; originDisplay?: string } } = JSON.parse(pr);
        setOriginCity(parsed.params?.originDisplay?.split(' (')[0] ?? '');
        setOriginCode(parsed.params?.originIata ?? '');
      }
    } catch { /* ignore */ }
  }, []);

  const formatCurrency = useCurrencyStore((s) => s.format);
  const src = trip.currency || 'EUR';

  const heroUrl = resolveHeroUrl(trip);
  const ai = trip.aiContent;
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

        {/* ── Action buttons top-right ── */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label="Share trip"
          >
            <Share2 className="h-4 w-4 text-white" />
          </button>
        </div>

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

      {/* ── Share Modal ── */}
      {showShare && (
        <ShareModal
          title={`${trip.nights} days - ${trip.destinationCountry}`}
          onClose={() => { setShowShare(false); setCopied(false); }}
          copied={copied}
          onCopy={() => {
            navigator.clipboard.writeText(window.location.href).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }).catch(() => {});
          }}
        />
      )}

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

            {/* Itinerary — new Kiwi-inspired design */}
            <ItinerarySection
              legs={buildLegsFromTrip(trip, originCity, originCode)}
              stops={buildStopsFromTrip(
                trip,
                originCity,
                buildLegsFromTrip(trip, originCity, originCode),
              )}
            />

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
                    <p className="font-bold text-primary-500">{formatCurrency(trip.hotelPricePerNight, src)}/night</p>
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

            {/* More options: Hotels / Transfers */}
            {trip.destinationCode && trip.hotelCheckIn && trip.hotelCheckOut && (
              <section>
                <h2 className="text-xl font-bold text-secondary-500 mb-4">More options</h2>
                <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden">
                  <div className="flex border-b border-neutral-100 dark:border-border-default">
                    <button
                      type="button"
                      onClick={() => setMoreOptionsTab('hotels')}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                        moreOptionsTab === 'hotels'
                          ? 'text-primary-500 border-b-2 border-primary-500 bg-primary-50/40 dark:bg-primary-900/10'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      🏨 Hotels in {trip.destinationCity}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoreOptionsTab('transfers')}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                        moreOptionsTab === 'transfers'
                          ? 'text-primary-500 border-b-2 border-primary-500 bg-primary-50/40 dark:bg-primary-900/10'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      🚗 Airport Transfers
                    </button>
                  </div>
                  <div className="p-4 sm:p-5">
                    {moreOptionsTab === 'hotels' ? (
                      <HotelsTab
                        destinationCityCode={trip.destinationCode}
                        checkInDate={trip.hotelCheckIn}
                        checkOutDate={trip.hotelCheckOut}
                        adults={1}
                        onHotelSelect={setExtraHotel}
                        selectedHotel={extraHotel}
                      />
                    ) : (
                      <TransfersTab
                        startLocationCode={trip.destinationCode}
                        endLatitude={trip.destinationLat}
                        endLongitude={trip.destinationLon}
                        endCityName={trip.destinationCity}
                        startDateTime={
                          trip.arrivalTime ||
                          (trip.hotelCheckIn ? `${trip.hotelCheckIn}T12:00:00` : new Date().toISOString().slice(0, 19))
                        }
                        adults={1}
                        onTransferSelect={setExtraTransfer}
                        selectedTransferId={extraTransfer?.id}
                      />
                    )}
                  </div>
                </div>
              </section>
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

            {/* Weather forecast (when dates and coords are available) */}
            {trip.departureDate && trip.destinationLat && trip.destinationLon && (
              <section>
                <WeatherForecastCard
                  lat={trip.destinationLat}
                  lon={trip.destinationLon}
                  startDate={trip.departureDate}
                  endDate={trip.returnDate || trip.departureDate}
                  cityName={trip.destinationCity}
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
                        {value > 0 ? formatCurrency(value, src) : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 dark:bg-surface-elevated">
                    <span className="font-bold text-text-primary">Total</span>
                    <span className="font-extrabold text-lg text-primary-500">
                      {formatCurrency(trip.totalPrice, src)}
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
                    <span className="font-bold text-primary-500">{formatCurrency(trip.totalPrice, src)}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Booking sidebar — dynamic PriceBreakdown + meta */
              <div className="sticky top-24 space-y-4">
                <PriceBreakdown onBook={handleBook} nights={trip.nights} />

                <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5 shadow-sm space-y-3 text-sm">
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
                  {pricingTotal > 0 && trip.totalPrice > 0 && (
                    <div className="flex justify-between text-xs pt-2 border-t border-neutral-100 dark:border-border-default">
                      <span className="text-text-muted">Original package</span>
                      <span className="text-text-muted">{formatCurrency(trip.totalPrice, src)}</span>
                    </div>
                  )}
                </div>

                {ai?.estimatedDailyExpenses && (
                  <div className="bg-neutral-50 dark:bg-surface-elevated rounded-xl p-4 border border-neutral-200 dark:border-border-default">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                      Est. daily expenses
                    </p>
                    {Object.entries(ai.estimatedDailyExpenses).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted capitalize">{key}</span>
                        <span className="font-medium">{formatCurrency(val as number, src)}/day</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-text-muted text-center px-2">
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

// ─── Share Modal ──────────────────────────────────────────────────────────────
interface ShareModalProps {
  title: string;
  onClose: () => void;
  copied: boolean;
  onCopy: () => void;
}

function ShareModal({ title, onClose, copied, onCopy }: ShareModalProps) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const socials = [
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bg: '#1877F2',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${text}%20${encodedUrl}`,
      bg: '#25D366',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      ),
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      bg: '#0A66C2',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      ),
    },
    {
      label: 'X',
      href: `https://x.com/intent/tweet?text=${text}&url=${encodedUrl}`,
      bg: '#000000',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Email',
      href: `mailto:?subject=${text}&body=${encodedUrl}`,
      bg: '#EA4335',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors"
          aria-label="Close"
        >
          <XClose className="h-4 w-4" />
        </button>

        <h3 className="text-center text-lg font-bold text-text-primary mb-6">Share</h3>

        <div className="flex justify-center gap-4 mb-6">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-12 w-12 items-center justify-center rounded-full transition-opacity hover:opacity-80"
              style={{ backgroundColor: s.bg }}
            >
              {s.icon}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-border-default bg-neutral-50 dark:bg-surface-elevated px-3 py-2">
          <span className="flex-1 truncate text-sm text-text-secondary">{url}</span>
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
