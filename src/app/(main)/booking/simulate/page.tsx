"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, CreditCard, User, Lock,
  Plane, Hotel, Shield, Calendar, MapPin, ChevronUp, ChevronDown,
} from "lucide-react";
import { DemoBanner } from "@/components/booking/DemoBanner";
import { createClient } from "@/lib/supabase/client";
import { useToastStore } from "@/stores/toastStore";
import { useCurrencyStore } from "@/stores/currencyStore";
import type { TripDetail } from "@/lib/tripDetail";

interface TravelerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  passportNumber: string;
}

interface PaymentInfo {
  cardNumber: string;
  expiry: string;
  cvc: string;
  cardholderName: string;
}

const STEPS = ["Review", "Traveler", "Payment", "Confirmed"];

function fmtTime(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
  catch { return iso.slice(11, 16) || ""; }
}
function fmtDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-8">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = current > stepNum;
        const active = current === stepNum;
        return (
          <div key={label} className="flex items-center gap-1 sm:gap-2 flex-1">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                done
                  ? "bg-green-500 text-white"
                  : active
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : stepNum}
            </div>
            <span
              className={`text-xs sm:text-sm hidden sm:block ${
                active ? "font-bold text-text-primary" : done ? "text-green-600" : "text-text-muted"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full transition-colors ${
                done ? "bg-green-500" : "bg-neutral-200 dark:bg-neutral-700"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingSimulatePage() {
  const router = useRouter();
  const formatCurrency = useCurrencyStore((s) => s.format);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [bookingRef] = useState(() => "TW-" + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [bookingTrip, setBookingTrip] = useState<TripDetail | null>(null);
  const [bookingMeta, setBookingMeta] = useState<{ backHref: string; originCity: string }>({ backHref: "/", originCity: "" });
  const [pricingExpanded, setPricingExpanded] = useState(true);

  const [traveler, setTraveler] = useState<TravelerInfo>({
    firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", passportNumber: "",
  });
  const [payment, setPayment] = useState<PaymentInfo>({
    cardNumber: "", expiry: "", cvc: "", cardholderName: "",
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("bookingTrip");
    if (stored) {
      try { setBookingTrip(JSON.parse(stored)); } catch { /* ignore */ }
    }
    try {
      const meta = sessionStorage.getItem("currentBookingMeta");
      if (meta) setBookingMeta(JSON.parse(meta));
    } catch { /* ignore */ }
  }, []);

  const currency = bookingTrip?.currency || "EUR";
  const displayDestination = bookingTrip?.destinationCity || bookingTrip?.destinationCode || "Your Destination";
  const displayCountry = bookingTrip?.destinationCountry || "";
  const displayDates = bookingTrip
    ? bookingTrip.returnDate
      ? `${fmtDate(bookingTrip.departureDate)} – ${fmtDate(bookingTrip.returnDate)}`
      : bookingTrip.departureDate
        ? `${fmtDate(bookingTrip.departureDate)} · ${bookingTrip.nights} nights`
        : `${bookingTrip.nights} nights`
    : "";
  const originCity = bookingMeta.originCity || "Your City";
  const displayRoute = `${originCity} → ${displayDestination}`;
  const heroImageId = "photo-1488085061387-422e29b40080";

  const flightPrice = bookingTrip?.flightPrice || 0;
  const hotelPrice = bookingTrip?.hotelPrice || 0;
  const totalPrice = bookingTrip?.totalPrice || flightPrice + hotelPrice;

  function formatCardNumber(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  const TEST_CARD = "4242 4242 4242 4242";
  const isTestCard = (raw: string) => raw.replace(/\s/g, "") === TEST_CARD.replace(/\s/g, "");

  async function handlePay() {
    if (!isTestCard(payment.cardNumber)) {
      alert(
        `Demo mode — please use the test card ${TEST_CARD}.\n\n` +
        `Real card numbers are NEVER accepted in this simulator.`
      );
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 3000));
    setProcessing(false);
    if (bookingTrip) {
      sessionStorage.setItem(`booking_${bookingRef}`, JSON.stringify({
        ...bookingTrip, traveler, paidAt: new Date().toISOString(), origin: originCity,
      }));
    }
    sessionStorage.setItem("lastBookingRef", bookingRef);

    if (bookingTrip) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("saved_trips").insert({
            user_id: user.id,
            destination: bookingTrip.destinationCity || bookingTrip.destinationCode || "Unknown",
            origin: originCity,
            outbound_flight: {
              booking_ref: bookingRef,
              airline: bookingTrip.airline,
              airlineCode: bookingTrip.airlineCode,
              departureTime: bookingTrip.departureTime,
              arrivalTime: bookingTrip.arrivalTime,
              duration: bookingTrip.duration,
              stops: bookingTrip.stops,
              price: bookingTrip.flightPrice,
            },
            hotel: {
              name: bookingTrip.hotelName,
              stars: bookingTrip.hotelStars,
              pricePerNight: bookingTrip.hotelPricePerNight,
              checkIn: bookingTrip.hotelCheckIn,
              checkOut: bookingTrip.hotelCheckOut,
            },
            total_cost: bookingTrip.totalPrice,
            budget: bookingTrip.totalPrice,
            days: bookingTrip.nights,
            status: "booked",
          });
          useToastStore.getState().show(`Booking saved: ${bookingRef}`, "success");
        }
      } catch (err) {
        console.error("[booking/save]", err);
      }
    }

    setStep(4);
  }

  /* ── Confirmation step (full screen, no sidebar) ── */
  if (step === 4) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-background flex items-center justify-center py-10 px-4">
        <div className="max-w-lg w-full text-center">
          <DemoBanner />
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/40">
              <Check className="h-8 w-8 text-white" />
            </div>
          </motion.div>

          <h1 className="text-3xl font-extrabold text-secondary-500 dark:text-white mb-2">Booking Confirmed!</h1>
          <p className="text-text-secondary mb-1 text-lg">
            Get ready for <span className="font-bold text-primary-500">{displayDestination}</span>
          </p>
          <p className="text-sm text-text-muted mb-8">
            Confirmation email sent to {traveler.email || "your email"}
          </p>

          <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6 mb-6 text-left space-y-3 shadow-md">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-border-default">
              <span className="text-sm text-text-secondary">Booking Reference</span>
              <span className="font-mono font-bold text-primary-500 text-lg">{bookingRef}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Route</span>
              <span className="font-medium text-text-primary">{displayRoute}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Dates</span>
              <span className="font-medium text-text-primary">{displayDates || `${bookingTrip?.nights || 0} nights`}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Passenger</span>
              <span className="font-medium text-text-primary">{traveler.firstName || "Traveler"} {traveler.lastName}</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-neutral-100 dark:border-border-default">
              <span className="font-bold text-text-primary">Total Paid</span>
              <span className="font-extrabold text-primary-500 text-base">{formatCurrency(totalPrice, currency)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push(`/trips/share/${bookingRef}`)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-3 text-sm font-semibold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
            >
              View Itinerary
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-bold text-white hover:bg-primary-600 transition-colors"
            >
              Plan Another Trip
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Steps 1-3 (with hero + sticky sidebar) ── */
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      {/* Hero — matches TripDetailView */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(https://images.unsplash.com/${heroImageId}?w=1920&h=400&fit=crop&q=80)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-700/85 via-secondary-700/70 to-secondary-700/40" />
        <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8 py-10 lg:py-14">
          <Link
            href={bookingMeta.backHref || "/"}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to trip
          </Link>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white">
            Booking your trip to {displayDestination}
            {displayCountry && <span className="text-white/80">, {displayCountry}</span>}
          </h1>
          {displayDates && (
            <p className="text-white/80 mt-2 text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" /> {displayDates}
              {bookingTrip?.nights ? ` · ${bookingTrip.nights} nights` : ""} · 1 traveler
            </p>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        <StepBar current={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left column — steps content */}
          <div className="lg:col-span-2 space-y-6">
            <DemoBanner />

            {/* ── Step 1: Review ── */}
            {step === 1 && (
              <>
                <section className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6">
                  <h2 className="text-xl font-bold text-secondary-500 dark:text-white mb-1">Review Your Trip</h2>
                  <p className="text-sm text-text-secondary mb-5">Make sure everything looks right before booking.</p>

                  <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-border-default mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                      <MapPin className="h-6 w-6 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-bold text-text-primary">{displayRoute}</p>
                      <p className="text-sm text-text-secondary">
                        {displayDates}{bookingTrip?.nights ? ` · ${bookingTrip.nights} nights` : ""} · 1 traveler
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {bookingTrip?.airline && (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
                          <Plane className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">
                            {bookingTrip.airline} · {fmtTime(bookingTrip.departureTime || "")} → {fmtTime(bookingTrip.arrivalTime || "")}
                          </p>
                          <p className="text-xs text-text-muted">
                            {bookingTrip.stops === 0 ? "Direct" : `${bookingTrip.stops} stop${bookingTrip.stops === 1 ? "" : "s"}`}
                          </p>
                        </div>
                        <span className="font-semibold text-text-primary">{formatCurrency(flightPrice, currency)}</span>
                      </div>
                    )}

                    {bookingTrip?.hotelName && (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center shrink-0">
                          <Hotel className="h-4 w-4 text-primary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{bookingTrip.hotelName}</p>
                          <p className="text-xs text-text-muted">
                            {bookingTrip.hotelStars}★ · {bookingTrip.nights} night{bookingTrip.nights === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="font-semibold text-text-primary">{formatCurrency(hotelPrice, currency)}</span>
                      </div>
                    )}
                  </div>
                </section>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 text-base transition-colors shadow-md"
                >
                  Continue to Traveler Details <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* ── Step 2: Traveler Details ── */}
            {step === 2 && (
              <>
                <section className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6">
                  <h2 className="text-xl font-bold text-secondary-500 dark:text-white mb-1">Traveler Details</h2>
                  <p className="text-sm text-text-secondary mb-5">Fill in the details exactly as they appear on your passport.</p>

                  <div className="flex items-center gap-2 mb-5 pb-4 border-b border-neutral-100 dark:border-border-default">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <User className="h-4 w-4 text-primary-500" />
                    </div>
                    <span className="font-semibold text-text-primary">Traveler 1 (Adult)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "First Name", key: "firstName", placeholder: "As on passport" },
                      { label: "Last Name", key: "lastName", placeholder: "As on passport" },
                      { label: "Email", key: "email", placeholder: "you@example.com", type: "email" },
                      { label: "Phone", key: "phone", placeholder: "+40 7XX XXX XXX", type: "tel" },
                      { label: "Date of Birth", key: "dateOfBirth", type: "date" },
                      { label: "Passport Number", key: "passportNumber", placeholder: "AB1234567" },
                    ].map(({ label, key, placeholder, type = "text" }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">{label}</label>
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={traveler[key as keyof TravelerInfo]}
                          onChange={(e) => setTraveler((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-5 py-3.5 text-sm font-semibold text-text-secondary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 inline mr-1.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!traveler.firstName || !traveler.lastName || !traveler.email}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 text-base transition-colors shadow-md"
                  >
                    Continue to Payment <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3: Payment ── */}
            {step === 3 && (
              <>
                <section className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-6">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h2 className="text-xl font-bold text-secondary-500 dark:text-white">Payment</h2>
                      <p className="text-sm text-text-secondary">Your payment is secured with 256-bit SSL encryption.</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-full px-2.5 py-1">
                      <Lock className="h-3 w-3" /> Secure
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Card Number</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input
                          type="text"
                          placeholder={TEST_CARD}
                          value={payment.cardNumber}
                          onChange={(e) => setPayment((p) => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))}
                          maxLength={19}
                          className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated pl-10 pr-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-mono"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                        Demo only — use the test card {TEST_CARD}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={payment.expiry}
                          onChange={(e) => setPayment((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                          maxLength={5}
                          className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">CVC</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={payment.cvc}
                          onChange={(e) => setPayment((p) => ({ ...p, cvc: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                          maxLength={3}
                          className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="Full name on card"
                        value={payment.cardholderName}
                        onChange={(e) => setPayment((p) => ({ ...p, cardholderName: e.target.value }))}
                        className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-border-default flex items-center justify-between text-xs">
                    <span className="text-text-muted">We accept:</span>
                    <div className="flex items-center gap-2">
                      {["VISA", "MC", "AMEX"].map((card) => (
                        <span key={card} className="rounded border border-neutral-200 dark:border-border-default px-2 py-0.5 font-bold text-text-secondary text-[10px]">
                          {card}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                <div className="flex items-start gap-3 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 px-4 py-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">Secure payment</p>
                    <p className="text-xs text-green-600 dark:text-green-500">256-bit SSL encryption · Card details never stored on our servers</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-5 py-3.5 text-sm font-semibold text-text-secondary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 inline mr-1.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={processing || !payment.cardNumber || !payment.expiry || !payment.cvc || !payment.cardholderName}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 text-base transition-colors shadow-md"
                  >
                    {processing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Processing your booking...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" /> Pay {formatCurrency(totalPrice, currency)}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right column — sticky sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Total Price card — matches PriceBreakdown */}
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden shadow-md">
                <button
                  type="button"
                  onClick={() => setPricingExpanded((v) => !v)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide">Total Price</p>
                    <motion.p
                      key={totalPrice}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 18 }}
                      className="text-3xl font-extrabold text-primary-500"
                    >
                      {formatCurrency(totalPrice, currency)}
                    </motion.p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {bookingTrip?.nights ? `${bookingTrip.nights} nights · ` : ""}1 traveler · all included
                    </p>
                  </div>
                  {pricingExpanded ? (
                    <ChevronUp className="h-5 w-5 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-text-muted" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {pricingExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="border-t border-neutral-100 dark:border-border-default overflow-hidden"
                    >
                      <div className="p-5 space-y-3">
                        {flightPrice > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <Plane className="h-4 w-4 text-blue-500" />
                              </div>
                              <span className="text-sm text-text-secondary">Flight</span>
                            </div>
                            <span className="text-sm font-semibold text-text-primary">
                              {formatCurrency(flightPrice, currency)}
                            </span>
                          </div>
                        )}
                        {hotelPrice > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                                <Hotel className="h-4 w-4 text-primary-500" />
                              </div>
                              <span className="text-sm text-text-secondary">Hotel</span>
                            </div>
                            <span className="text-sm font-semibold text-text-primary">
                              {formatCurrency(hotelPrice, currency)}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-neutral-200 dark:border-border-default pt-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-text-primary">Total</span>
                          <span className="text-lg font-extrabold text-primary-500">
                            {formatCurrency(totalPrice, currency)}
                          </span>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
                          <Shield className="h-3.5 w-3.5 text-green-500" />
                          Secure checkout · Free cancellation 24h
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* What's included card */}
              <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default p-5">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-3">What&apos;s included</p>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {flightPrice > 0 && (
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                      Round-trip flights
                    </li>
                  )}
                  {hotelPrice > 0 && (
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                      {bookingTrip?.nights || 0} nights at {bookingTrip?.hotelName || "your hotel"}
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    All taxes &amp; fees
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    Free cancellation within 24h
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    24/7 customer support
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
