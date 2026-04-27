import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchHotelsByCity, searchHotelOffers, searchFlightInspirations } from '@/lib/amadeus-client';
import { getCityFromIata, getCountryFromIata } from '@/lib/iataMapping';
import { COMMON_ROUTES } from '@/lib/commonRoutes';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatDeal = {
  id: string;
  destination: string;
  city: string;
  country: string;
  days: number;
  departureDate: string;
  returnDate: string;
  origin: string;
  originCity: string;
  price: number;
  originalPrice: number;
  currency: string;
  isDirect: boolean;
  badge?: string;
};

export type ChatFlight = {
  id: string;
  airline: string;
  airlineCode: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  departureDate: string;
};

export type ChatHotel = {
  id: string;
  name: string;
  city: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  checkIn: string;
  checkOut: string;
  nights: number;
};

export type ChatResponseData = {
  deals?: ChatDeal[];
  flights?: ChatFlight[];
  hotels?: ChatHotel[];
};

function daysBetween(d1: string, d2: string): number {
  if (!d1 || !d2) return 5;
  const a = new Date(d1);
  const b = new Date(d2);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 5;
  return Math.max(1, Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000));
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const TOOLS = [
  {
    name: 'searchDeals',
    description:
      'Search cheapest flight deals and travel inspiration from a given city. Use when the user asks for cheap trips, destination ideas, where to go, or travel suggestions.',
    input_schema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'IATA airport code for the departure city (e.g., OTP, LHR, CDG)' },
      },
      required: ['origin'],
    },
  },
  {
    name: 'searchFlights',
    description: 'Search for flights on a specific route and date.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'IATA departure airport code' },
        to: { type: 'string', description: 'IATA destination airport code' },
        departureDate: { type: 'string', description: 'Departure date YYYY-MM-DD' },
        returnDate: { type: 'string', description: 'Return date YYYY-MM-DD (optional, for round trip)' },
      },
      required: ['from', 'to', 'departureDate'],
    },
  },
  {
    name: 'searchHotels',
    description: 'Search for hotels in a destination city.',
    input_schema: {
      type: 'object',
      properties: {
        cityCode: { type: 'string', description: 'IATA city/airport code (e.g., CDG, LHR, IST)' },
        checkIn: { type: 'string', description: 'Check-in date YYYY-MM-DD' },
        checkOut: { type: 'string', description: 'Check-out date YYYY-MM-DD' },
      },
      required: ['cityCode', 'checkIn', 'checkOut'],
    },
  },
];

async function runSearchDeals(origin: string): Promise<{ text: string; deals: ChatDeal[] }> {
  const depart = futureDate(30);
  const ret = futureDate(37);

  // Try Amadeus inspiration
  try {
    const raw = await searchFlightInspirations(origin);
    if (raw.length > 0) {
      const deals: ChatDeal[] = raw.slice(0, 4).map((d: Record<string, unknown>, i: number) => {
        const priceObj = d.price as Record<string, string> | undefined;
        const price = priceObj ? parseFloat(priceObj.total || '0') : 0;
        return {
          id: `chat-deal-${Date.now()}-${i}`,
          destination: d.destination as string,
          city: getCityFromIata(d.destination as string) || (d.destination as string),
          country: getCountryFromIata(d.destination as string) || '',
          days: daysBetween(d.departureDate as string, d.returnDate as string),
          departureDate: (d.departureDate as string) || depart,
          returnDate: (d.returnDate as string) || ret,
          origin,
          originCity: getCityFromIata(origin) || origin,
          price,
          originalPrice: Math.round(price * 1.25),
          currency: 'EUR',
          isDirect: false,
          badge: i === 0 ? 'Cheapest' : undefined,
        };
      });
      return { text: JSON.stringify({ found: deals.length }), deals };
    }
  } catch { /* fall through to common routes */ }

  // Common routes fallback
  const routes = COMMON_ROUTES.filter(r => r.from === origin).slice(0, 4);
  const deals: ChatDeal[] = routes.map((r, i) => ({
    id: `chat-deal-${Date.now()}-${i}`,
    destination: r.to,
    city: getCityFromIata(r.to) || r.to,
    country: getCountryFromIata(r.to) || '',
    days: 5,
    departureDate: depart,
    returnDate: ret,
    origin,
    originCity: getCityFromIata(origin) || origin,
    price: r.avgPrice,
    originalPrice: Math.round(r.avgPrice * 1.25),
    currency: r.currency,
    isDirect: false,
    badge: i === 0 ? 'Cheapest' : undefined,
  }));

  return { text: JSON.stringify({ found: deals.length }), deals };
}

async function runSearchFlights(
  from: string,
  to: string,
  departureDate: string,
  returnDate?: string
): Promise<{ text: string; flights: ChatFlight[] }> {
  const params: Record<string, string> = {
    originLocationCode: from,
    destinationLocationCode: to,
    departureDate,
    adults: '1',
    max: '5',
    currencyCode: 'EUR',
  };
  if (returnDate) params.returnDate = returnDate;

  try {
    const raw = await searchFlights(params);
    const flights: ChatFlight[] = raw.slice(0, 3).map((f: Record<string, unknown>, i: number) => {
      const itinerary = (f.itineraries as Array<Record<string, unknown>>)?.[0];
      const segments = (itinerary?.segments as Array<Record<string, unknown>>) || [];
      const first = segments[0] || {};
      const last = segments[segments.length - 1] || first;
      const dep = first.departure as Record<string, string> | undefined;
      const arr = last.arrival as Record<string, string> | undefined;
      const price = f.price as Record<string, unknown>;
      return {
        id: `chat-flight-${Date.now()}-${i}`,
        airline: (first.carrierCode as string) || '',
        airlineCode: (first.carrierCode as string) || '',
        origin: from,
        originCity: getCityFromIata(from) || from,
        destination: to,
        destinationCity: getCityFromIata(to) || to,
        departureTime: dep?.at?.split('T')[1]?.substring(0, 5) || '',
        arrivalTime: arr?.at?.split('T')[1]?.substring(0, 5) || '',
        duration: (itinerary?.duration as string) || '',
        stops: Math.max(0, segments.length - 1),
        price: parseFloat(price?.total as string) || 0,
        currency: (price?.currency as string) || 'EUR',
        departureDate,
      };
    });
    return { text: JSON.stringify({ found: flights.length }), flights };
  } catch {
    return { text: '{"found":0}', flights: [] };
  }
}

async function runSearchHotels(
  cityCode: string,
  checkIn: string,
  checkOut: string
): Promise<{ text: string; hotels: ChatHotel[] }> {
  const nights = daysBetween(checkIn, checkOut);

  try {
    const hotelList = await searchHotelsByCity(cityCode);
    const ids = (hotelList as Array<Record<string, unknown>>)
      .slice(0, 10)
      .map(h => h.hotelId as string)
      .filter(Boolean);

    if (ids.length === 0) return { text: '{"found":0}', hotels: [] };

    const offers = await searchHotelOffers(ids, checkIn, checkOut, '1');
    const hotels: ChatHotel[] = (offers as Array<Record<string, unknown>>).slice(0, 3).map((o, i) => {
      const hotel = o.hotel as Record<string, unknown>;
      const offerList = (o.offers as Array<Record<string, unknown>>) || [];
      const offer = offerList[0] || {};
      const price = offer.price as Record<string, unknown>;
      const totalPrice = parseFloat(price?.total as string) || 0;
      const pricePerNight = totalPrice > 0 && nights > 0 ? Math.round(totalPrice / nights) : 0;
      return {
        id: `chat-hotel-${Date.now()}-${i}`,
        name: (hotel?.name as string) || 'Hotel',
        city: getCityFromIata(cityCode) || cityCode,
        stars: parseInt(hotel?.rating as string) || 3,
        pricePerNight,
        totalPrice: Math.round(totalPrice),
        currency: (price?.currency as string) || 'EUR',
        checkIn,
        checkOut,
        nights,
      };
    });
    return { text: JSON.stringify({ found: hotels.length }), hotels };
  } catch {
    return { text: '{"found":0}', hotels: [] };
  }
}

const SYSTEM_PROMPT = `You are TravelTwin AI, an enthusiastic travel assistant with access to real-time flight and hotel data.

When users ask about destinations, cheap deals, or where to go → call searchDeals with their departure city IATA code.
When users ask about a specific route → call searchFlights.
When users ask about hotels in a city → call searchHotels.

After getting tool results, write a BRIEF 1-2 sentence response summarizing what you found. The data will be displayed as visual cards, so keep text SHORT and friendly. Mention the best price or highlight. Be enthusiastic!

If no tools are needed, answer helpfully in 2-3 sentences.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ConversationMessage[] = body.messages || [];
    const origin = ((body.origin as string) || 'OTP').toUpperCase();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        content:
          "I'm TravelTwin AI! Ask me about flights, hotels, or where to travel next. (AI features need ANTHROPIC_API_KEY configured.)",
        data: null,
      });
    }

    // First Claude call
    const firstRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!firstRes.ok) throw new Error(`Anthropic ${firstRes.status}`);
    const firstData = await firstRes.json();

    // No tool use — return text directly
    if (firstData.stop_reason !== 'tool_use') {
      const text =
        (firstData.content as Array<{ type: string; text?: string }>)?.find(b => b.type === 'text')
          ?.text || '';
      return NextResponse.json({ content: text, data: null });
    }

    // Execute all tools
    const combinedData: ChatResponseData = {};
    const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

    for (const block of firstData.content as Array<{
      type: string;
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>) {
      if (block.type !== 'tool_use') continue;

      let resultText = '{}';

      if (block.name === 'searchDeals') {
        const o = (block.input.origin as string) || origin;
        const { text, deals } = await runSearchDeals(o);
        resultText = text;
        if (deals.length > 0) combinedData.deals = deals;
      } else if (block.name === 'searchFlights') {
        const { from, to, departureDate, returnDate } = block.input as {
          from: string;
          to: string;
          departureDate: string;
          returnDate?: string;
        };
        const { text, flights } = await runSearchFlights(from, to, departureDate, returnDate);
        resultText = text;
        if (flights.length > 0) combinedData.flights = flights;
      } else if (block.name === 'searchHotels') {
        const { cityCode, checkIn, checkOut } = block.input as {
          cityCode: string;
          checkIn: string;
          checkOut: string;
        };
        const { text, hotels } = await runSearchHotels(cityCode, checkIn, checkOut);
        resultText = text;
        if (hotels.length > 0) combinedData.hotels = hotels;
      }

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: resultText });
    }

    // Second Claude call with tool results
    const secondRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'assistant', content: firstData.content },
          { role: 'user', content: toolResults },
        ],
      }),
    });

    const secondData = await secondRes.json();
    const content =
      (secondData.content as Array<{ type: string; text?: string }>)?.find(b => b.type === 'text')
        ?.text || '';

    return NextResponse.json({
      content,
      data: Object.keys(combinedData).length > 0 ? combinedData : null,
    });
  } catch (error) {
    console.error('[Chat API]', error);
    return NextResponse.json({
      content: "Sorry, I couldn't process that request. Please try again.",
      data: null,
    });
  }
}
