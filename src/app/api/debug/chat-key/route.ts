/* TEMPORARY diagnostic — verifies GROQ_API_KEY is correctly set in the
   environment and that it is accepted by Groq. Auth-gated to logged-in
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

  const key = process.env.GROQ_API_KEY;
  const baseReport = {
    keyConfigured: !!key,
    keyLength: key?.length ?? 0,
    keyFingerprint: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : null,
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    runtime: 'vercel',
  };

  if (!key) {
    return NextResponse.json({
      ...baseReport,
      verdict: 'GROQ_API_KEY is NOT set in this Vercel environment. Set it under Project → Settings → Environment Variables, then redeploy.',
    });
  }

  // Live ping to Groq with a 1-token prompt to learn the real status code.
  let testStatus = 0;
  let testMessage = '';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'reply with the single word OK' }],
        max_tokens: 8,
        temperature: 0,
      }),
    });
    testStatus = res.status;
    const json = await res.json().catch(() => ({}));
    testMessage =
      json?.error?.message ||
      json?.choices?.[0]?.message?.content ||
      JSON.stringify(json).slice(0, 200);
  } catch (e) {
    testMessage = (e as Error).message;
  }

  let verdict = 'unknown';
  if (testStatus === 200) verdict = 'OK — the key is live and Groq accepts it. Chat should work.';
  else if (testStatus === 401) verdict = 'Groq rejected the key (401). Recreate at console.groq.com/keys and update GROQ_API_KEY in Vercel.';
  else if (testStatus === 400) verdict = 'Groq returned 400 — key is malformed or the request payload is broken.';
  else if (testStatus === 429) verdict = 'Groq rate limit hit on this key (free tier = 30 RPM). Wait a minute or upgrade.';
  else verdict = `Groq returned ${testStatus}. See testMessage for details.`;

  return NextResponse.json({
    ...baseReport,
    testStatus,
    testMessage,
    verdict,
  });
}
