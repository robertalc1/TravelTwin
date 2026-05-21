/* Diagnostic endpoint: verifies RAPIDAPI_KEY is configured and that
   Tripadvisor16 is reachable. Hit GET /api/debug/rapidapi to check.
   ADMIN-ONLY — returns 404 to anonymous traffic so the endpoint is
   not discoverable. */

import { NextResponse } from 'next/server';
import { searchLocations } from '@/lib/tripadvisor-client';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const apiKeyPresent = !!process.env.RAPIDAPI_KEY;
  if (!apiKeyPresent) {
    return NextResponse.json(
      { status: 'error', message: 'RAPIDAPI_KEY is not set', apiKeyPresent: false },
      { status: 500 },
    );
  }

  try {
    const sample = await searchLocations('Paris');
    return NextResponse.json({
      status: 'ok',
      apiKeyPresent: true,
      sampleCount: sample.length,
      sample: sample.slice(0, 2),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { status: 'error', message, apiKeyPresent: true },
      { status: 500 },
    );
  }
}
