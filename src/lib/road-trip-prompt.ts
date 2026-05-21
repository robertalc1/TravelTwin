export interface RoadTripPromptInput {
  originCity: string;
  destinationCity: string;
  mode: 'car' | 'bus';
  distanceKm: number;
  durationHours: number;
  departureDate: string;
  returnDate?: string;
  adults: number;
  stopoverCity?: string;
  destinationHotelName?: string;
  locale: 'ro' | 'en';
}

export interface RoadTripAiContent {
  description: string;
  dayByDay: Array<{
    day: number;
    title: string;
    morning: string;
    afternoon: string;
    evening: string;
  }>;
  restStops: string[];
  routeHighlights: string[];
  packingTips: string[];
}

export function buildRoadTripPrompt(input: RoadTripPromptInput): string {
  const {
    originCity,
    destinationCity,
    mode,
    distanceKm,
    durationHours,
    departureDate,
    returnDate,
    adults,
    stopoverCity,
    destinationHotelName,
    locale,
  } = input;

  const langInstruction =
    locale === 'ro'
      ? 'Răspunde în limba română. Folosește diacritice (ă, î, â, ș, ț).'
      : 'Respond in English.';

  const transportLine =
    mode === 'car'
      ? `Travelers drive their own car ${distanceKm} km (${durationHours.toFixed(1)} hours of driving total) from ${originCity} to ${destinationCity}.`
      : `Travelers take a long-distance bus ${distanceKm} km (${durationHours.toFixed(1)} hours total) from ${originCity} to ${destinationCity}. They do NOT drive — describe rest stops as bus station stops, not driver breaks.`;

  const stopoverLine = stopoverCity
    ? `Because the journey is long, they sleep one night in ${stopoverCity} (midpoint stopover). Day 1 = ${originCity} → ${stopoverCity}. Day 2 = ${stopoverCity} → ${destinationCity}.`
    : `The trip is short enough to complete in one day of travel.`;

  const hotelLine = destinationHotelName
    ? `They stay at "${destinationHotelName}" in ${destinationCity}.`
    : `They stay at a mid-range hotel in ${destinationCity}.`;

  const tripDays = returnDate
    ? Math.max(2, Math.round((new Date(returnDate).getTime() - new Date(departureDate).getTime()) / 86400000))
    : 3;

  return `${langInstruction}

You are planning a road-trip itinerary (NO airplane, NO airport). ${transportLine} ${stopoverLine} ${hotelLine}

Trip details:
- Departure date: ${departureDate}
- Return date: ${returnDate || 'open'}
- Total duration: ${tripDays} days
- Travelers: ${adults} adult${adults > 1 ? 's' : ''}
- Mode of transport: ${mode === 'car' ? 'private car (self-driving)' : 'long-distance bus'}

Generate a JSON object with EXACTLY this shape (no markdown, no commentary — JSON only):

{
  "description": "<2-3 sentence overview of the road trip experience>",
  "dayByDay": [
    {
      "day": 1,
      "title": "<short day title>",
      "morning": "<one sentence>",
      "afternoon": "<one sentence>",
      "evening": "<one sentence>"
    }
  ],
  "restStops": [
    "<city or landmark + brief reason, e.g. 'Sibiu — coffee in the old town'>",
    "<3-6 entries total>"
  ],
  "routeHighlights": [
    "<scenic / cultural feature of the route, e.g. 'Crosses the Carpathian Mountains via the Olt Valley'>",
    "<3-5 entries>"
  ],
  "packingTips": [
    "<practical road-trip tip, e.g. 'Vignette for Bulgarian motorways (~€8)'>",
    "<4-6 entries>"
  ]
}

Rules:
- dayByDay must cover all ${tripDays} days. Day 1 is the outbound drive day. The final day is the return drive (if return date provided) — otherwise the last day is the last full day at destination.
- DO NOT mention airports, flights, boarding, or airlines anywhere.
- ${mode === 'car' ? 'For driving days, mention realistic break intervals (every 2-3 hours).' : 'For bus days, describe bus terminals and onboard experience.'}
- Anchor specific times to the ${durationHours.toFixed(1)}-hour driving duration when describing Day 1.
- packingTips MUST include road-specific items (vignettes, tolls, EU travel docs, emergency kit, snacks).
- Output ONLY valid JSON, starting with { and ending with }.`;
}
