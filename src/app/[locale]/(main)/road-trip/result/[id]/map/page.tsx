'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import RoadTripMapView from '@/components/RoadTripMap/RoadTripMapView';
import type { RoadTripData } from '@/lib/roadTrip';

export default function RoadTripMapPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const id = params?.id as string;
  const initialFocusedPlace = searchParams?.get('place') ?? null;

  const [trip, setTrip] = useState<RoadTripData | null>(null);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = sessionStorage.getItem(`roadTrip_${id}`);
      if (raw) setTrip(JSON.parse(raw) as RoadTripData);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => {
      if (!trip) router.push(`/${locale}/road-trip/result/${id}`);
    }, 600);
    return () => clearTimeout(t);
  }, [id, trip, router, locale]);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🗺️</div>
          <p className="text-text-secondary">
            {locale === 'ro' ? 'Se încarcă harta…' : 'Loading the map…'}
          </p>
        </div>
      </div>
    );
  }

  return <RoadTripMapView trip={trip} initialFocusedPlace={initialFocusedPlace} />;
}
