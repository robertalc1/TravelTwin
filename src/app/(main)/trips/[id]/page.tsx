"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCityFromIata, getCountryFromIata } from "@/lib/iataMapping";
import { TripDetail, resolveCoordsForCity } from "@/lib/tripDetail";
import TripDetailView from "@/components/TripDetailView";

/* ── IATA → city name map (kept for legacy tripView_ data) ── */
const IATA_CITY: Record<string, string> = {
  LHR: 'London', LGW: 'London', STN: 'London', LTN: 'London', LCY: 'London',
  CDG: 'Paris', ORY: 'Paris', FCO: 'Rome', MXP: 'Milan', LIN: 'Milan',
  BCN: 'Barcelona', MAD: 'Madrid', AMS: 'Amsterdam', IST: 'Istanbul', SAW: 'Istanbul',
  ATH: 'Athens', VIE: 'Vienna', PRG: 'Prague', LIS: 'Lisbon', BER: 'Berlin',
  BUD: 'Budapest', DXB: 'Dubai', OTP: 'Bucharest', CLJ: 'Cluj-Napoca',
  NRT: 'Tokyo', HND: 'Tokyo', JFK: 'New York', EWR: 'New York',
  WAW: 'Warsaw', KRK: 'Krakow', CPH: 'Copenhagen', SIN: 'Singapore', BKK: 'Bangkok',
  DBV: 'Dubrovnik', SPU: 'Split', ZAG: 'Zagreb', SOF: 'Sofia', BEG: 'Belgrade',
  MUC: 'Munich', FRA: 'Frankfurt', HAM: 'Hamburg', DUS: 'Düsseldorf',
  NCE: 'Nice', LYS: 'Lyon', MRS: 'Marseille',
  VCE: 'Venice', NAP: 'Naples', FLR: 'Florence',
  AGP: 'Malaga', PMI: 'Palma de Mallorca', ALC: 'Alicante',
  BRU: 'Brussels', ZRH: 'Zurich', GVA: 'Geneva',
  SKG: 'Thessaloniki', HER: 'Heraklion', JTR: 'Santorini',
  AYT: 'Antalya', ESB: 'Ankara',
  ARN: 'Stockholm', OSL: 'Oslo', HEL: 'Helsinki',
  DUB: 'Dublin', GDN: 'Gdansk', WRO: 'Wroclaw',
  IAS: 'Iași', TSR: 'Timișoara', SBZ: 'Sibiu', CND: 'Constanța',
};

function resolveCity(code: string, cityName?: string): string {
  if (cityName && cityName !== code && cityName.length > 2) return cityName;
  return IATA_CITY[code] || getCityFromIata(code) || code;
}

function resolveCountry(code: string, countryName?: string): string {
  if (countryName && countryName.length > 1) return countryName;
  return getCountryFromIata(code) || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTripDetail(id: string, raw: Record<string, any>): Promise<TripDetail> {
  const code = raw.destinationCode || raw.destination || '';
  const city = resolveCity(code, raw.destinationCity);
  const country = resolveCountry(code, raw.destinationCountry);
  const nights = raw.nights || raw.days || 3;
  const totalPrice = raw.price || raw.totalPrice || 0;

  // Resolve coordinates — use stored values first, then CITY_COORDS lookup, then Nominatim
  let lat = raw.destinationLat;
  let lon = raw.destinationLon;

  if (!lat || !lon) {
    const fallback = resolveCoordsForCity(city);
    // If fallback is Paris default (48.8566, 2.3522) and city is not Paris, try Nominatim
    if (fallback[0] === 48.8566 && fallback[1] === 2.3522 && city !== 'Paris') {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'TravelTwin/1.0' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data[0]) {
            lat = parseFloat(data[0].lat);
            lon = parseFloat(data[0].lon);
          }
        }
      } catch { /* ignore */ }
    }
    if (!lat || !lon) {
      [lat, lon] = fallback;
    }
  }

  return {
    id,
    destinationCode: code,
    destinationCity: city,
    destinationCountry: country,
    destinationLat: lat,
    destinationLon: lon,
    imageId: raw.imageId || undefined,
    nights,
    departureDate: raw.departureDate || raw.departureTime?.split('T')[0] || '',
    returnDate: raw.returnDate || '',
    currency: raw.currency || 'EUR',
    totalPrice,
    airline: raw.airline || '',
    airlineCode: raw.airlineCode || '',
    flightPrice: raw.flightPrice || Math.round(totalPrice * 0.6),
    departureTime: raw.departureTime || '',
    arrivalTime: raw.arrivalTime || '',
    duration: raw.duration || '',
    stops: raw.stops ?? 1,
    hotelName: raw.hotelName || '',
    hotelStars: raw.hotelStars || 3,
    hotelPrice: raw.hotelPrice || Math.round(totalPrice * 0.4),
    hotelPricePerNight: raw.hotelPricePerNight || (raw.hotelPrice ? Math.round(raw.hotelPrice / nights) : 0),
    hotelCheckIn: raw.hotelCheckIn || raw.departureDate || '',
    hotelCheckOut: raw.hotelCheckOut || raw.returnDate || '',
    hotelAmenities: raw.hotelAmenities,
    aiContent: raw.aiContent || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePkg(pkg: Record<string, any>): Record<string, any> {
  // Convert TripPackage format (nested destination/flight/hotel) to flat TripDetail-compatible
  if (pkg.destination || pkg.flight) {
    return {
      destinationCode: pkg.destination?.iata || pkg.destinationCode || '',
      destinationCity: pkg.destination?.city || pkg.destinationCity || '',
      destinationCountry: pkg.destination?.country || pkg.destinationCountry || '',
      destinationLat: pkg.destination?.lat || pkg.destinationLat,
      destinationLon: pkg.destination?.lon || pkg.destinationLon,
      imageId: pkg.destination?.imageId || pkg.imageId,
      nights: pkg.nights || 3,
      departureDate: pkg.flight?.departureTime?.split('T')[0] || '',
      returnDate: '',
      currency: pkg.currency || 'EUR',
      totalPrice: pkg.totalPrice || 0,
      airline: pkg.flight?.airline || '',
      airlineCode: pkg.flight?.airlineCode || '',
      flightPrice: pkg.flight?.price || 0,
      departureTime: pkg.flight?.departureTime || '',
      arrivalTime: pkg.flight?.arrivalTime || '',
      duration: pkg.flight?.duration || '',
      stops: pkg.flight?.stops ?? 1,
      hotelName: pkg.hotel?.name || '',
      hotelStars: pkg.hotel?.stars || 3,
      hotelPrice: pkg.hotel?.price || 0,
      hotelPricePerNight: pkg.hotel?.pricePerNight || 0,
      hotelCheckIn: pkg.hotel?.checkIn || '',
      hotelCheckOut: pkg.hotel?.checkOut || '',
      hotelAmenities: pkg.hotel?.amenities,
      aiContent: pkg.aiContent || null,
    };
  }
  return pkg;
}

/* ══════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════ */

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) { router.push('/'); return; }

    let rawData: Record<string, any> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    // 1. Try tripView_ (from homepage "View deal")
    const tv = sessionStorage.getItem(`tripView_${id}`);
    if (tv) {
      rawData = normalizePkg(JSON.parse(tv));
    }

    // 2. Try trip_ (from plan results)
    if (!rawData) {
      const tp = sessionStorage.getItem(`trip_${id}`);
      if (tp) {
        rawData = normalizePkg(JSON.parse(tp));
      }
    }

    // 3. Try planResults
    if (!rawData) {
      const pr = sessionStorage.getItem('planResults');
      if (pr) {
        const { packages } = JSON.parse(pr);
        const found = packages?.find((p: any) => p.id === id); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (found) {
          sessionStorage.setItem(`trip_${id}`, JSON.stringify(found));
          rawData = normalizePkg(found);
        }
      }
    }

    if (!rawData) {
      setLoading(false);
      return;
    }

    buildTripDetail(id, rawData).then(async (detail) => {
      setTripDetail(detail);
      setLoading(false);

      // If no AI content, fetch itinerary so the page matches Plan My Trip results
      if (!detail.aiContent) {
        try {
          const res = await fetch('/api/itinerary/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city: detail.destinationCity,
              country: detail.destinationCountry,
              nights: detail.nights,
              travelStyles: [],
              budget: detail.totalPrice,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.itinerary) {
              setTripDetail(prev => prev ? { ...prev, aiContent: data.itinerary } : prev);
            }
          }
        } catch { /* ignore – itinerary is optional */ }
      }
    });
  }, [params, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">✈️</div>
          <p className="text-text-secondary">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (!tripDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Trip not found</h2>
          <p className="text-text-secondary mb-6">This trip may have expired or been cleared.</p>
          <Link href="/" className="rounded-xl bg-primary-500 px-6 py-3 font-bold text-white hover:bg-primary-600">
            Search Trips
          </Link>
        </div>
      </div>
    );
  }

  return <TripDetailView trip={tripDetail} backHref="/" backLabel="Back to results" />;
}
