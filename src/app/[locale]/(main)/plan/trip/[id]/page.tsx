"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
    variantLabel: pkg.variantLabel,
    variantTheme: pkg.variantTheme,
  };
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === "ro";
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);

  const id = params?.id as string;
  const isHomepageDeal = id?.startsWith('deal-');
  const backHref = isHomepageDeal ? `/${locale}` : `/${locale}/plan/results`;
  const backLabel = isHomepageDeal
    ? (isRo ? 'Înapoi acasă' : 'Back to home')
    : (isRo ? 'Înapoi la rezultate' : 'Back to results');

  useEffect(() => {
    if (!id) return;

    // 1. Try trip_${id} first. Two writers stash here with DIFFERENT shapes:
    //   - homepage + planner write the raw TripPackage (nested: destination.iata)
    //   - favorites page writes the already-flattened TripDetail (destinationCode at root)
    // Detect by presence of the nested `destination` object so re-opening a
    // saved favorite doesn't crash packageToTripDetail and bounce to /.
    const stored = sessionStorage.getItem(`trip_${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<TripPackage> & Partial<TripDetail>;
        const looksLikePackage = parsed && typeof parsed === 'object'
          && 'destination' in parsed
          && parsed.destination
          && typeof parsed.destination === 'object';
        if (looksLikePackage) {
          setTripDetail(packageToTripDetail(parsed as TripPackage));
        } else {
          setTripDetail(parsed as TripDetail);
        }
        return;
      } catch { /* ignore parse error, fall through */ }
    }

    // 2. Fallback: look in planResults (only populated by planner, not homepage)
    const results = sessionStorage.getItem("planResults_v2");
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
      router.push(`/${locale}`);
    } else {
      router.push(`/${locale}/plan`);
    }
  }, [id, router, locale]);

  if (!tripDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">✈️</div>
          <p className="text-text-secondary">{isRo ? "Se încarcă itinerariul tău..." : "Loading your itinerary..."}</p>
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
