"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { TripPackage } from "@/app/api/ai/plan-trip/route";
import { TripDetail } from "@/lib/tripDetail";
import TripDetailView from "@/components/TripDetailView";

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
    departureDate: pkg.flight?.departureTime?.split('T')[0] || '',
    returnDate: '',
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

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;

    // Try session storage first
    const stored = sessionStorage.getItem(`trip_${id}`);
    if (stored) {
      const pkg = JSON.parse(stored) as TripPackage;
      setTripDetail(packageToTripDetail(pkg));
      return;
    }

    // Fallback: look in planResults
    const results = sessionStorage.getItem("planResults");
    if (results) {
      const { packages } = JSON.parse(results);
      const found = packages?.find((p: TripPackage) => p.id === id);
      if (found) {
        setTripDetail(packageToTripDetail(found));
      } else {
        router.push("/plan/results");
      }
    } else {
      router.push("/plan");
    }
  }, [params, router]);

  if (!tripDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">✈️</div>
          <p className="text-text-secondary">Loading your itinerary...</p>
        </div>
      </div>
    );
  }

  return (
    <TripDetailView
      trip={tripDetail}
      backHref="/plan/results"
      backLabel="Back to results"
    />
  );
}
