import type { Metadata } from "next";
import Link from "next/link";
import { Plane, Hotel, MapPin, Calendar, Users, Star, Clock, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Trip Itinerary — TravelTwin",
  description: "View and share your personalized travel itinerary",
};

export default function TripSharePage({ params }: { params: { ref: string } }) {
  const bookingRef = params.ref;

  // In a real app, fetch trip data from Supabase using bookingRef
  // For demo, use static data
  const trip = {
    title: "London Adventure",
    destination: "London, United Kingdom",
    origin: "Bucharest, Romania",
    dates: "March 22 – March 29, 2026",
    nights: 7,
    travelers: 1,
    flight: {
      airline: "Blue Air",
      flightNumber: "0B 403",
      departure: { time: "07:30", airport: "OTP", city: "Bucharest" },
      arrival: { time: "10:45", airport: "LHR", city: "London" },
      duration: "3h 15m",
      price: 189,
    },
    hotel: {
      name: "Premier Inn London City",
      stars: 3,
      address: "Tower Hill, London EC3N 4AJ",
      checkIn: "March 22, 2026",
      checkOut: "March 29, 2026",
      pricePerNight: 95,
      total: 665,
      amenities: ["Free WiFi", "Restaurant", "24h Front Desk", "Air Conditioning"],
    },
    itinerary: [
      {
        day: 1,
        title: "Arrival & Tower of London",
        morning: "Fly from Bucharest OTP → London LHR. Hotel check-in at Premier Inn.",
        afternoon: "Visit the Tower of London and Tower Bridge. Explore the medieval fortress.",
        evening: "Dinner at a traditional British pub in Borough Market.",
      },
      {
        day: 2,
        title: "Westminster & Buckingham Palace",
        morning: "Watch the Changing of the Guard at Buckingham Palace.",
        afternoon: "Walk through St. James's Park, visit Westminster Abbey and Big Ben.",
        evening: "Thames River cruise with views of the city at sunset.",
      },
      {
        day: 3,
        title: "Museums & Kensington",
        morning: "Natural History Museum — one of the world's finest.",
        afternoon: "Victoria and Albert Museum. Stroll through Kensington Gardens.",
        evening: "Dinner in Notting Hill, explore the colorful streets.",
      },
      {
        day: 4,
        title: "Markets & East London",
        morning: "Borough Market for a foodie breakfast. Southwark Cathedral visit.",
        afternoon: "Brick Lane and Shoreditch street art tour. Old Spitalfields Market.",
        evening: "Cocktails at a rooftop bar with panoramic city views.",
      },
      {
        day: 5,
        title: "Day Trip to Windsor",
        morning: "Day trip to Windsor Castle — home of the British Royal Family.",
        afternoon: "Explore Windsor town, Eton College, and the Long Walk.",
        evening: "Return to London. Dinner in Covent Garden.",
      },
      {
        day: 6,
        title: "Greenwich & Canary Wharf",
        morning: "Ferry to Greenwich. Royal Observatory and Meridian Line.",
        afternoon: "National Maritime Museum. Walk through Canary Wharf.",
        evening: "Farewell dinner at a top restaurant. Souvenir shopping.",
      },
      {
        day: 7,
        title: "Departure Day",
        morning: "Leisurely breakfast. Hotel checkout.",
        afternoon: "Transfer to Heathrow Airport for return flight.",
        evening: "Arrive back in Bucharest with wonderful memories.",
      },
    ],
    highlights: ["Tower of London", "Buckingham Palace", "Big Ben", "Borough Market", "Windsor Castle", "Greenwich Observatory"],
    tips: [
      "Get an Oyster card for unlimited public transport",
      "Book museum tickets in advance to skip queues",
      "Try fish & chips at a traditional chippy",
      "The Thames path is great for free walking tours",
    ],
    totalPrice: 854,
    currency: "EUR",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Print styles */}
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { font-size: 12px; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-secondary-500 pt-20 pb-10 px-4">
        <div className="mx-auto max-w-3xl text-white">
          <p className="text-sm text-white/60 mb-2">Booking Reference: {bookingRef}</p>
          <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{trip.destination}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{trip.dates}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{trip.travelers} traveler</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{trip.nights} nights</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Actions (no-print) */}
        <div className="no-print flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
          >
            Print / Save as PDF
          </button>
          <a
            href={`mailto:?subject=My London Trip Itinerary&body=View my trip itinerary: ${typeof window !== 'undefined' ? window.location.href : ''}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-600 transition-colors"
          >
            Share via Email
          </a>
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-neutral-50 transition-colors"
          >
            Plan New Trip
          </Link>
        </div>

        {/* Flight */}
        <section className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-border-default px-6 py-4 bg-neutral-50 dark:bg-surface-elevated">
            <Plane className="h-5 w-5 text-primary-500" />
            <h2 className="font-bold text-text-primary">Outbound Flight</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{trip.flight.departure.time}</p>
                <p className="text-sm font-semibold text-text-primary">{trip.flight.departure.airport}</p>
                <p className="text-xs text-text-muted">{trip.flight.departure.city}</p>
              </div>
              <div className="flex-1 px-6 text-center">
                <p className="text-xs text-text-muted mb-1">{trip.flight.duration}</p>
                <div className="relative flex items-center">
                  <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
                  <Plane className="h-4 w-4 text-primary-500 mx-2" />
                  <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
                </div>
                <p className="text-xs text-text-muted mt-1">Direct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{trip.flight.arrival.time}</p>
                <p className="text-sm font-semibold text-text-primary">{trip.flight.arrival.airport}</p>
                <p className="text-xs text-text-muted">{trip.flight.arrival.city}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-text-muted">{trip.flight.airline} · {trip.flight.flightNumber}</span>
              <span className="font-semibold text-text-primary">{trip.currency} {trip.flight.price}</span>
            </div>
          </div>
        </section>

        {/* Hotel */}
        <section className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-border-default px-6 py-4 bg-neutral-50 dark:bg-surface-elevated">
            <Hotel className="h-5 w-5 text-primary-500" />
            <h2 className="font-bold text-text-primary">Hotel</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-text-primary text-lg">{trip.hotel.name}</h3>
                <div className="flex items-center gap-1 my-1">
                  {Array.from({ length: trip.hotel.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-text-muted flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {trip.hotel.address}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {trip.hotel.amenities.map((a) => (
                    <span key={a} className="rounded-full bg-neutral-100 dark:bg-surface-elevated px-2.5 py-0.5 text-xs text-text-secondary">{a}</span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-primary-500">{trip.currency} {trip.hotel.total}</p>
                <p className="text-xs text-text-muted">{trip.currency} {trip.hotel.pricePerNight}/night</p>
                <p className="text-xs text-text-muted mt-1">{trip.hotel.checkIn} – {trip.hotel.checkOut}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Day-by-day itinerary */}
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-4">Day-by-Day Itinerary</h2>
          <div className="space-y-4">
            {trip.itinerary.map((day) => (
              <div key={day.day} className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden">
                <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-border-default px-6 py-3 bg-neutral-50 dark:bg-surface-elevated">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {day.day}
                  </div>
                  <h3 className="font-bold text-text-primary">{day.title}</h3>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {[
                    { label: "Morning", content: day.morning, color: "text-amber-600 dark:text-amber-400" },
                    { label: "Afternoon", content: day.afternoon, color: "text-blue-600 dark:text-blue-400" },
                    { label: "Evening", content: day.evening, color: "text-purple-600 dark:text-purple-400" },
                  ].map(({ label, content, color }) => (
                    <div key={label} className="flex gap-3">
                      <span className={`text-xs font-bold ${color} w-20 pt-0.5 shrink-0`}>{label}</span>
                      <p className="text-sm text-text-secondary">{content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Highlights */}
        <section className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6">
          <h2 className="font-bold text-text-primary mb-3">Top Attractions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {trip.highlights.map((h) => (
              <div key={h} className="flex items-center gap-2 text-sm text-text-secondary">
                <ChevronRight className="h-4 w-4 text-primary-500 shrink-0" /> {h}
              </div>
            ))}
          </div>
        </section>

        {/* Local tips */}
        <section className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6">
          <h2 className="font-bold text-text-primary mb-3">Local Tips</h2>
          <ul className="space-y-2">
            {trip.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-primary-500 mt-0.5">•</span> {tip}
              </li>
            ))}
          </ul>
        </section>

        {/* Cost breakdown */}
        <section className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6">
          <h2 className="font-bold text-text-primary mb-3">Cost Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Flight (return)</span>
              <span className="font-medium text-text-primary">{trip.currency} {trip.flight.price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Hotel ({trip.nights} nights)</span>
              <span className="font-medium text-text-primary">{trip.currency} {trip.hotel.total}</span>
            </div>
            <div className="border-t border-neutral-100 dark:border-border-default pt-2 flex justify-between">
              <span className="font-bold text-text-primary">Total</span>
              <span className="font-bold text-primary-500">{trip.currency} {trip.totalPrice}</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-neutral-200 dark:border-border-default">
          <p className="text-sm text-text-muted">
            Generated by{" "}
            <Link href="/" className="font-semibold text-primary-500 hover:underline">
              TravelTwin
            </Link>
            {" "}— Your AI Travel Agent
          </p>
          <p className="text-xs text-text-muted mt-1">Booking reference: {bookingRef}</p>
        </footer>
      </div>
    </div>
  );
}
