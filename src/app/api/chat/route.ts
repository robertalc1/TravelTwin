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

const SYSTEM_PROMPT = `You are TravelTwin AI — a friendly, knowledgeable travel assistant embedded in a travel planning platform. You help users plan trips, find flights, discover hotels, and explore destinations.

YOUR CAPABILITIES:
1. RECOMMEND destinations based on preferences (budget, climate, interests)
2. ANSWER questions about any destination (weather, visa, best time, costs)
3. GENERATE day-by-day itineraries with activities and budget estimates
4. SEARCH live flights and hotels using real Amadeus data (use the tools)

PERSONALITY:
- Friendly, enthusiastic about travel, but concise
- Use emojis sparingly (1-2 per message max)
- Give specific, actionable advice
- Answer in the SAME LANGUAGE the user writes in
- Keep responses concise (max 200 words unless generating itinerary)

TOOL USAGE:
- When user asks about flights FROM city TO city, use searchFlights
- When user asks about hotels IN city, use searchHotels
- When user wants inspiration/deals, use searchInspiration
- If a tool returns no results, suggest alternative dates or airports
- Never invent prices — only show real data from tools

IMPORTANT:
- You have access to REAL flight and hotel data via Amadeus API
- When presenting flight results, format them clearly with airline, price, times, and stops
- When presenting hotel results, format with name, stars, and price per night
- After showing results, suggest next steps (book, see more, search hotels too)`;

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
