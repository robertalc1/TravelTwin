import { NextRequest, NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/cache";

export interface VisaInfo {
  visaRequired: boolean;
  visaType: "visa-free" | "e-visa" | "visa-on-arrival" | "embassy-visa";
  maxStayDays: number;
  processingTime: string;
  costEur: number | null;
  documents: string[];
  importantNotes: string[];
  disclaimer: string;
}

const FALLBACK: VisaInfo = {
  visaRequired: false,
  visaType: "visa-free",
  maxStayDays: 90,
  processingTime: "n/a",
  costEur: null,
  documents: ["Valid passport with at least 6 months validity", "Return ticket"],
  importantNotes: [
    "AI service unavailable — falling back to a generic short-stay tourism profile.",
    "Always verify with the destination country's official embassy before travel.",
  ],
  disclaimer: "Verify with official embassy sources before booking.",
};

/**
 * POST /api/ai/visa-check
 * Body: { nationality: string, country: string, nights: number }
 *
 * Returns a structured visa requirements profile produced by Claude.
 * Cached 24h in api_cache to keep cost predictable.
 */
export async function POST(req: NextRequest) {
  try {
    const { nationality, country, nights } = await req.json();
    if (!nationality || !country) {
      return NextResponse.json({ error: "nationality and country are required" }, { status: 400 });
    }

    const cacheKey = `visa:${String(nationality).toLowerCase()}:${String(country).toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...(cached.data as VisaInfo), source: "cached" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ...FALLBACK, source: "fallback" });
    }

    const prompt = `You are an expert in immigration and visa policy. A traveler with ${nationality} citizenship plans tourism in ${country} for ${nights ?? 7} nights.

Respond ONLY with valid JSON, no extra text, no markdown:
{
  "visaRequired": true | false,
  "visaType": "visa-free" | "e-visa" | "visa-on-arrival" | "embassy-visa",
  "maxStayDays": <number>,
  "processingTime": "<string e.g. 'instant' or '5-10 business days'>",
  "costEur": <number or null>,
  "documents": ["string", "string", ...],
  "importantNotes": ["string", ...],
  "disclaimer": "Always confirm with the official embassy before travel."
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json({ ...FALLBACK, source: "fallback" });
    }

    const aiData = await aiRes.json();
    const text: string = aiData.content?.[0]?.text ?? "";

    let parsed: VisaInfo;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ ...FALLBACK, source: "fallback" });
    }

    await setCache(cacheKey, parsed, 60 * 24); // 24h
    return NextResponse.json({ ...parsed, source: "live" });
  } catch (e) {
    console.error("[visa-check]", e);
    return NextResponse.json({ ...FALLBACK, source: "fallback" });
  }
}
