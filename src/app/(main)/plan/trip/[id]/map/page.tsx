'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  };
}

export default function TripMapPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [originCity, setOriginCity] = useState('');
  const [originCode, setOriginCode] = useState('');

  useEffect(() => {
    if (!id) return;

    // 1. trip_${id} (set by the planner for each package + by deal pages)
    const stored = sessionStorage.getItem(`trip_${id}`);
    if (stored) {
      try {
        const pkg = JSON.parse(stored) as TripPackage;
        setTrip(packageToTripDetail(pkg));
      } catch { /* ignore */ }
    } else {
      // 2. fallback to planResults
      const results = sessionStorage.getItem('planResults');
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
      const pr = sessionStorage.getItem('planResults');
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
      if (!trip) router.push(`/plan/trip/${id}`);
    }, 600);
    return () => clearTimeout(t);
  }, [id, trip, router]);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🗺️</div>
          <p className="text-text-secondary">Loading your route…</p>
        </div>
      </div>
    );
  }

  return <RouteMapView trip={trip} originCity={originCity} originCode={originCode} />;
}
