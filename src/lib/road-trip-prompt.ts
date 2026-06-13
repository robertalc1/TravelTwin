export interface RoadTripPromptInput {
  originCity: string;
  destinationCity: string;
  destinationCountry?: string;
  mode: 'car' | 'bus' | 'train';
  distanceKm: number;
  durationHours: number;
  departureDate: string;
  returnDate?: string;
  adults: number;
  stopovers: Array<{ city: string }>;
  destinationHotelName?: string;
  locale: 'ro' | 'en';
}

export interface RoadTripAiContent {
  description: string;
  whyThisTrip: string;
  dayByDay: Array<{
    day: number;
    title: string;
    morning: { activity: string; description: string; type: string };
    afternoon: { activity: string; description: string; type: string };
    evening: { activity: string; description: string; type: string };
  }>;
  topAttractions: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  topRestaurants: Array<{
    name: string;
    cuisine: string;
    priceRange: string;
    description: string;
  }>;
  topCafes: Array<{
    name: string;
    specialty: string;
    description: string;
  }>;
  localTips: string[];
  estimatedDailyExpenses: { food: number; transport: number; activities: number };
}

export function buildRoadTripPrompt(input: RoadTripPromptInput): string {
  const {
    originCity,
    destinationCity,
    destinationCountry,
    mode,
    distanceKm,
    durationHours,
    departureDate,
    returnDate,
    adults,
    stopovers,
    destinationHotelName,
    locale,
  } = input;

  const langInstruction =
    locale === 'ro'
      ? 'Răspunde în limba română. Folosește diacritice (ă, î, â, ș, ț).'
      : 'Respond in English.';

  const tripDays = returnDate
    ? Math.max(
        2,
        Math.round(
          (new Date(returnDate).getTime() - new Date(departureDate).getTime()) / 86400000,
        ),
      )
    : 3;

  const outboundDays = 1 + stopovers.length;
  const cityDays = Math.max(1, tripDays - outboundDays);

  const transportLine =
    mode === 'car'
      ? `${adults} traveler${adults > 1 ? 's' : ''} drive their own car ${distanceKm} km (~${durationHours.toFixed(1)}h total driving time) from ${originCity} to ${destinationCity}${destinationCountry ? `, ${destinationCountry}` : ''}.`
      : mode === 'train'
        ? `${adults} traveler${adults > 1 ? 's' : ''} travel by train ${distanceKm} km (~${durationHours.toFixed(1)}h total rail time) from ${originCity} to ${destinationCity}${destinationCountry ? `, ${destinationCountry}` : ''}. They take a direct connection or one transfer — describe Day 1 as a single travel day with relaxation on board, NOT driver breaks.`
        : `${adults} traveler${adults > 1 ? 's' : ''} take a long-distance bus ${distanceKm} km (~${durationHours.toFixed(1)}h total) from ${originCity} to ${destinationCity}${destinationCountry ? `, ${destinationCountry}` : ''}. They do NOT drive — describe rest stops as bus station stops, not driver breaks.`;

  const stopoverLine =
    stopovers.length === 0
      ? `The journey is completed in 1 day of travel.`
      : `Because the journey is long, they sleep ${stopovers.length} night${stopovers.length > 1 ? 's' : ''} along the way in: ${stopovers.map((s) => s.city).join(' → ')}. Day 1 ends at ${stopovers[0].city}.${stopovers.length > 1 ? ` Day 2 ends at ${stopovers[1].city}.` : ''}${stopovers.length > 2 ? ` Day 3 ends at ${stopovers[2].city}.` : ''} They reach ${destinationCity} on day ${outboundDays}.`;

  const hotelLine = destinationHotelName
    ? `In ${destinationCity} they stay at "${destinationHotelName}".`
    : `In ${destinationCity} they stay at a mid-range hotel.`;

  return `${langInstruction}

You are planning a road-trip itinerary (NO airplane, NO airport). ${transportLine} ${stopoverLine} ${hotelLine}

Trip details:
- Departure date: ${departureDate}
- Return date: ${returnDate || 'open'}
- Total duration: ${tripDays} days (${outboundDays} day${outboundDays > 1 ? 's' : ''} on the road outbound + ${cityDays} day${cityDays > 1 ? 's' : ''} at destination)
- Travelers: ${adults} adult${adults > 1 ? 's' : ''}
- Mode of transport: ${mode === 'car' ? 'private car (self-driving)' : mode === 'train' ? 'European intercity train' : 'long-distance bus'}

Generate a JSON object with EXACTLY this shape (no markdown, no commentary — JSON only):

{
  "description": "<2-3 sentence overview of the trip experience>",
  "whyThisTrip": "<1-2 sentences explaining why ${destinationCity} is a great fit for a road trip from ${originCity}>",
  "dayByDay": [
    {
      "day": 1,
      "title": "<short title, e.g. 'Drum spre ${stopovers[0]?.city ?? destinationCity}' or 'Bucharest → Vienna'>",
      "morning": {
        "activity": "<short label>",
        "description": "<one sentence>",
        "type": "transport|sightseeing|dining"
      },
      "afternoon": { "activity": "...", "description": "...", "type": "..." },
      "evening": { "activity": "...", "description": "...", "type": "..." }
    }
  ],
  "topAttractions": [
    {
      "name": "<real attraction in ${destinationCity}>",
      "description": "<1 sentence>",
      "category": "museum|landmark|park|other"
    }
  ],
  "topRestaurants": [
    {
      "name": "<real restaurant in ${destinationCity}>",
      "cuisine": "<cuisine type>",
      "priceRange": "€|€€|€€€",
      "description": "<1 sentence>"
    }
  ],
  "topCafes": [
    {
      "name": "<real cafe in ${destinationCity}>",
      "specialty": "<short>",
      "description": "<1 sentence>"
    }
  ],
  "localTips": [
    "<road-specific tip — e.g. 'Vignieta Austria (~€10) pentru autostrăzi'>",
    "<5-6 tips total>"
  ],
  "estimatedDailyExpenses": { "food": 35, "transport": 5, "activities": 25 }
}

Rules:
- dayByDay must contain EXACTLY ${tripDays} entries (one per day of the trip).
- Day 1 morning must be of type "transport" (the journey begins).
- ${stopovers.length > 0 ? `Days 1${stopovers.length > 1 ? `-${stopovers.length}` : ''} are travel days through ${stopovers.map((s) => s.city).join(', ')}. Day ${outboundDays} is arrival in ${destinationCity}.` : `Day 1 is the outbound drive — arrival in ${destinationCity} same day.`}
- Days at destination should mix sightseeing/dining/local exploration. The final 1-2 days may include the return drive.
- topAttractions, topRestaurants, topCafes ALL refer to ${destinationCity} (NOT origin, NOT stopovers).
- topAttractions: 5-8 entries. topRestaurants: 4-6 entries. topCafes: 3-5 entries.
- localTips MUST include road-specific items: vignettes/tolls for transit countries, driving regulations (Austrian/Swiss alpine, Romanian DN1), fuel pricing, EU travel docs (greencard, RCA international), and 1-2 destination-specific tips.
- DO NOT mention airports, flights, boarding, airlines, or air travel anywhere.
- ${mode === 'car' ? 'For driving days, mention realistic break intervals (every 2-3 hours).' : mode === 'train' ? 'For travel days, describe boarding the train, the onboard experience and the arrival station.' : 'For bus days, describe bus terminals and onboard experience.'}
- Output ONLY valid JSON, starting with { and ending with }.`;
}

/** Tolerant JSON parser — extracts the first JSON object from the AI's text
 *  output. Mirrors the pattern used by the flight plan-trip route. */
export function parseRoadTripAiJson(text: string): RoadTripAiContent | null {
  if (!text) return null;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last < 0 || last <= first) return null;
  try {
    const parsed = JSON.parse(text.slice(first, last + 1)) as Partial<RoadTripAiContent>;
    if (!parsed || !Array.isArray(parsed.dayByDay) || parsed.dayByDay.length === 0) {
      return null;
    }
    return {
      description: parsed.description ?? '',
      whyThisTrip: parsed.whyThisTrip ?? '',
      dayByDay: parsed.dayByDay,
      topAttractions: Array.isArray(parsed.topAttractions) ? parsed.topAttractions : [],
      topRestaurants: Array.isArray(parsed.topRestaurants) ? parsed.topRestaurants : [],
      topCafes: Array.isArray(parsed.topCafes) ? parsed.topCafes : [],
      localTips: Array.isArray(parsed.localTips) ? parsed.localTips : [],
      estimatedDailyExpenses: parsed.estimatedDailyExpenses ?? {
        food: 0,
        transport: 0,
        activities: 0,
      },
    };
  } catch {
    return null;
  }
}
