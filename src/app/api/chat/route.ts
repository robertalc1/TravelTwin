import { NextRequest, NextResponse } from 'next/server';

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

const SYSTEM_PROMPT = `You are TravelTwin AI — the in-app travel concierge for TravelTwin, an AI-powered trip-planning platform. You help users build complete trips: flights, hotels, destinations, and day-by-day itineraries — exactly like our "Plan My Trip" wizard, but conversationally.

CONTEXT ABOUT TRAVELTWIN:
- We aggregate live flights and hotels via Amadeus (real prices, real availability).
- We curate destination guides with photos, top attractions, restaurants, cafés, local tips, daily expense estimates, and visa info.
- Our "/plan" wizard collects: origin → destination preferences → dates → budget → travelers → returns ranked trip packages (flight + hotel + AI itinerary).
- Currency follows the user's profile (RON, EUR, USD, etc.) — quote prices in the currency the tools return.
- Most users depart from Romanian airports (OTP Bucharest, CLJ Cluj, TSR Timișoara, IAS Iași, SBZ Sibiu).

YOUR JOB — mirror the Plan My Trip flow:
1. ASK what they want (destination, dates, budget, vibe — beach/city/culture/adventure).
2. SEARCH real options using tools (searchInspiration for "anywhere cheap", searchFlights for specific routes, searchHotels for accommodation).
3. RECOMMEND with rationale: "Bali fits your beach + budget criteria — €260 direct flight, 4-star hotels from €40/night."
4. SUGGEST next steps: "Want me to find hotels there too?" or "Should I draft a 5-day itinerary?".

PERSONALITY:
- Warm, knowledgeable, concise. Like a well-traveled friend, not a chatbot.
- Match the user's language (English, Romanian, etc.).
- Max 1-2 emojis per message. No filler.
- Keep replies under ~150 words unless drafting an itinerary.

TOOL USAGE:
- Always call tools when the user asks about specific routes, hotels, or "cheap deals" — never invent prices, dates, or airlines.
- If the user gives a vague hint ("somewhere warm in March"), guess sensible defaults (departureDate ~30 days out, sample destinations) and call searchInspiration first.
- After tool results, present them in plain text — the UI auto-renders rich cards from the structured data.

IMPORTANT:
- Default origin if user doesn't specify: ask once, otherwise assume OTP (Bucharest).
- After showing results, ALWAYS suggest a logical next step (search hotels, see more options, or "send me to /plan to book this").
- If a tool returns no results, propose alternative dates or nearby airports.`;

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

async function callGemini(apiKey: string, contents: GeminiContent[]) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        tools: [TOOL_DECLARATIONS],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('[Gemini API Error] Status:', res.status);
    console.error('[Gemini API Error] Body:', errorBody);
    throw new Error(`Gemini API error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Chat] API Key exists:', !!process.env.GEMINI_API_KEY);
    console.log('[Chat] API Key prefix:', process.env.GEMINI_API_KEY?.slice(0, 10));
    const { messages } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

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

    let geminiResponse = await callGemini(apiKey, geminiContents);

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

      geminiResponse = await callGemini(apiKey, geminiContents);
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
