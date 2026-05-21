import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCached } from '@/lib/cache';
import { getCityFromIata } from '@/lib/iataMapping';
import type { TripPackage } from '@/app/api/ai/plan-trip/route';

export type ChatFlight = {
  id: string;
  airline: string;
  airlineCode: string;
  price: number;
  currency: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  departureDate: string;
};

export type ChatHotel = {
  id: string;
  name: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  city: string;
  nights: number;
  checkIn: string;
  checkOut: string;
  roomType: string;
};

export type ChatDeal = {
  id: string;
  destination: string;
  city: string;
  country: string;
  days: number;
  badge?: string;
  isDirect: boolean;
  departureDate: string;
  returnDate: string;
  originCity: string;
  price: number;
  originalPrice: number;
  currency: string;
};

const BASE_SYSTEM_PROMPT = `You are TravelTwin AI — the live in-app concierge for TravelTwin, an AI-powered trip-planning platform. You are NOT a generic chatbot. You ONLY help users with travel inside this app.

WHAT THIS APP OFFERS:
- Live flights and hotels (real prices via Amadeus + TripAdvisor).
- AI Trip Planner wizard at /plan that builds 3 ranked packages (flight + hotel + day-by-day itinerary) from origin + budget + style.
- A rotating list of 30 curated deal packages on the homepage, refreshed periodically.
- Destination guides, restaurants, attractions, visa info, weather, route maps.
- Booking simulator at /booking/simulate.

ALWAYS DO:
1. Call getCurrentDeals FIRST when the user asks about deals/offers/recommendations/"what's available" — these are the actual offers visible on their homepage right now. Cite them by city + price + ID.
2. Call searchFlights / searchHotels for specific routes or cities. Never invent prices, airlines, or availability.
3. Match the user's language (English or Romanian based on locale).
4. End each offer recommendation with a clear next step: "Open this deal", "See more options", or "Plan a custom trip at /plan".
5. Be SHORT — under 120 words unless drafting an itinerary.

OUT OF SCOPE (politely decline + redirect):
- General knowledge ("what's the capital of X", "tell me a joke", coding, math, news, weather outside travel) → 1 short sentence: "I only help with travel on TravelTwin — want me to find you a deal or plan a trip?"
- Other travel sites / competitors → never compare or mention them.
- Personal/medical/legal advice → decline + offer travel help.

TONE:
- Warm, expert, concise — like a well-traveled friend, not corporate.
- Max 1 emoji per message. No filler.
- Quote prices in the currency the tools return.`;

const TOOL_DECLARATIONS = {
  functionDeclarations: [
    {
      name: 'searchFlights',
      description:
        'Search for real-time flight offers between two airports. Use when the user asks about flights, prices, or travel between cities.',
      parameters: {
        type: 'OBJECT',
        properties: {
          origin: { type: 'STRING', description: 'Origin airport IATA code (e.g., OTP, CDG, LHR)' },
          destination: { type: 'STRING', description: 'Destination airport IATA code (e.g., BCN, IST, DXB)' },
          departureDate: { type: 'STRING', description: 'Departure date in YYYY-MM-DD format' },
          returnDate: { type: 'STRING', description: 'Optional return date in YYYY-MM-DD format' },
        },
        required: ['origin', 'destination', 'departureDate'],
      },
    },
    {
      name: 'searchHotels',
      description:
        'Search for hotel availability and prices in a city. Use when the user asks about accommodation or hotels.',
      parameters: {
        type: 'OBJECT',
        properties: {
          cityCode: { type: 'STRING', description: 'City IATA code (e.g., BCN, IST, CDG)' },
          checkInDate: { type: 'STRING', description: 'Check-in date YYYY-MM-DD' },
          checkOutDate: { type: 'STRING', description: 'Check-out date YYYY-MM-DD' },
        },
        required: ['cityCode', 'checkInDate', 'checkOutDate'],
      },
    },
    {
      name: 'searchInspiration',
      description:
        'Find the cheapest flight deals from a specific airport. Use when the user wants travel inspiration or cheap deals without a specific destination.',
      parameters: {
        type: 'OBJECT',
        properties: {
          origin: { type: 'STRING', description: 'Origin airport IATA code (e.g., OTP, LHR, CDG)' },
        },
        required: ['origin'],
      },
    },
    {
      name: 'getCurrentDeals',
      description:
        'Returns the EXACT trip packages currently shown on the user\'s homepage (rotated set of up to 30 curated deals from their nearest airport). PREFER this over searchInspiration whenever the user asks about deals, offers, recommendations, "what is available", or "show me what you have".',
      parameters: {
        type: 'OBJECT',
        properties: {
          origin: { type: 'STRING', description: 'Origin airport IATA — usually inferred from pageContext' },
        },
        required: ['origin'],
      },
    },
  ],
};

type ToolArgs = Record<string, unknown>;

async function executeTool(
  name: string,
  args: ToolArgs,
  baseUrl: string
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case 'searchFlights': {
        const params = new URLSearchParams({
          origin: String(args.origin || ''),
          destination: String(args.destination || ''),
          departureDate: String(args.departureDate || ''),
          ...(args.returnDate ? { returnDate: String(args.returnDate) } : {}),
        });
        const res = await fetch(`${baseUrl}/api/flights/live?${params}`);
        const data = await res.json();

        if (!data.flights?.length) {
          return {
            noResults: true,
            message: `No flights found ${args.origin} → ${args.destination} on ${args.departureDate}`,
          };
        }

        const flights: ChatFlight[] = data.flights
          .slice(0, 5)
          .map((f: Record<string, unknown>, i: number) => ({
            id: `flight-${i}-${String(f.airline || '')}-${String(f.departureTime || '')}`,
            airline: String(f.airlineName || f.airline || ''),
            airlineCode: String(f.airline || ''),
            price: (f.price as number) || 0,
            currency: String(f.currency || 'EUR'),
            departureTime: String(f.departureTime || ''),
            arrivalTime: String(f.arrivalTime || ''),
            duration: String(f.duration || ''),
            stops: (f.stops as number) || 0,
            origin: String(f.origin || ''),
            destination: String(f.destination || ''),
            originCity: String(f.originCity || f.origin || ''),
            destinationCity: String(f.destinationCity || f.destination || ''),
            departureDate: String(f.departureDate || args.departureDate || ''),
          }));

        return { flights, total: data.flights.length };
      }

      case 'searchHotels': {
        const params = new URLSearchParams({
          cityCode: String(args.cityCode || ''),
          checkInDate: String(args.checkInDate || ''),
          checkOutDate: String(args.checkOutDate || ''),
        });
        const res = await fetch(`${baseUrl}/api/hotels/live?${params}`);
        const data = await res.json();

        if (!data.hotels?.length) {
          return { noResults: true, message: `No hotels found in ${args.cityCode}` };
        }

        const checkIn = String(args.checkInDate || '');
        const checkOut = String(args.checkOutDate || '');
        const nights = Math.max(
          1,
          checkIn && checkOut
            ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
            : 1
        );

        const hotels: ChatHotel[] = data.hotels
          .slice(0, 5)
          .map((h: Record<string, unknown>, i: number) => ({
            id: `hotel-${i}-${String(h.name || '').replace(/\s+/g, '-').toLowerCase()}`,
            name: String(h.name || 'Hotel'),
            stars: (h.rating as number) || (h.stars as number) || 3,
            pricePerNight: (h.pricePerNight as number) || 0,
            totalPrice: (h.totalPrice as number) || 0,
            currency: String(h.currency || 'EUR'),
            city: String(h.cityName || args.cityCode || ''),
            nights,
            checkIn,
            checkOut,
            roomType: String(h.roomType || 'Standard Room'),
          }));

        return { hotels, total: data.hotels.length };
      }

      case 'searchInspiration': {
        const res = await fetch(
          `${baseUrl}/api/flights/inspiration?origin=${encodeURIComponent(String(args.origin || ''))}`
        );
        const data = await res.json();

        const deals: ChatDeal[] = (data.destinations || [])
          .slice(0, 6)
          .map((d: Record<string, unknown>, i: number) => {
            const depDate = String(d.departureDate || '');
            const retDate = String(d.returnDate || '');
            const days =
              depDate && retDate
                ? Math.max(1, Math.ceil((new Date(retDate).getTime() - new Date(depDate).getTime()) / 86400000))
                : 7;
            const price = (d.price as number) || 0;
            return {
              id: `deal-${i}-${String(d.destination || '')}`,
              destination: String(d.destination || ''),
              city: String(d.destinationCity || d.destination || ''),
              country: '',
              days,
              badge: price < 100 ? 'Hot Deal' : undefined,
              isDirect: false,
              departureDate: depDate,
              returnDate: retDate,
              originCity: String(args.origin || ''),
              price,
              originalPrice: price,
              currency: String(d.currency || 'EUR'),
            };
          });

        return { deals, total: deals.length };
      }

      case 'getCurrentDeals': {
        // Read the same cache the homepage reads — guarantees the AI sees
        // exactly the offers the user is looking at right now.
        const origin = String(args.origin || 'OTP').toUpperCase();
        const cached = await getCached(`deals:${origin}`);
        if (!cached?.data) {
          return {
            noResults: true,
            message: `No active deals cached for ${origin}. The user can refresh the homepage to load fresh offers.`,
          };
        }
        const arr = (cached.data as TripPackage[]) || [];
        const deals: ChatDeal[] = arr.slice(0, 6).map((p) => ({
          id: p.id,
          destination: p.destination?.iata || '',
          city: p.destination?.city || p.destination?.iata || '',
          country: p.destination?.country || '',
          days: p.nights,
          badge: p.totalPrice < 200 ? 'Hot Deal' : undefined,
          isDirect: (p.flight?.stops ?? 0) === 0,
          departureDate: p.flight?.departureTime?.slice(0, 10) || '',
          returnDate: p.hotel?.checkOut || '',
          originCity: getCityFromIata(origin) || origin,
          price: p.totalPrice,
          originalPrice: p.totalPrice,
          currency: p.currency || 'EUR',
        }));
        return { deals, total: deals.length };
      }

      default:
        return { error: 'Unknown tool' };
    }
  } catch (err) {
    console.error(`[Chat Tool] ${name} failed:`, err);
    return { error: `Failed to execute ${name}` };
  }
}

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args: ToolArgs };
  functionResponse?: { name: string; response: Record<string, unknown> };
};

type GeminiContent = {
  role: string;
  parts: GeminiPart[];
};

async function callGemini(apiKey: string, contents: GeminiContent[], systemPrompt: string) {
  // SECURITY: API key MUST go in the `x-goog-api-key` header — not as a URL
  // query param — so it never appears in browser history, Referer headers,
  // CDN/proxy logs, or server access logs. Google AI Studio flags any key
  // observed in a URL as "publicly exposed".
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [TOOL_DECLARATIONS],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!res.ok) {
    // Log status only — never log the response body, which can contain
    // internal model error details or surface request payload fragments.
    console.error('[Gemini API Error] Status:', res.status);
    throw new Error(`Gemini API error ${res.status}`);
  }

  return res.json();
}

type PageContext = {
  pathname?: string;
  locale?: string;
  userEmail?: string | null;
  homepageDestinations?: string[];
  currentTripId?: string | null;
};

function buildSystemPrompt(ctx: PageContext | undefined): string {
  const lines: string[] = [BASE_SYSTEM_PROMPT, ''];
  if (ctx) {
    lines.push('LIVE USER CONTEXT (use to ground answers — do NOT echo as raw data):');
    if (ctx.locale) lines.push(`- Active locale: ${ctx.locale} (reply in this language)`);
    if (ctx.pathname) lines.push(`- Current page: ${ctx.pathname}`);
    if (ctx.userEmail) lines.push(`- Signed-in user: ${ctx.userEmail}`);
    if (ctx.homepageDestinations?.length) {
      lines.push(`- Homepage offers currently visible (IATA): ${ctx.homepageDestinations.join(', ')}`);
      lines.push('  → If user asks about deals, START with getCurrentDeals so you can cite these by name + price.');
    }
    if (ctx.currentTripId) lines.push(`- Active trip the user is viewing: ${ctx.currentTripId}`);
  }
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    // Auth gate — chat is for authenticated users only (prevents anonymous abuse of Gemini quota).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    // SECURITY: log only presence as a boolean — never log the key, even partial.
    console.log('[Chat] API Key configured:', !!apiKey);
    const { messages, pageContext } = (await req.json()) as {
      messages?: Array<{ role: string; content: string }>;
      pageContext?: PageContext;
    };

    if (!apiKey) {
      return NextResponse.json(
        { message: 'AI chat is not configured. Please add GEMINI_API_KEY to your environment.' },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    const baseUrl = req.nextUrl.origin;

    const geminiContents: GeminiContent[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    );

    const systemPrompt = buildSystemPrompt(pageContext);
    let geminiResponse = await callGemini(apiKey, geminiContents, systemPrompt);

    let iterations = 0;
    const structuredData: {
      flights?: ChatFlight[];
      hotels?: ChatHotel[];
      deals?: ChatDeal[];
    } = {};

    while (iterations < 3) {
      const candidate = geminiResponse.candidates?.[0];
      if (!candidate) break;

      const parts: GeminiPart[] = candidate.content?.parts || [];
      const functionCallPart = parts.find((p: GeminiPart) => p.functionCall);

      if (!functionCallPart?.functionCall) break;

      const { name, args } = functionCallPart.functionCall;
      console.log(`[Chat] Executing tool: ${name}`, args);

      const toolResult = await executeTool(name, args, baseUrl);

      if (toolResult.flights) structuredData.flights = toolResult.flights as ChatFlight[];
      if (toolResult.hotels) structuredData.hotels = toolResult.hotels as ChatHotel[];
      if (toolResult.deals) structuredData.deals = toolResult.deals as ChatDeal[];

      geminiContents.push(
        { role: 'model', parts: [{ functionCall: functionCallPart.functionCall }] },
        { role: 'user', parts: [{ functionResponse: { name, response: toolResult } }] }
      );

      geminiResponse = await callGemini(apiKey, geminiContents, systemPrompt);
      iterations++;
    }

    const finalText =
      geminiResponse.candidates?.[0]?.content?.parts
        ?.filter((p: GeminiPart) => p.text)
        ?.map((p: GeminiPart) => p.text)
        ?.join('\n') || 'Sorry, I could not generate a response.';

    return NextResponse.json({
      message: finalText,
      data: Object.keys(structuredData).length > 0 ? structuredData : undefined,
    });
  } catch (error) {
    console.error('[Chat] Full error:', error);
    console.error('[Chat] Error message:', (error as Error)?.message);
    console.error('[Chat] Error stack:', (error as Error)?.stack);
    return NextResponse.json(
      { message: 'Sorry, I had trouble processing that. Please try again! ✈️' },
      { status: 200 }
    );
  }
}
