"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plane, Hotel, ArrowLeft, MapPin, Star, Calendar,
  Coffee, Sun, Moon, ExternalLink, Lightbulb,
  CreditCard, Lock, Check, Shield, User,
} from "lucide-react";
import AttractionPhotos from "@/components/AttractionPhotos";
import { getCityFromIata, getCountryFromIata } from "@/lib/iataMapping";
import { Input } from "@/components/ui/Input";

/* ══════════════════════════════════════
   CITY DATA
   ══════════════════════════════════════ */

const CITY_IMAGES: Record<string, string> = {
  'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&h=700&fit=crop&q=85',
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=700&fit=crop&q=85',
  'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&h=700&fit=crop&q=85',
  'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1600&h=700&fit=crop&q=85',
  'Amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1600&h=700&fit=crop&q=85',
  'Istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&h=700&fit=crop&q=85',
  'Athens': 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1600&h=700&fit=crop&q=85',
  'Vienna': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1600&h=700&fit=crop&q=85',
  'Prague': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1600&h=700&fit=crop&q=85',
  'Lisbon': 'https://images.unsplash.com/photo-1548707309-dcebeab9ea9b?w=1600&h=700&fit=crop&q=85',
  'Berlin': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1600&h=700&fit=crop&q=85',
  'Madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1600&h=700&fit=crop&q=85',
  'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&h=700&fit=crop&q=85',
  'Bucharest': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=700&fit=crop&q=85',
  'Budapest': 'https://images.unsplash.com/photo-1549877452-9c387954fbc2?w=1600&h=700&fit=crop&q=85',
  'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&h=700&fit=crop&q=85',
  'New York': 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1600&h=700&fit=crop&q=85',
  'Milan': 'https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=1600&h=700&fit=crop&q=85',
  'Warsaw': 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=1600&h=700&fit=crop&q=85',
  'Krakow': 'https://images.unsplash.com/photo-1562696482-dc5d3aa5eb0f?w=1600&h=700&fit=crop&q=85',
  'Copenhagen': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1600&h=700&fit=crop&q=85',
  'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1600&h=700&fit=crop&q=85',
  'Bangkok': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&h=700&fit=crop&q=85',
  'Dubrovnik': 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=1600&h=700&fit=crop&q=85',
};

const IATA_CITY: Record<string, string> = {
  LHR: 'London', LGW: 'London', STN: 'London', LTN: 'London', LCY: 'London',
  CDG: 'Paris', ORY: 'Paris', FCO: 'Rome', MXP: 'Milan', LIN: 'Milan',
  BCN: 'Barcelona', MAD: 'Madrid', AMS: 'Amsterdam', IST: 'Istanbul', SAW: 'Istanbul',
  ATH: 'Athens', VIE: 'Vienna', PRG: 'Prague', LIS: 'Lisbon', BER: 'Berlin',
  BUD: 'Budapest', DXB: 'Dubai', OTP: 'Bucharest', CLJ: 'Bucharest',
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

const CITY_COORDS: Record<string, [number, number]> = {
  'London': [51.5074, -0.1278], 'Paris': [48.8566, 2.3522], 'Rome': [41.9028, 12.4964],
  'Barcelona': [41.3874, 2.1686], 'Amsterdam': [52.3676, 4.9041], 'Istanbul': [41.0082, 28.9784],
  'Athens': [37.9838, 23.7275], 'Vienna': [48.2082, 16.3738], 'Prague': [50.0755, 14.4378],
  'Lisbon': [38.7223, -9.1393], 'Berlin': [52.52, 13.405], 'Madrid': [40.4168, -3.7038],
  'Dubai': [25.2048, 55.2708], 'Bucharest': [44.4268, 26.1025], 'Budapest': [47.4979, 19.0402],
  'Tokyo': [35.6762, 139.6503], 'New York': [40.7128, -74.006], 'Milan': [45.4642, 9.19],
  'Warsaw': [52.2297, 21.0122], 'Krakow': [50.0647, 19.945], 'Copenhagen': [55.6761, 12.5683],
  'Singapore': [1.3521, 103.8198], 'Bangkok': [13.7563, 100.5018], 'Dubrovnik': [42.6507, 18.0944],
};

const CITY_ATTRACTIONS: Record<string, string[]> = {
  'London': ['Tower of London', 'Big Ben', 'Buckingham Palace', 'London Eye', 'British Museum'],
  'Paris': ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Sacré-Cœur', 'Champs-Élysées'],
  'Barcelona': ['Sagrada Familia', 'Park Güell', 'La Rambla', 'Casa Batlló', 'Gothic Quarter'],
  'Rome': ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Pantheon', 'Roman Forum'],
  'Amsterdam': ['Rijksmuseum', 'Anne Frank House', 'Van Gogh Museum', 'Vondelpark', 'Dam Square'],
  'Istanbul': ['Hagia Sophia', 'Blue Mosque', 'Grand Bazaar', 'Topkapi Palace', 'Galata Tower'],
  'Athens': ['Acropolis', 'Parthenon', 'Plaka District', 'Temple of Zeus', 'Monastiraki'],
  'Prague': ['Charles Bridge', 'Prague Castle', 'Old Town Square', 'Astronomical Clock', 'Vyšehrad'],
  'Budapest': ['Parliament Building', 'Buda Castle', 'Széchenyi Baths', 'Fishermans Bastion', 'Chain Bridge'],
  'Vienna': ['Schönbrunn Palace', 'St Stephens Cathedral', 'Belvedere Museum', 'Prater', 'Hofburg'],
  'Lisbon': ['Belém Tower', 'Jerónimos Monastery', 'Alfama District', 'Tram 28', 'Time Out Market'],
  'Berlin': ['Brandenburg Gate', 'Berlin Wall Memorial', 'Museum Island', 'Reichstag', 'East Side Gallery'],
  'Dubai': ['Burj Khalifa', 'Dubai Mall', 'Palm Jumeirah', 'Dubai Marina', 'Gold Souk'],
  'Madrid': ['Prado Museum', 'Royal Palace', 'Retiro Park', 'Plaza Mayor', 'Puerta del Sol'],
  'Bucharest': ['Palace of Parliament', 'Old Town', 'Romanian Athenaeum', 'Village Museum', 'Herăstrău Park'],
};

/* ══════════════════════════════════════
   HELPERS
   ══════════════════════════════════════ */

function resolveCity(code: string, cityName?: string): string {
  if (cityName && cityName !== code && cityName.length > 2) return cityName;
  return IATA_CITY[code] || getCityFromIata(code) || code;
}

function resolveCountry(code: string, countryName?: string): string {
  if (countryName && countryName.length > 1) return countryName;
  return getCountryFromIata(code) || '';
}

function resolveImage(city: string, code: string, imageUrl?: string): string {
  if (imageUrl) return imageUrl;
  return (
    CITY_IMAGES[city] ||
    CITY_IMAGES[IATA_CITY[code] || ''] ||
    'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=700&fit=crop&q=85'
  );
}

function resolveAttractions(city: string): string[] {
  return CITY_ATTRACTIONS[city] || [
    `${city} City Center`, 'Local Museum', 'Traditional Market', 'Scenic Viewpoint', 'Historic Quarter',
  ];
}

function resolveCoords(city: string): [number, number] {
  return CITY_COORDS[city] || [48.8566, 2.3522];
}

function fmtTime(v: string): string {
  if (!v) return '';
  try {
    return new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return v.includes('T') ? v.split('T')[1]?.substring(0, 5) || '' : v;
  }
}

function fmtDur(v: string): string {
  if (!v) return '';
  const h = v.match(/(\d+)H/)?.[1];
  const m = v.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || v;
}

function fmtDate(v: string): string {
  if (!v) return '';
  try {
    return new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return v;
  }
}

function buildDayPlan(city: string, country: string, nights: number) {
  const days = [];
  const total = Math.min(nights + 1, 10);
  for (let i = 0; i < total; i++) {
    if (i === 0) {
      days.push({
        day: 1,
        title: `Arrival in ${city}`,
        morning: { activity: 'Airport arrival & hotel check-in', description: 'Get settled in and freshen up', type: 'transport' },
        afternoon: { activity: `Explore ${city} city center`, description: 'Walk around the main attractions', type: 'sightseeing' },
        evening: { activity: 'Dinner at a local restaurant', description: `Try authentic ${country} cuisine`, type: 'dining' },
      });
    } else if (i === total - 1) {
      days.push({
        day: i + 1,
        title: 'Final Day & Departure',
        morning: { activity: 'Breakfast at local café', description: 'Start your day fresh', type: 'dining' },
        afternoon: { activity: `Explore ${city} highlights`, description: 'Visit the top sights and local neighborhoods', type: 'sightseeing' },
        evening: { activity: 'Return flight home', description: 'Head to the airport and depart', type: 'transport' },
      });
    } else {
      days.push({
        day: i + 1,
        title: `Explore ${city} – Day ${i + 1}`,
        morning: { activity: 'Breakfast at local café', description: 'Start your day fresh', type: 'dining' },
        afternoon: { activity: `${city} highlights & landmarks`, description: 'Visit the top sights and local neighborhoods', type: 'sightseeing' },
        evening: { activity: 'Dinner at a local restaurant', description: `Enjoy the best of ${country} cuisine`, type: 'dining' },
      });
    }
  }
  return days;
}

/* ══════════════════════════════════════
   BOOKING SIDEBAR
   ══════════════════════════════════════ */

function BookingSection({
  price, currency, city, nights,
}: { price: number; currency: string; city: string; nights: number }) {
  const [step, setStep] = useState<'summary' | 'traveler' | 'payment' | 'confirmed'>('summary');
  const [processing, setProcessing] = useState(false);
  const [bookingRef] = useState(() => 'TW-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency + ' ';

  if (step === 'confirmed') {
    return (
      <div className="text-center py-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1">Booking Confirmed!</h3>
        <p className="text-sm text-text-muted mb-3">
          Reference: <span className="font-mono font-bold text-primary-500">{bookingRef}</span>
        </p>
        <p className="text-xs text-text-muted">{nights} nights in {city}</p>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('traveler')} className="text-sm text-primary-500 hover:underline flex items-center gap-1">
          ← Back
        </button>
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary-500" /> Payment
        </h3>
        <Input label="Card Number" placeholder="4242 4242 4242 4242" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Expiry" placeholder="MM/YY" />
          <Input label="CVC" placeholder="123" />
        </div>
        <Input label="Cardholder Name" placeholder="Full name on card" />
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Lock className="h-3 w-3 text-green-500" /> Encrypted &amp; secure
        </div>
        <button
          onClick={async () => {
            setProcessing(true);
            await new Promise((r) => setTimeout(r, 2500));
            setProcessing(false);
            setStep('confirmed');
          }}
          disabled={processing}
          className="w-full rounded-xl bg-primary-500 py-3 font-bold text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Processing...
            </span>
          ) : `Pay ${sym}${Math.round(price).toLocaleString()}`}
        </button>
      </div>
    );
  }

  if (step === 'traveler') {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('summary')} className="text-sm text-primary-500 hover:underline flex items-center gap-1">
          ← Back
        </button>
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <User className="h-4 w-4 text-primary-500" /> Traveler Details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" placeholder="John" />
          <Input label="Last Name" placeholder="Doe" />
        </div>
        <Input label="Email" type="email" placeholder="john@example.com" />
        <Input label="Phone" type="tel" placeholder="+40 7XX XXX XXX" />
        <button
          onClick={() => setStep('payment')}
          className="w-full rounded-xl bg-primary-500 py-3 font-bold text-white hover:bg-primary-600 transition-colors"
        >
          Continue to Payment →
        </button>
      </div>
    );
  }

  // Summary (default)
  return (
    <div className="space-y-5">
      <h3 className="font-bold text-lg text-secondary-500">Price Summary</h3>
      <div className="text-center py-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
        <p className="text-xs text-text-muted mb-1">Total price</p>
        <p className="text-4xl font-extrabold text-primary-500">{sym}{Math.round(price).toLocaleString()}</p>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="flex items-center gap-2 text-text-secondary"><Plane className="h-4 w-4" /> Roundtrip flight</span>
          <span className="font-semibold">{sym}{Math.round(price * 0.6).toLocaleString()}</span>
        </div>
        {price > 300 && (
          <div className="flex justify-between">
            <span className="flex items-center gap-2 text-text-secondary"><Hotel className="h-4 w-4" /> Hotel ({nights} nights)</span>
            <span className="font-semibold">{sym}{Math.round(price * 0.4).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="flex items-center gap-2 text-text-secondary"><Calendar className="h-4 w-4" /> Duration</span>
          <span className="font-semibold">{nights} nights</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-2 text-text-secondary"><MapPin className="h-4 w-4" /> Destination</span>
          <span className="font-semibold">{city}</span>
        </div>
      </div>
      <div className="bg-neutral-50 dark:bg-surface-elevated rounded-xl p-4">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Est. daily expenses</p>
        {[{ k: 'Food', v: 35 }, { k: 'Transport', v: 15 }, { k: 'Activities', v: 25 }].map(({ k, v }) => (
          <div key={k} className="flex justify-between text-xs mb-1.5">
            <span className="text-text-muted">{k}</span>
            <span className="font-medium">€{v}/day</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setStep('traveler')}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary-500 px-6 py-4 font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
      >
        Book Now <ExternalLink className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 text-xs text-text-muted justify-center">
        <Shield className="h-3.5 w-3.5 text-green-500" /> Free cancellation within 24h
      </div>
      <p className="text-xs text-text-muted text-center">Prices shown are estimates. Final price may vary.</p>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TripData = Record<string, any>;

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) { router.push('/'); return; }

    // 1. Try tripView_ (from homepage "View deal")
    const tv = sessionStorage.getItem(`tripView_${id}`);
    if (tv) { setTrip(JSON.parse(tv)); setLoading(false); return; }

    // 2. Try trip_ (from plan results)
    const tp = sessionStorage.getItem(`trip_${id}`);
    if (tp) {
      const pkg = JSON.parse(tp);
      setTrip({
        destinationCode: pkg.destination?.iata || '',
        destinationCity: pkg.destination?.city || '',
        destinationCountry: pkg.destination?.country || '',
        imageId: pkg.destination?.imageId || '',
        departureDate: pkg.flight?.departureTime?.split('T')[0] || '',
        returnDate: '',
        nights: pkg.nights || 3,
        price: pkg.totalPrice || 0,
        currency: pkg.currency || 'EUR',
        airline: pkg.flight?.airline || '',
        airlineCode: pkg.flight?.airlineCode || '',
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
        aiContent: pkg.aiContent || null,
      });
      setLoading(false);
      return;
    }

    // 3. Try planResults
    const pr = sessionStorage.getItem('planResults');
    if (pr) {
      const { packages } = JSON.parse(pr);
      const found = packages?.find((p: TripData) => p.id === id);
      if (found) {
        sessionStorage.setItem(`trip_${id}`, JSON.stringify(found));
        window.location.reload();
        return;
      }
    }

    setLoading(false);
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

  if (!trip) {
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

  // Resolve all data
  const code = trip.destinationCode || trip.destination || '';
  const city = resolveCity(code, trip.destinationCity);
  const country = resolveCountry(code, trip.destinationCountry);
  const nights = trip.nights || trip.days || 3;
  const price = trip.price || trip.totalPrice || 0;
  const currency = trip.currency || 'EUR';
  const heroUrl = trip.imageId
    ? `https://images.unsplash.com/${trip.imageId}?w=1600&h=700&fit=crop&q=85`
    : resolveImage(city, code, trip.imageUrl);
  const attractions = resolveAttractions(city);
  const [lat, lon] = resolveCoords(city);
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.08},${lat - 0.05},${lon + 0.08},${lat + 0.05}&layer=mapnik&marker=${lat},${lon}`;
  const ai = trip.aiContent;
  const dayPlan = ai?.dayByDay || buildDayPlan(city, country, nights);
  const localTips: string[] = ai?.localTips || [
    'Book popular restaurants in advance',
    'Use local public transport to save money',
    'Visit popular attractions early morning to avoid crowds',
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">

      {/* ── HERO ── */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={heroUrl}
          alt={city}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=700&fit=crop&q=85';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Link>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white">
            {nights} days in {city}{country ? `, ${country}` : ''}
          </h1>
          {trip.departureTime && (
            <p className="text-white/80 mt-2 text-lg">
              {fmtTime(trip.departureTime)} – {fmtTime(trip.arrivalTime || '')}
              {trip.duration ? ` · ${fmtDur(trip.duration)}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── LEFT COLUMN (2/3) ── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Your Trip */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-3">Your Trip</h2>
              <p className="text-text-secondary leading-relaxed">
                {ai?.description ||
                  `Discover the magic of ${city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${country || city}'s culture and beauty.`}
              </p>
            </section>

            {/* Your Itinerary — Flight card */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-4">Your Itinerary</h2>
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <Plane className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-secondary-500">Outbound Flight</p>
                    <p className="text-sm text-text-muted">
                      {trip.airlineCode || trip.airline || 'Airline'} ·{' '}
                      {trip.stops === 0 ? 'Direct' : `${trip.stops ?? 1} stop`}
                    </p>
                  </div>
                  {trip.airlineCode && /^[A-Z0-9]{2}$/.test(trip.airlineCode) && (
                    <img
                      src={`https://pics.avs.io/100/40/${trip.airlineCode}.png`}
                      alt=""
                      className="ml-auto h-8 object-contain"
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-xl font-bold text-secondary-500">{fmtTime(trip.departureTime || '') || '—'}</p>
                    <p className="text-text-muted text-xs">Departure</p>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {trip.duration ? fmtDur(trip.duration) : 'Flight'}
                    </span>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-secondary-500">{fmtTime(trip.arrivalTime || '') || '—'}</p>
                    <p className="text-text-muted text-xs">{city}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Hotel card */}
            {trip.hotelName && (
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-50 text-secondary-500">
                    <Hotel className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-secondary-500">{trip.hotelName}</p>
                    {trip.hotelStars > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: trip.hotelStars }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-xs text-text-muted ml-1">{trip.hotelStars} stars</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-500">
                      {currency === 'EUR' ? '€' : '$'}{trip.hotelPricePerNight || Math.round((trip.hotelPrice || 0) / nights)}/night
                    </p>
                    <p className="text-xs text-text-muted">{nights} nights total</p>
                  </div>
                </div>
                {trip.hotelCheckIn && (
                  <div className="flex gap-4 mt-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Check-in: {fmtDate(trip.hotelCheckIn)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Check-out: {fmtDate(trip.hotelCheckOut)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Day-by-Day Plan */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-6">Day-by-Day Plan</h2>
              <div className="space-y-4">
                {dayPlan.map((day: TripData) => (
                  <div key={day.day} className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-3">
                      <h3 className="font-bold text-white">Day {day.day}: {day.title}</h3>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-border-default">
                      {[
                        { label: 'Morning', icon: Coffee, slot: day.morning },
                        { label: 'Afternoon', icon: Sun, slot: day.afternoon },
                        { label: 'Evening', icon: Moon, slot: day.evening },
                      ].map(({ label, icon: Icon, slot }) => (
                        <div key={label} className="flex items-start gap-4 px-5 py-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-surface-elevated text-text-secondary shrink-0 mt-0.5">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
                            <p className="font-semibold text-secondary-500 text-sm">{slot?.activity || 'Free time'}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{slot?.description || ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Top Attractions */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-4">Top Attractions</h2>
              <AttractionPhotos names={ai?.topAttractions || attractions} city={city} />
            </section>

            {/* Map */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-4">Map</h2>
              <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default h-64 md:h-80">
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  title={`Map of ${city}`}
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-text-muted mt-2 text-center">
                {city}{country ? `, ${country}` : ''} · {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
              </p>
            </section>

            {/* Local Tips */}
            <section>
              <h2 className="text-xl font-bold text-secondary-500 mb-4">Local Tips</h2>
              <div className="space-y-3">
                {localTips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-white dark:bg-surface rounded-xl border border-neutral-200 dark:border-border-default p-4">
                    <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-text-secondary">{tip}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN (1/3 sticky) ── */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6 shadow-md">
              <BookingSection price={price} currency={currency} city={city} nights={nights} />
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
