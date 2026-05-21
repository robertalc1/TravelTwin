'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';

/**
 * Backwards-compat redirect. The original /road-trip/result?id=X URL has been
 * replaced by /road-trip/result/[id]. Anyone landing on the old URL gets
 * forwarded to the new path.
 */
export default function LegacyRedirect() {
  return (
    <Suspense fallback={<Loading />}>
      <RedirectInner />
    </Suspense>
  );
}

function RedirectInner() {
  const router = useRouter();
  const locale = useLocale();
  const params = useSearchParams();
  const id = params.get('id');

  useEffect(() => {
    if (id) {
      router.replace(`/${locale}/road-trip/result/${id}`);
    } else {
      router.replace(`/${locale}/road-trip`);
    }
  }, [id, locale, router]);

  return <Loading />;
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );
}
