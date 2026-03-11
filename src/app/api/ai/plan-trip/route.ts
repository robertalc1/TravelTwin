import { NextRequest, NextResponse } from 'next/server';
import { matchDestinations, DestinationProfile } from '@/lib/destinations';
import { searchFlights, searchHotelsByCity, searchHotelOffers } from '@/lib/amadeus-client';

export interface TripPackage {
  id: string;
  destination: DestinationProfile;
  flight: {
    outbound: any;
    inbound?: any;
    price: number;
    currency: string;
    airline: string;
    airlineCode: string;
    duration: string;
    stops: number;
    departureTime: string;
    arrivalTime: string;
  } | null;
  hotel: {
    id: string;
    name: string;
    stars: number;
    price: number;
    pricePerNight: number;
    currency: string;
    checkIn: string;
    checkOut: string;
    amenities: string[];
  } | null;
  totalPrice: number;
  currency: string;
  nights: number;
  aiContent: {
    description: string;
    whyThisTrip: string;
    dayByDay: Array<{
      day: number;
      title: string;
      morning: { activity: string; description: string; type: string };
      afternoon: { activity: string; description: string; type: string };
      evening: { activity: string; description: string; type: string };
    }>;
    topAttractions: string[];
    localTips: string[];
    estimatedDailyExpenses: { food: number; transport: number; activities: number };
  } | null;
  score: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      origin,
      budget,
      currency = 'EUR',
      departureDate,
      returnDate,
      adults = 2,
      children = 0,
      travelStyles = [],
      climate = 'no-preference',
      priorities = [],
    } = body;

    if (!origin || !budget || !departureDate || !returnDate) {
      return NextResponse.json({ error: 'Missing required fields: origin, budget, departureDate, returnDate' }, { status: 400 });
    }

    const depDate = new Date(departureDate);
    const retDate = new Date(returnDate);
    const nights = Math.round((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
    const month = depDate.getMonth() + 1;
    const totalAdults = adults + children;

    // 1. Match candidate destinations
    const candidates = matchDestinations(travelStyles, climate, budget, month, 8);
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No destinations matched your preferences' }, { status: 400 });
    }

    // Budget allocation: 40% flights, 45% hotel, 15% activities
    const flightBudget = budget * 0.40;
    const hotelBudget = budget * 0.45;

    // 2. Search flights + hotels for each candidate in parallel (limit to 5)
    const searchPromises = candidates.slice(0, 5).map(async (dest) => {
      try {
        // Search flights
        const flightParams: Record<string, string> = {
          originLocationCode: origin,
          destinationLocationCode: dest.iata,
          departureDate,
          returnDate,
          adults: String(totalAdults),
          travelClass: 'ECONOMY',
          currencyCode: currency,
          max: '5',
        };

        const [flightResults, hotelList] = await Promise.allSettled([
          searchFlights(flightParams),
          searchHotelsByCity(dest.iata),
        ]);

        let flightData: any[] = flightResults.status === 'fulfilled' ? flightResults.value : [];
        let hotelListData: any[] = hotelList.status === 'fulfilled' ? hotelList.value : [];

        // Filter affordable flights
        const affordableFlight = flightData.find(f => {
          const price = parseFloat(f.price?.total || f.price?.grandTotal || '999999');
          return price <= flightBudget * totalAdults;
        }) || flightData[0];

        // Get hotel offers if we have hotel IDs
        let hotelOffer: any = null;
        if (hotelListData.length > 0) {
          const hotelIds = hotelListData.slice(0, 10).map((h: any) => h.hotelId).filter(Boolean);
          if (hotelIds.length > 0) {
            try {
              const offers = await searchHotelOffers(hotelIds, departureDate, returnDate, String(adults));
              hotelOffer = offers.find((o: any) => {
                const price = parseFloat(o.offers?.[0]?.price?.total || '999999');
                return price <= hotelBudget;
              }) || offers[0];
            } catch {
              // hotel offers failed, continue without
            }
          }
        }

        return { dest, flightData: affordableFlight, hotelOffer };
      } catch (e) {
        console.warn(`[plan-trip] Failed searching ${dest.iata}:`, e);
        return { dest, flightData: null, hotelOffer: null };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // 3. Score and build packages
    const packages: TripPackage[] = [];

    for (const { dest, flightData, hotelOffer } of searchResults) {
      const flightPrice = flightData
        ? parseFloat(flightData.price?.total || flightData.price?.grandTotal || '0')
        : 0;
      const hotelPrice = hotelOffer
        ? parseFloat(hotelOffer.offers?.[0]?.price?.total || '0')
        : 0;
      const totalPrice = flightPrice + hotelPrice;

      if (totalPrice > budget * 1.15) continue; // Skip if >15% over budget

      // Build normalized flight info
      const flight = flightData ? buildFlightInfo(flightData) : null;
      const hotel = hotelOffer ? buildHotelInfo(hotelOffer, nights) : null;

      // Score package
      let score = 0;
      if (totalPrice > 0 && totalPrice <= budget) score += 30;
      if (flight?.stops === 0 && priorities.includes('direct-flights')) score += 25;
      if (hotel && hotel.stars >= 4) score += 20;
      if (priorities.includes('cheapest') && totalPrice < budget * 0.8) score += 15;
      score += (dest.tags.filter((t: string) => travelStyles.includes(t)).length * 10);

      packages.push({
        id: `${dest.iata}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        destination: dest,
        flight,
        hotel,
        totalPrice: Math.round(totalPrice),
        currency,
        nights,
        aiContent: null, // filled below
        score,
      });
    }

    // Sort by score and take top 3
    packages.sort((a, b) => b.score - a.score);
    const topPackages = packages.slice(0, 3);

    // 4. Generate AI content for top packages
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && topPackages.length > 0) {
      await Promise.all(topPackages.map(async (pkg) => {
        try {
          const activityBudget = Math.round(budget - pkg.totalPrice);
          const prompt = `You are a travel expert. Generate a trip itinerary for this trip:

Destination: ${pkg.destination.city}, ${pkg.destination.country}
Dates: ${departureDate} to ${returnDate} (${nights} nights)
Budget remaining for activities: €${activityBudget}
Travel styles: ${travelStyles.join(', ')}
Group: ${adults} adults, ${children} children

Return ONLY valid JSON (no markdown, no backticks):
{
  "description": "2-3 sentence compelling trip description",
  "whyThisTrip": "1 sentence explaining why this matches their preferences",
  "dayByDay": [
    {
      "day": 1,
      "title": "Arrival & First Impressions",
      "morning": { "activity": "...", "description": "...", "type": "transport" },
      "afternoon": { "activity": "...", "description": "...", "type": "sightseeing" },
      "evening": { "activity": "...", "description": "...", "type": "dining" }
    }
  ],
  "topAttractions": ["Name 1", "Name 2", "Name 3", "Name 4", "Name 5"],
  "localTips": ["Tip 1", "Tip 2", "Tip 3"],
  "estimatedDailyExpenses": { "food": 40, "transport": 15, "activities": 25 }
}`;

          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1500,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const text = aiData.content?.[0]?.text || '';
            pkg.aiContent = JSON.parse(text);
          }
        } catch (e) {
          console.warn('[plan-trip] AI generation failed for', pkg.destination.iata, e);
          pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles);
        }
      }));
    } else {
      // No API key — use fallback content for all
      topPackages.forEach(pkg => {
        pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles);
      });
    }

    return NextResponse.json({ packages: topPackages, total: topPackages.length });
  } catch (e: any) {
    console.error('[plan-trip] Error:', e);
    return NextResponse.json({ error: e.message || 'Failed to plan trip' }, { status: 500 });
  }
}

function buildFlightInfo(f: any) {
  const itinerary = f.itineraries?.[0];
  const segment = itinerary?.segments?.[0];
  const lastSeg = itinerary?.segments?.[itinerary.segments.length - 1];
  const price = parseFloat(f.price?.total || f.price?.grandTotal || '0');
  return {
    outbound: f,
    price,
    currency: f.price?.currency || 'EUR',
    airline: segment?.carrierCode || '',
    airlineCode: segment?.carrierCode || '',
    duration: itinerary?.duration || '',
    stops: (itinerary?.segments?.length || 1) - 1,
    departureTime: segment?.departure?.at || '',
    arrivalTime: lastSeg?.arrival?.at || '',
  };
}

function buildHotelInfo(offer: any, nights: number) {
  const o = offer.offers?.[0];
  const total = parseFloat(o?.price?.total || '0');
  const pricePerNight = nights > 0 ? Math.round(total / nights) : total;
  return {
    id: offer.hotel?.hotelId || '',
    name: offer.hotel?.name || 'Hotel',
    stars: offer.hotel?.rating ? parseInt(offer.hotel.rating) : 3,
    price: Math.round(total),
    pricePerNight,
    currency: o?.price?.currency || 'EUR',
    checkIn: o?.checkInDate || '',
    checkOut: o?.checkOutDate || '',
    amenities: offer.hotel?.amenities?.slice(0, 5) || [],
  };
}

function generateFallbackContent(dest: DestinationProfile, nights: number, styles: string[]) {
  const styleText = styles.slice(0, 2).join(' and ') || 'adventure';
  return {
    description: `Discover the magic of ${dest.city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${dest.country}'s culture and beauty.`,
    whyThisTrip: `This trip is perfect for ${styleText} lovers looking for an unforgettable experience in ${dest.city}.`,
    dayByDay: Array.from({ length: Math.min(nights, 5) }, (_, i) => ({
      day: i + 1,
      title: i === 0 ? `Arrival in ${dest.city}` : i === nights - 1 ? 'Final Day & Departure' : `Explore ${dest.city} - Day ${i + 1}`,
      morning: { activity: i === 0 ? 'Airport arrival & hotel check-in' : 'Breakfast at local café', description: 'Start your day fresh', type: i === 0 ? 'transport' : 'dining' },
      afternoon: { activity: `Explore ${dest.city} highlights`, description: 'Visit the top sights and local neighborhoods', type: 'sightseeing' },
      evening: { activity: 'Dinner at a local restaurant', description: `Enjoy the best of ${dest.country} cuisine`, type: 'dining' },
    })),
    topAttractions: [`${dest.city} City Center`, `Local Museum`, `Traditional Market`, `Scenic Viewpoint`, `Historic Quarter`],
    localTips: [`Book popular restaurants in advance`, `Use local public transport to save money`, `Visit popular attractions early morning to avoid crowds`],
    estimatedDailyExpenses: { food: 35, transport: 15, activities: 25 },
  };
}
