/* TEMPORARY diagnostic — verifies GEMINI_API_KEY is correctly set in the
   environment and that it is accepted by Gemini. Auth-gated to logged-in
   users only (acceptable for this short diagnostic session — will be
   removed once the chat issue is resolved). */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  // Require login. We're not enforcing ADMIN_EMAIL here so the owner can
  // hit this from any signed-in browser session while debugging.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const key = process.env.GEMINI_API_KEY;
  const baseReport = {
    keyConfigured: !!key,
    keyLength: key?.length ?? 0,
    keyFingerprint: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : null,
    runtime: 'vercel',
  };

  if (!key) {
    return NextResponse.json({
      ...baseReport,
      verdict: 'GEMINI_API_KEY is NOT set in this Vercel environment. Set it under Project → Settings → Environment Variables, then redeploy.',
    });
  }

  // Live ping to Gemini with a 1-token prompt to learn the real status code.
  let testStatus = 0;
  let testMessage = '';
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'reply with the single word OK' }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
      }
    );
    testStatus = res.status;
    const json = await res.json().catch(() => ({}));
    testMessage =
      json?.error?.message ||
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      JSON.stringify(json).slice(0, 200);
  } catch (e) {
    testMessage = (e as Error).message;
  }

  let verdict = 'unknown';
  if (testStatus === 200) verdict = 'OK — the key is live and Gemini accepts it. Chat should work.';
  else if (testStatus === 403) verdict = 'Gemini refused: key likely revoked/leaked. Create a new key and update GEMINI_API_KEY in Vercel.';
  else if (testStatus === 400) verdict = 'Gemini returned 400 — key is malformed or the request payload is broken.';
  else if (testStatus === 429) verdict = 'Gemini quota exhausted on this key.';
  else verdict = `Gemini returned ${testStatus}. See testMessage for details.`;

  return NextResponse.json({
    ...baseReport,
    testStatus,
    testMessage,
    verdict,
  });
}
