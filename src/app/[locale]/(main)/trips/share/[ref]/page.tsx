"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TripDetail, resolveCoordsForCity } from "@/lib/tripDetail";
import TripDetailView from "@/components/TripDetailView";

function normalizePkg(raw: Record<string, any>): TripDetail | null { // eslint-disable-line @typescript-eslint/no-explicit-any
  // If it already looks like a TripDetail (has destinationCity + nights + totalPrice), use as-is
  if (raw.destinationCity && raw.nights != null && raw.totalPrice != null) {
    if (!raw.destinationLat || !raw.destinationLon) {
      const [lat, lon] = resolveCoordsForCity(raw.destinationCity);
      raw = { ...raw, destinationLat: lat, destinationLon: lon };
    }
    return raw as TripDetail;
  }

  // Convert nested TripPackage format (destination/flight/hotel)
  if (raw.destination || raw.flight) {
    const dest = raw.destination || {};
    const flight = raw.flight || {};
    const hotel = raw.hotel || {};
    const nights = raw.nights || 3;
    const city = dest.city || raw.destinationCity || '';
    const [lat, lon] = dest.latitude && dest.longitude
      ? [dest.latitude, dest.longitude]
      : resolveCoordsForCity(city);

    return {
      id: raw.id || 'share',
      destinationCode: dest.iata || raw.destinationCode || '',
      destinationCity: city,
      destinationCountry: dest.country || raw.destinationCountry || '',
      destinationLat: lat,
      destinationLon: lon,
      imageId: dest.imageId || raw.imageId,
      nights,
      departureDate: flight.departureTime?.split('T')[0] || '',
      returnDate: '',
      currency: raw.currency || 'EUR',
      totalPrice: raw.totalPrice || 0,
      airline: flight.airline || '',
      airlineCode: flight.airlineCode || '',
      flightPrice: flight.price || 0,
      departureTime: flight.departureTime || '',
      arrivalTime: flight.arrivalTime || '',
      duration: flight.duration || '',
      stops: flight.stops ?? 1,
      hotelName: hotel.name || '',
      hotelStars: hotel.stars || 3,
      hotelPrice: hotel.price || 0,
      hotelPricePerNight: hotel.pricePerNight || 0,
      hotelCheckIn: hotel.checkIn || '',
      hotelCheckOut: hotel.checkOut || '',
      hotelAmenities: hotel.amenities,
      aiContent: raw.aiContent || null,
    };
  }

  return null;
}

export default function TripSharePage() {
  const params = useParams();
  const bookingRef = params?.ref as string;
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingRef) { setLoading(false); return; }

    // 1. Try booking_{ref} (set by booking/simulate on confirmation)
    const stored = sessionStorage.getItem(`booking_${bookingRef}`);
    if (stored) {
      const normalized = normalizePkg(JSON.parse(stored));
      setTripDetail(normalized);
      setLoading(false);
      return;
    }

    // 2. Fallback: bookingTrip (set by TripDetailView when clicking "Book This Trip")
    const bt = sessionStorage.getItem('bookingTrip');
    if (bt) {
      const normalized = normalizePkg(JSON.parse(bt));
      setTripDetail(normalized);
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [bookingRef]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">✈️</div>
          <p className="text-text-secondary">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!tripDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Itinerary not found</h2>
          <p className="text-text-secondary mb-2">
            Reference: <span className="font-mono font-bold text-primary-500">{bookingRef}</span>
          </p>
          <p className="text-sm text-text-muted mb-6">
            This shared itinerary may have expired or is not available in this browser.
          </p>
          <Link href="/plan" className="rounded-xl bg-primary-500 px-6 py-3 font-bold text-white hover:bg-primary-600">
            Plan a New Trip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TripDetailView
      trip={tripDetail}
      backHref="/plan"
      backLabel="Plan a new trip"
      isSharedView={true}
    />
  );
}
