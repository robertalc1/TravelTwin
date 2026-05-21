'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { AlertCircle, Loader2 } from 'lucide-react';
import RoadTripDetailView from '@/components/RoadTripDetailView';
import type { RoadTripData } from '@/lib/roadTrip';

export default function RoadTripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = params?.id as string;
  const isRo = locale === 'ro';

  const [trip, setTrip] = useState<RoadTripData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = sessionStorage.getItem(`roadTrip_${id}`);
      if (!raw) {
        setError(
          isRo
            ? 'Datele traseului au expirat. Generează din nou.'
            : 'Road trip data expired. Please re-generate.',
        );
        return;
      }
      setTrip(JSON.parse(raw) as RoadTripData);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, isRo]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <p className="text-body text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/road-trip`)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          {isRo ? 'Înapoi la wizard' : 'Back to wizard'}
        </button>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-text-secondary">{isRo ? 'Se încarcă...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return <RoadTripDetailView trip={trip} />;
}
