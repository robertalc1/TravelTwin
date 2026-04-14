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

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);

  const id = params?.id as string;
  const isHomepageDeal = id?.startsWith('deal-');
  const backHref = isHomepageDeal ? '/' : '/plan/results';
  const backLabel = isHomepageDeal ? 'Back to home' : 'Back to results';

  useEffect(() => {
    if (!id) return;

    // 1. Try trip_${id} first (works for both homepage deals and planner packages)
    const stored = sessionStorage.getItem(`trip_${id}`);
    if (stored) {
      try {
        const pkg = JSON.parse(stored) as TripPackage;
        setTripDetail(packageToTripDetail(pkg));
        return;
      } catch { /* ignore parse error, fall through */ }
    }

    // 2. Fallback: look in planResults (only populated by planner, not homepage)
    const results = sessionStorage.getItem("planResults");
    if (results) {
      try {
        const { packages } = JSON.parse(results);
        const found = packages?.find((p: TripPackage) => p.id === id);
        if (found) {
          setTripDetail(packageToTripDetail(found));
          return;
        }
      } catch { /* ignore parse error */ }
    }

    // 3. Not found — redirect based on source
    if (id.startsWith('deal-')) {
      router.push('/');
    } else {
      router.push('/plan');
    }
  }, [id, router]);

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
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
