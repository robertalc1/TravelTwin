import { NextRequest, NextResponse } from "next/server";
import { searchFlightInspirations, searchFlights, amadeusRest } from "@/lib/amadeus-client";

// IATA → city name for display
const IATA_CITY: Record<string, string> = {
  LHR: "London", LON: "London", LGW: "London", STN: "London",
  CDG: "Paris", ORY: "Paris",
  FCO: "Rome", MXP: "Milan", BGY: "Milan",
  BCN: "Barcelona", MAD: "Madrid",
  AMS: "Amsterdam", IST: "Istanbul", SAW: "Istanbul",
  ATH: "Athens", VIE: "Vienna", PRG: "Prague",
  LIS: "Lisbon", BER: "Berlin", BUD: "Budapest",
  DXB: "Dubai", OTP: "Bucharest", CLJ: "Cluj-Napoca",
  NRT: "Tokyo", HND: "Tokyo", JFK: "New York", EWR: "New York",
  DPS: "Bali", SIN: "Singapore", BKK: "Bangkok",
  RAK: "Marrakech", JTR: "Santorini", DBV: "Dubrovnik",
  CPH: "Copenhagen", ARN: "Stockholm", AYT: "Antalya",
  WAW: "Warsaw", KRK: "Krakow", SOF: "Sofia",
  BEG: "Belgrade", ZAG: "Zagreb", SPU: "Split",
  FRA: "Frankfurt", MUC: "Munich", BRU: "Brussels",
  TFS: "Tenerife", HER: "Crete",
};

// Destinations to try with Flight Offers when inspiration fails
const FALLBACK_DESTINATIONS = [
  "LHR", "CDG", "FCO", "BCN", "AMS", "IST",
  "DXB", "PRG", "VIE", "LIS", "MAD", "ATH", "BUD",
];

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function daysBetween(a: string, b: string): number {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

export async function GET(req: NextRequest) {
  const origin = (req.nextUrl.searchParams.get("origin") || "OTP").toUpperCase();
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "6", 10), 12);

  // ── 1. Try Flight Inspiration Search (one call, returns destinations + prices + dates) ──
  let inspirations: Array<{
    destination: string;
    departureDate: string;
    returnDate: string;
    price: number;
    days: number;
  }> = [];

  try {
    const raw = await searchFlightInspirations(origin);
    if (Array.isArray(raw) && raw.length > 0) {
      inspirations = raw
        .filter((r: any) => {
          const price = parseFloat(r.price?.total || r.price?.grandTotal || "0");
          return price > 0 && r.destination && r.destination !== origin;
        })
        .map((r: any) => ({
          destination: r.destination as string,
          departureDate: r.departureDate as string,
          returnDate: r.returnDate as string,
          price: Math.round(parseFloat(r.price.total || r.price.grandTotal) * 2), // one-way → round-trip estimate
          days: daysBetween(r.departureDate, r.returnDate || addDays(12)),
        }))
        .slice(0, limit * 2); // fetch more, filter later
    }
  } catch {
    // inspiration failed — will try flight offers below
  }

  // ── 2. If inspiration gave results, use them ──
  if (inspirations.length > 0) {
    const results = inspirations
      .filter((r) => IATA_CITY[r.destination]) // only known cities
      .slice(0, limit)
      .map((r) => ({
        code: r.destination,
        city: IATA_CITY[r.destination] ?? r.destination,
        price: r.price,
        originalPrice: Math.round(r.price * 1.25),
        departureDate: r.departureDate,
        returnDate: r.returnDate || addDays(12),
        days: r.days,
        airline: "",
        isLive: true,
      }));

    if (results.length > 0) {
      return NextResponse.json(
        { origin, results },
        { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
      );
    }
  }

  // ── 3. Inspiration failed or empty — try Flight Offers for each known destination ──
  const departureDate = addDays(7);
  const returnDate = addDays(12);

  const destinations = FALLBACK_DESTINATIONS.filter((d) => d !== origin);

  const settled = await Promise.allSettled(
    destinations.map(async (code) => {
      const offers = await searchFlights({
        originLocationCode: origin,
        destinationLocationCode: code,
        departureDate,
        returnDate,
        adults: "2",
        currencyCode: "EUR",
        max: "1",
      });

      const offer = offers?.[0];
      if (!offer) throw new Error("no offer");

      const price = parseFloat(
        offer.price?.grandTotal || offer.price?.total || "0"
      );
      if (price <= 0) throw new Error("price zero");

      const depAt =
        offer.itineraries?.[0]?.segments?.[0]?.departure?.at || departureDate;
      const retAt =
        offer.itineraries?.[offer.itineraries.length - 1]?.segments?.slice(-1)[0]?.arrival?.at ||
        returnDate;
      const realDep = depAt.split("T")[0];
      const realRet = retAt.split("T")[0];

      return {
        code,
        city: IATA_CITY[code] ?? code,
        price: Math.round(price),
        originalPrice: Math.round(price * 1.25),
        departureDate: realDep,
        returnDate: realRet,
        days: daysBetween(realDep, realRet),
        airline:
          offer.validatingAirlineCodes?.[0] ||
          offer.itineraries?.[0]?.segments?.[0]?.carrierCode ||
          "",
        isLive: true,
      };
    })
  );

  const results = settled
    .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer V> ? V : never> =>
      r.status === "fulfilled"
    )
    .map((r) => (r as any).value)
    .slice(0, limit);

  if (results.length === 0) {
    return NextResponse.json(
      { origin, results: [], error: "No live flight offers available right now." },
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  }

  return NextResponse.json(
    { origin, results },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
