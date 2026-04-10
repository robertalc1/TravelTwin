"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { TripCard } from "@/components/results/TripCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCityImageByIata } from "@/lib/cityImages";

// Specific Unsplash search queries per IATA code
const CITY_QUERIES: Record<string, string> = {
  LHR: "London Big Ben city landmark",
  CDG: "Paris Eiffel Tower city",
  FCO: "Rome Colosseum city",
  BCN: "Barcelona Sagrada Familia city",
  AMS: "Amsterdam canals city",
  IST: "Istanbul Bosphorus city",
  DXB: "Dubai skyline city",
  PRG: "Prague castle city",
  VIE: "Vienna Austria city",
  LIS: "Lisbon Portugal city",
  BER: "Berlin Brandenburg Gate city",
  MAD: "Madrid Spain city",
  ATH: "Athens Acropolis city",
  BUD: "Budapest Parliament city",
  WAW: "Warsaw Poland city",
  MXP: "Milan Italy city",
  MUC: "Munich Bavaria city",
  FRA: "Frankfurt Germany city",
  BRU: "Brussels Belgium city",
  CPH: "Copenhagen Denmark city",
  ARN: "Stockholm Sweden city",
  ZRH: "Zurich Switzerland city",
  DBV: "Dubrovnik Croatia city",
  JTR: "Santorini Greece island",
  DPS: "Bali Indonesia temple",
  BKK: "Bangkok Thailand temple",
  NRT: "Tokyo Japan city",
  JFK: "New York City skyline",
  SIN: "Singapore city skyline",
  RAK: "Marrakech Morocco medina",
};

// Map city names / countries from Nominatim to nearest IATA code
const CITY_TO_IATA: Record<string, string> = {
  București: "OTP", Bucuresti: "OTP", Bucharest: "OTP",
  Constanța: "OTP", Constanta: "OTP",
  Brașov: "OTP", Brasov: "OTP",
  Ploiești: "OTP", Ploiesti: "OTP",
  "Câmpina": "OTP",
  Cluj: "CLJ", "Cluj-Napoca": "CLJ",
  Timișoara: "TSR", Timisoara: "TSR",
  Iași: "IAS", Iasi: "IAS",
  Sibiu: "SBZ",
  Oradea: "OMR",
  "Baia Mare": "BAY",
  Craiova: "CRA",
  London: "LHR",
  Paris: "CDG",
  Rome: "FCO", Roma: "FCO",
  Barcelona: "BCN",
  Amsterdam: "AMS",
  Berlin: "BER",
  Madrid: "MAD",
  Vienna: "VIE", Wien: "VIE",
  Prague: "PRG", Praha: "PRG",
  Istanbul: "IST",
  Dubai: "DXB",
  Warsaw: "WAW", Warszawa: "WAW",
  Budapest: "BUD",
  Athens: "ATH", Athen: "ATH",
  Lisbon: "LIS", Lisboa: "LIS",
  Milan: "MXP", Milano: "MXP",
  Munich: "MUC", München: "MUC",
  Frankfurt: "FRA",
  Brussels: "BRU", Bruxelles: "BRU",
  Zurich: "ZRH", Zürich: "ZRH",
  Copenhagen: "CPH", København: "CPH",
  Stockholm: "ARN",
  Oslo: "OSL",
  Helsinki: "HEL",
  Dubrovnik: "DBV",
  Split: "SPU",
  Zagreb: "ZAG",
};

function detectIata(city: string, country: string): string {
  for (const [name, iata] of Object.entries(CITY_TO_IATA)) {
    if (
      city.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(city.toLowerCase())
    ) {
      return iata;
    }
  }
  const countryMap: Record<string, string> = {
    Romania: "OTP", "United Kingdom": "LHR", France: "CDG",
    Italy: "FCO", Spain: "BCN", Netherlands: "AMS",
    Germany: "FRA", Austria: "VIE", "Czech Republic": "PRG",
    Turkey: "IST", Portugal: "LIS", Greece: "ATH",
    Hungary: "BUD", Poland: "WAW",
  };
  return countryMap[country] || "OTP";
}

interface TripOffer {
  code: string;
  city: string;
  price: number;
  originalPrice: number;
  departureDate: string;
  returnDate: string;
  airline: string;
  isLive: boolean;
}

export default function PopularTrips() {
  const [originIata, setOriginIata] = useState("OTP");
  const [originCity, setOriginCity] = useState("Bucharest");
  const [locationStatus, setLocationStatus] = useState<
    "detecting" | "detected" | "denied" | "error"
  >("detecting");
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  // Unsplash image URLs keyed by IATA code
  const [cityImages, setCityImages] = useState<Record<string, string>>({});

  // Fetch Unsplash images for a list of IATA codes
  const fetchCityImages = useCallback(async (codes: string[]) => {
    const entries = await Promise.all(
      codes.map(async (code) => {
        const query = CITY_QUERIES[code] || `${code} city travel`;
        try {
          const res = await fetch(
            `/api/unsplash?query=${encodeURIComponent(query)}`
          );
          if (!res.ok) return [code, null] as const;
          const data = await res.json();
          return [code, data.url || null] as const;
        } catch {
          return [code, null] as const;
        }
      })
    );
    const map: Record<string, string> = {};
    for (const [code, url] of entries) {
      if (url) map[code] = url;
    }
    setCityImages((prev) => ({ ...prev, ...map }));
  }, []);

  const fetchOffers = useCallback(
    async (iata: string) => {
      setLoadingOffers(true);
      try {
        const res = await fetch(`/api/popular-trips?origin=${iata}&limit=6`);
        const data = await res.json();
        const results: TripOffer[] = data.results || [];
        setOffers(results);
        // Kick off image fetching in parallel
        if (results.length > 0) {
          fetchCityImages(results.map((r) => r.code));
        }
      } catch {
        setOffers([]);
      } finally {
        setLoadingOffers(false);
      }
    },
    [fetchCityImages]
  );

  const detectLocation = useCallback(() => {
    setLocationStatus("detecting");
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      fetchOffers("OTP");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Bucharest";
          const country = data.address?.country || "";
          const iata = detectIata(city, country);
          setOriginCity(city);
          setOriginIata(iata);
          setLocationStatus("detected");
          fetchOffers(iata);
        } catch {
          setLocationStatus("error");
          fetchOffers("OTP");
        }
      },
      () => {
        setLocationStatus("denied");
        fetchOffers("OTP");
      },
      { timeout: 8000 }
    );
  }, [fetchOffers]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const skeletonCount = 6;

  return (
    <section className="py-10 lg:py-14 bg-neutral-50 dark:bg-surface-sunken">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-h2 text-secondary-500">Popular Trips</h2>
            <div className="flex items-center gap-2 mt-1 h-5">
              {locationStatus === "detecting" ? (
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 animate-pulse text-primary-400" />
                  Detecting your location...
                </span>
              ) : locationStatus === "detected" ? (
                <span className="text-xs text-text-secondary flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary-500" />
                  Showing flights from{" "}
                  <strong className="ml-1">{originCity}</strong>
                </span>
              ) : (
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <span>📍 Allow location for personalized offers</span>
                  <button
                    onClick={detectLocation}
                    className="flex items-center gap-1 text-primary-500 hover:text-primary-600 font-medium transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingOffers
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border border-neutral-200 dark:border-border-default bg-white dark:bg-surface"
                >
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex justify-between items-end pt-2">
                      <Skeleton className="h-7 w-24" />
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))
            : offers.map((offer, i) => (
                <div key={offer.code} className="stagger-item">
                  <TripCard
                    id={`popular-${offer.code}`}
                    destination={offer.code}
                    destinationCity={offer.city}
                    origin={originIata}
                    originCity={originCity}
                    // Use Unsplash image if available, otherwise fallback to cityImages.ts
                    imageUrl={
                      cityImages[offer.code] ?? getCityImageByIata(offer.code)
                    }
                    days={5}
                    departureDate={offer.departureDate}
                    returnDate={offer.returnDate}
                    originalPrice={offer.originalPrice}
                    discountedPrice={offer.price}
                    currency="EUR"
                    isDirect={i % 2 === 0}
                    travelers={2}
                    viewDealHref={`/plan?from=${originIata}&to=${offer.code}&days=5&budget=${offer.price + 200}`}
                  />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
