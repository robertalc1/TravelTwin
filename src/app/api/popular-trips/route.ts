import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/amadeus-client";
import { COMMON_ROUTES } from "@/lib/commonRoutes";

export const revalidate = 900; // 15 min cache

const POPULAR_DESTINATIONS = [
  { code: "LHR", city: "London" },
  { code: "CDG", city: "Paris" },
  { code: "FCO", city: "Rome" },
  { code: "BCN", city: "Barcelona" },
  { code: "AMS", city: "Amsterdam" },
  { code: "IST", city: "Istanbul" },
  { code: "DXB", city: "Dubai" },
  { code: "PRG", city: "Prague" },
  { code: "VIE", city: "Vienna" },
  { code: "LIS", city: "Lisbon" },
];

// Fallback prices from commonRoutes, keyed by "from-to"
function getFallbackPrice(from: string, to: string): number {
  const route = COMMON_ROUTES.find(
    (r) => r.from === from && r.to === to
  );
  if (route) return route.avgPrice * 2; // round-trip estimate
  // generic fallback by region
  const defaults: Record<string, number> = {
    LHR: 299, CDG: 259, FCO: 239, BCN: 219, AMS: 249,
    IST: 229, DXB: 399, PRG: 199, VIE: 189, LIS: 279,
  };
  return defaults[to] ?? 249;
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const origin = (req.nextUrl.searchParams.get("origin") || "OTP").toUpperCase();
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "6", 10);

  const departureDate = addDays(7);
  const returnDate = addDays(12); // 5 nights

  const destinations = POPULAR_DESTINATIONS.filter(
    (d) => d.code !== origin
  ).slice(0, limit);

  const results = await Promise.all(
    destinations.map(async ({ code, city }) => {
      try {
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
        const price = offer
          ? parseFloat(offer.price?.grandTotal || offer.price?.total || "0")
          : 0;

        const airline =
          offer?.validatingAirlineCodes?.[0] ||
          offer?.itineraries?.[0]?.segments?.[0]?.carrierCode ||
          "";

        const depTime =
          offer?.itineraries?.[0]?.segments?.[0]?.departure?.at || "";

        const realDep = depTime ? depTime.split("T")[0] : departureDate;

        return {
          code,
          city,
          price: price > 0 ? Math.round(price) : getFallbackPrice(origin, code),
          originalPrice:
            price > 0 ? Math.round(price * 1.25) : Math.round(getFallbackPrice(origin, code) * 1.3),
          departureDate: realDep,
          returnDate,
          airline,
          isLive: price > 0,
        };
      } catch {
        const fallback = getFallbackPrice(origin, code);
        return {
          code,
          city,
          price: fallback,
          originalPrice: Math.round(fallback * 1.3),
          departureDate,
          returnDate,
          airline: "",
          isLive: false,
        };
      }
    })
  );

  return NextResponse.json({ origin, results }, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
  });
}
