'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { TripPackage } from '@/app/api/ai/plan-trip/route';
import { TripDetail } from '@/lib/tripDetail';
import RouteMapView from '@/components/RouteMap/RouteMapView';

/**
 * Mirrors the package → TripDetail transform from the trip detail page so the
 * map page can be reached directly without having visited the trip first.
 */
function packageToTripDetail(pkg: TripPackage): TripDetail {
  const dest = pkg.destination;
  return {
    id: pkg.id,
    destinationCode: dest.iata,
    destinationCity: dest.city,
    destinationCountry: dest.country,
    destinationLat: dest.latitude,
    destinationLon: dest.longitude,
    imageId: dest.imageId,
    nights: pkg.nights,
    departureDate: pkg.flight?.departureTime?.split('T')[0] || pkg.hotel?.checkIn || '',
    returnDate: pkg.hotel?.checkOut || '',
    currency: pkg.currency,
    totalPrice: pkg.totalPrice,
    airline: pkg.flight?.airline || '',
    airlineCode: pkg.flight?.airlineCode || '',
    flightPrice: pkg.flight?.price || 0,
    departureTime: pkg.flight?.departureTime || '',
    arrivalTime: pkg.flight?.arrivalTime || '',
    duration: pkg.flight?.duration || '',
    stops: pkg.flight?.stops ?? 1,
    hotelName: pkg.hotel?.name || '',
    hotelStars: pkg.hotel?.stars || 3,
    hotelPrice: pkg.hotel?.price || 0,
    hotelPricePerNight: pkg.hotel?.pricePerNight || 0,
    hotelCheckIn: pkg.hotel?.checkIn || '',
    hotelCheckOut: pkg.hotel?.checkOut || '',
    hotelAmenities: pkg.hotel?.amenities,
    aiContent: pkg.aiContent || null,
    variantLabel: pkg.variantLabel,
    variantTheme: pkg.variantTheme,
  };
}

export default function TripMapPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const id = params?.id as string;
  const initialFocusedPlace = searchParams?.get('place') ?? null;

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [originCity, setOriginCity] = useState('');
  const [originCode, setOriginCode] = useState('');

  useEffect(() => {
    if (!id) return;

    // 1. trip_${id} — written in two shapes:
    //    - planner / homepage deal pages stash a TripPackage (nested
    //      destination.iata, flight.price, …)
    //    - the /favorites page stashes the already-flat TripDetail when the
    //      user reopens a saved trip.
    //    Detect the shape by presence of the nested `destination` object so
    //    we don't crash packageToTripDetail and bounce the user back.
    const stored = sessionStorage.getItem(`trip_${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<TripPackage> & Partial<TripDetail>;
        const looksLikePackage = parsed && typeof parsed === 'object'
          && 'destination' in parsed
          && parsed.destination
          && typeof parsed.destination === 'object';
        setTrip(looksLikePackage
          ? packageToTripDetail(parsed as TripPackage)
          : (parsed as TripDetail));
      } catch { /* ignore */ }
    } else {
      // 2. fallback to planResults
      const results = sessionStorage.getItem('planResults_v2');
      if (results) {
        try {
          const { packages } = JSON.parse(results);
          const found = packages?.find((p: TripPackage) => p.id === id);
          if (found) setTrip(packageToTripDetail(found));
        } catch { /* ignore */ }
      }
    }

    // Origin (from planner)
    try {
      const pr = sessionStorage.getItem('planResults_v2');
      if (pr) {
        const parsed: { params?: { originIata?: string; originDisplay?: string } } = JSON.parse(pr);
        setOriginCity(parsed.params?.originDisplay?.split(' (')[0] ?? '');
        setOriginCode(parsed.params?.originIata ?? '');
      }
    } catch { /* ignore */ }
  }, [id]);

  // Trip not found in sessionStorage → bounce to the trip detail page
  // (or home, for deal-prefixed ids).
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => {
      if (!trip) router.push(`/${locale}/plan/trip/${id}`);
    }, 600);
    return () => clearTimeout(t);
  }, [id, trip, router, locale]);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-float">🗺️</div>
          <p className="text-text-secondary">{locale === "ro" ? "Se încarcă traseul tău…" : "Loading your route…"}</p>
        </div>
      </div>
    );
  }

  return <RouteMapView trip={trip} originCity={originCity} originCode={originCode} initialFocusedPlace={initialFocusedPlace} />;
}
