"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CreditCard, User, Lock, Plane, Hotel, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ── Types ── */
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

/* ── Step indicator ── */
function StepIndicator({ step, current }: { step: number; current: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
      done ? "bg-green-500 text-white" : active ? "bg-primary-500 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
    }`}>
      {done ? <Check className="h-4 w-4" /> : step}
    </div>
  );
}

/* ── Booking steps ── */
const STEPS = ["Review", "Traveler Details", "Payment", "Confirmed"];

export default function BookingSimulatePage() {
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [bookingRef] = useState(() => "TW-" + Math.random().toString(36).substring(2, 8).toUpperCase());

  const [traveler, setTraveler] = useState<TravelerInfo>({
    firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", passportNumber: "",
  });
  const [payment, setPayment] = useState<PaymentInfo>({
    cardNumber: "", expiry: "", cvc: "", cardholderName: "",
  });

  // Mock trip data (in real app, read from sessionStorage)
  const tripData = {
    destination: "London",
    destinationCode: "LHR",
    origin: "Bucharest",
    dates: "Mar 22 – Mar 29, 2026",
    nights: 7,
    travelers: 1,
    flight: { airline: "Blue Air", departure: "07:30", arrival: "10:45", price: 189 },
    hotel: { name: "Premier Inn London City", stars: 3, pricePerNight: 95, total: 665 },
    totalPrice: 854,
    currency: "EUR",
  };

  function formatCardNumber(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  async function handlePay() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 3000));
    setProcessing(false);
    setStep(4);
  }

  /* ── Step 1: Review ── */
  if (step === 1) return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-2xl px-4">
        <Link href="/plan" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Review Your Trip</h1>
        <p className="text-text-secondary mb-8">Make sure everything looks right before booking.</p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <StepIndicator step={i + 1} current={step} />
              <span className={`text-sm hidden sm:block ${i + 1 === step ? "font-semibold text-text-primary" : "text-text-muted"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-700" />}
            </div>
          ))}
        </div>

        {/* Trip summary card */}
        <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6 mb-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-border-default">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <Plane className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <p className="font-bold text-text-primary">{tripData.origin} → {tripData.destination}</p>
              <p className="text-sm text-text-secondary">{tripData.dates} · {tripData.nights} nights · {tripData.travelers} traveler</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Plane className="h-4 w-4" />
                Flight ({tripData.flight.airline}) {tripData.flight.departure} → {tripData.flight.arrival}
              </div>
              <span className="font-semibold text-text-primary">{tripData.currency} {tripData.flight.price}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Hotel className="h-4 w-4" />
                {tripData.hotel.name} ({tripData.hotel.stars}★) × {tripData.nights} nights
              </div>
              <span className="font-semibold text-text-primary">{tripData.currency} {tripData.hotel.total}</span>
            </div>
            <div className="border-t border-neutral-100 dark:border-border-default pt-3 flex justify-between items-center">
              <span className="font-bold text-text-primary">Total</span>
              <span className="text-xl font-bold text-primary-500">{tripData.currency} {tripData.totalPrice}</span>
            </div>
          </div>
        </div>

        <Button onClick={() => setStep(2)} className="w-full rounded-xl py-3 text-base font-bold">
          Continue to Passenger Details <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  /* ── Step 2: Traveler Details ── */
  if (step === 2) return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-2xl px-4">
        <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Passenger Details</h1>
        <p className="text-text-secondary mb-8">Please fill in the details as they appear on your passport.</p>

        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <StepIndicator step={i + 1} current={step} />
              <span className={`text-sm hidden sm:block ${i + 1 === step ? "font-semibold text-text-primary" : "text-text-muted"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-700" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary-500" />
            <h2 className="font-semibold text-text-primary">Passenger 1</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "First Name", key: "firstName", placeholder: "As on passport" },
              { label: "Last Name", key: "lastName", placeholder: "As on passport" },
              { label: "Email", key: "email", placeholder: "you@example.com", type: "email" },
              { label: "Phone", key: "phone", placeholder: "+40 7XX XXX XXX", type: "tel" },
              { label: "Date of Birth", key: "dateOfBirth", placeholder: "YYYY-MM-DD", type: "date" },
              { label: "Passport Number", key: "passportNumber", placeholder: "AB1234567" },
            ].map(({ label, key, placeholder, type = "text" }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={traveler[key as keyof TravelerInfo]}
                  onChange={(e) => setTraveler((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => setStep(3)}
          className="w-full rounded-xl py-3 text-base font-bold"
          disabled={!traveler.firstName || !traveler.lastName || !traveler.email}
        >
          Continue to Payment <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  /* ── Step 3: Payment ── */
  if (step === 3) return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-2xl px-4">
        <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Payment</h1>
        <p className="text-text-secondary mb-8">Your payment is secured with 256-bit SSL encryption.</p>

        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <StepIndicator step={i + 1} current={step} />
              <span className={`text-sm hidden sm:block ${i + 1 === step ? "font-semibold text-text-primary" : "text-text-muted"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-700" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary-500" />
              <h2 className="font-semibold text-text-primary">Card Details</h2>
            </div>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <Lock className="h-3 w-3" /> Secure
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Card Number</label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={payment.cardNumber}
                onChange={(e) => setPayment((p) => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))}
                maxLength={19}
                className="w-full rounded-lg border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={payment.expiry}
                  onChange={(e) => setPayment((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                  maxLength={5}
                  className="w-full rounded-lg border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">CVC</label>
                <input
                  type="text"
                  placeholder="123"
                  value={payment.cvc}
                  onChange={(e) => setPayment((p) => ({ ...p, cvc: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                  maxLength={3}
                  className="w-full rounded-lg border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Cardholder Name</label>
              <input
                type="text"
                placeholder="Full name on card"
                value={payment.cardholderName}
                onChange={(e) => setPayment((p) => ({ ...p, cardholderName: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {/* Accepted cards */}
          <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
            <span>We accept:</span>
            {["VISA", "MC", "AMEX"].map((card) => (
              <span key={card} className="rounded border border-neutral-200 dark:border-border-default px-2 py-0.5 font-bold text-text-secondary text-[10px]">
                {card}
              </span>
            ))}
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 px-4 py-3 mb-6">
          <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Secure payment</p>
            <p className="text-xs text-green-600 dark:text-green-500">256-bit SSL encryption. Your card details are never stored on our servers.</p>
          </div>
        </div>

        {/* Price summary */}
        <div className="rounded-xl bg-neutral-50 dark:bg-surface-elevated border border-neutral-200 dark:border-border-default px-4 py-3 mb-6 flex justify-between items-center">
          <span className="text-sm text-text-secondary">Total due today</span>
          <span className="text-xl font-bold text-text-primary">{tripData.currency} {tripData.totalPrice}</span>
        </div>

        <Button
          onClick={handlePay}
          disabled={processing || !payment.cardNumber || !payment.expiry || !payment.cvc || !payment.cardholderName}
          className="w-full rounded-xl py-3 text-base font-bold relative"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Processing your booking...
            </span>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" /> Pay {tripData.currency} {tripData.totalPrice}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  /* ── Step 4: Confirmation ── */
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-10 px-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated checkmark */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg">
            <Check className="h-8 w-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-2">Booking Confirmed!</h1>
        <p className="text-text-secondary mb-2">
          Get ready for {tripData.destination}!
        </p>
        <p className="text-sm text-text-muted mb-8">
          Confirmation email sent to {traveler.email || "your email"}
        </p>

        {/* Booking reference */}
        <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6 mb-6 text-left space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-border-default">
            <span className="text-sm text-text-secondary">Booking Reference</span>
            <span className="font-mono font-bold text-primary-500 text-lg">{bookingRef}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Destination</span>
            <span className="font-medium text-text-primary">{tripData.origin} → {tripData.destination}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Dates</span>
            <span className="font-medium text-text-primary">{tripData.dates}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Passenger</span>
            <span className="font-medium text-text-primary">{traveler.firstName || "Traveler"} {traveler.lastName}</span>
          </div>
          <div className="flex justify-between text-sm pt-3 border-t border-neutral-100 dark:border-border-default">
            <span className="font-bold text-text-primary">Total Paid</span>
            <span className="font-bold text-primary-500">{tripData.currency} {tripData.totalPrice}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/trips/share/${bookingRef}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-3 text-sm font-semibold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
          >
            View Itinerary
          </Link>
          <Link
            href="/plan"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-bold text-white hover:bg-primary-600 transition-colors"
          >
            Plan Another Trip
          </Link>
        </div>
      </div>
    </div>
  );
}
