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
- Live flights and hotels (real prices via Tripadvisor RapidAPI).
- AI Trip Planner wizard at /plan that builds 3 ranked packages (flight + hotel + day-by-day itinerary) from origin + budget + style.
- A rotating list of 30 curated deal packages on the homepage, refreshed periodically.
- Destination guides, restaurants, attractions, visa info, weather, route maps.
- Booking simulator at /booking/simulate.

ALWAYS DO:
1. Call getCurrentDeals FIRST when the user asks about deals/offers/recommendations/"what's available" — this returns the curated homepage list with LIVE Tripadvisor flight + hotel prices. Cite them by city + price + ID.
2. Call searchFlights / searchHotels for specific routes or cities the user names that aren't already in the deals list. Never invent prices, airlines, or availability.
3. End each offer recommendation with a clear next step: "Open this deal", "See more options", or "Plan a custom trip at /plan".
4. Be SHORT — under 120 words unless drafting an itinerary.

OUT OF SCOPE (politely decline + redirect):
- General knowledge ("what's the capital of X", "tell me a joke", coding, math, news, weather outside travel) → 1 short sentence offering travel help instead.
- Other travel sites / competitors → never compare or mention them.
- Personal/medical/legal advice → decline + offer travel help.

TONE:
- Warm, expert, concise — like a well-traveled friend, not corporate.
- Max 1 emoji per message. No filler.
- Quote prices in the currency the tools return.`;

// OpenAI-compatible tool definitions (consumed by Groq / Llama 3.3 70B).
const TOOL_DECLARATIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'searchFlights',
      description:
        'Search for real-time flight offers between two airports. Use when the user asks about flights, prices, or travel between cities.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Origin airport IATA code (e.g., OTP, CDG, LHR)' },
          destination: { type: 'string', description: 'Destination airport IATA code (e.g., BCN, IST, DXB)' },
          departureDate: { type: 'string', description: 'Departure date in YYYY-MM-DD format' },
          returnDate: { type: 'string', description: 'Optional return date in YYYY-MM-DD format' },
        },
        required: ['origin', 'destination', 'departureDate'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'searchHotels',
      description:
        'Search for hotel availability and prices in a city. Use when the user asks about accommodation or hotels.',
      parameters: {
        type: 'object',
        properties: {
          cityCode: { type: 'string', description: 'City IATA code (e.g., BCN, IST, CDG)' },
          checkInDate: { type: 'string', description: 'Check-in date YYYY-MM-DD' },
          checkOutDate: { type: 'string', description: 'Check-out date YYYY-MM-DD' },
        },
        required: ['cityCode', 'checkInDate', 'checkOutDate'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getCurrentDeals',
      description:
        'Returns the up-to-30 curated trip packages currently shown on the user\'s homepage. Prices are LIVE Tripadvisor (real bookable flight + hotel totals), cached server-side for 60 minutes. ALWAYS use this when the user asks about deals/offers/recommendations/"what is available" — prefer it over searchFlights for general questions, since the homepage is what the user is actually looking at.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Origin airport IATA — usually inferred from pageContext' },
        },
        required: ['origin'],
      },
    },
  },
];

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

// OpenAI-compatible message shape (consumed by Groq).
type GroqToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type GroqMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
  name?: string;
};

type GroqChoice = {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: GroqToolCall[];
  };
  finish_reason: string;
};

type GroqResponse = {
  choices?: GroqChoice[];
};

async function callGroq(apiKey: string, messages: GroqMessage[]): Promise<GroqResponse> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: TOOL_DECLARATIONS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    // Status only — never log body, may contain prompt fragments.
    console.error('[Groq API Error] Status:', res.status);
    throw new Error(`Groq API error ${res.status}`);
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

// Heuristic — flags Romanian based on diacritics and common stop-words that
// don't appear in English. Used to switch reply language even when the
// locale URL doesn't match what the user actually types.
function detectRomanian(text: string): boolean {
  if (!text) return false;
  if (/[ăâîșțĂÂÎȘȚ]/.test(text)) return true;
  const t = ` ${text.toLowerCase()} `;
  const markers = [
    ' și ', ' este ', ' sunt ', ' vreau ', ' caut ', ' merg ', ' poti ', ' poți ',
    ' oferte ', ' zboruri ', ' hoteluri ', ' plaja ', ' munte ', ' ofera ', ' oferă ',
    ' acum ', ' bună ', ' buna ', ' salut ', ' multumesc ', ' mulțumesc ',
    ' bucuresti ', ' bucurești ', ' planifica ', ' planifică ',
  ];
  return markers.some((m) => t.includes(m));
}

function buildSystemPrompt(
  ctx: PageContext | undefined,
  lastUserMessage: string,
): string {
  // Determine reply language: prefer the language of the latest user message
  // (so the chat flips when the user writes in a different tongue), fall back
  // to locale, then default to English.
  const userIsRomanian = detectRomanian(lastUserMessage);
  const localeIsRomanian = ctx?.locale === 'ro';
  const replyInRomanian = userIsRomanian || (localeIsRomanian && !/[a-z]{6,}/i.test(lastUserMessage || ''));
  const langHeader = replyInRomanian
    ? `LANGUAGE (HARD RULE): Reply ENTIRELY in Romanian (română). Every single word, including tool-result summaries, MUST be in Romanian. Do NOT mix English. If the user later switches to English mid-conversation, switch with them.`
    : `LANGUAGE (HARD RULE): Reply ENTIRELY in English. Every single word, including tool-result summaries, MUST be in English. If the user later switches to Romanian mid-conversation, switch with them.`;

  const lines: string[] = [langHeader, '', BASE_SYSTEM_PROMPT, ''];
  if (ctx) {
    lines.push('LIVE USER CONTEXT (use to ground answers — do NOT echo as raw data):');
    if (ctx.locale) lines.push(`- Active locale: ${ctx.locale}`);
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
    // Auth gate — chat is for authenticated users only (prevents anonymous abuse of provider quota).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    // SECURITY: log only presence as a boolean — never log the key, even partial.
    console.log('[Chat] API Key configured:', !!apiKey);
    const { messages, pageContext } = (await req.json()) as {
      messages?: Array<{ role: string; content: string }>;
      pageContext?: PageContext;
    };

    if (!apiKey) {
      return NextResponse.json(
        { message: 'AI chat is not configured. Please add GROQ_API_KEY to your environment.' },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    const baseUrl = req.nextUrl.origin;
    // Use the most recent user message for language detection — that's the
    // turn the model is responding to, so its language wins over older turns.
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const systemPrompt = buildSystemPrompt(pageContext, lastUserMsg);

    // Build OpenAI-style messages: system prompt first, then conversation.
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map<GroqMessage>((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    let groqResponse = await callGroq(apiKey, groqMessages);

    let iterations = 0;
    const structuredData: {
      flights?: ChatFlight[];
      hotels?: ChatHotel[];
      deals?: ChatDeal[];
    } = {};

    while (iterations < 3) {
      const choice = groqResponse.choices?.[0];
      if (!choice) break;

      const toolCalls = choice.message?.tool_calls ?? [];
      if (toolCalls.length === 0) break;

      // Push the assistant message that requested the tool calls — required
      // by OpenAI-style multi-turn so the next call sees the request/response pair.
      groqMessages.push({
        role: 'assistant',
        content: choice.message.content ?? null,
        tool_calls: toolCalls,
      });

      // Execute every tool call the model requested in this turn.
      for (const toolCall of toolCalls) {
        const name = toolCall.function.name;
        let args: ToolArgs = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}') as ToolArgs;
        } catch {
          args = {};
        }
        console.log(`[Chat] Executing tool: ${name}`, args);

        const toolResult = await executeTool(name, args, baseUrl);

        if (toolResult.flights) structuredData.flights = toolResult.flights as ChatFlight[];
        if (toolResult.hotels) structuredData.hotels = toolResult.hotels as ChatHotel[];
        if (toolResult.deals) structuredData.deals = toolResult.deals as ChatDeal[];

        groqMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      groqResponse = await callGroq(apiKey, groqMessages);
      iterations++;
    }

    const finalText =
      groqResponse.choices?.[0]?.message?.content ||
      'Sorry, I could not generate a response.';

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
