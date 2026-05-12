"use client";

import Link from "next/link";
import { Check, Calendar, Plane, ArrowRight, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";

const confirmationStages = [
    { label: "Inspire", completed: true },
    { label: "Search", completed: true },
    { label: "Compare", completed: true },
    { label: "Book", completed: true },
    { label: "Travel", completed: false },
];

export default function BookingConfirmationPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
            <div className="max-w-lg w-full text-center">
                {/* Checkmark animation */}
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-success/10">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success">
                        <svg className="h-8 w-8 text-white" viewBox="0 0 32 32" fill="none">
                            <path
                                d="M8 16l6 6 10-12"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="animate-fade-in"
                                style={{
                                    strokeDasharray: 40,
                                    strokeDashoffset: 0,
                                    animation: "draw-check 0.5s ease-out forwards",
                                }}
                            />
                        </svg>
                    </div>
                </div>

                <h1 className="text-h1 text-text-primary mb-3">Booking Confirmed!</h1>
                <p className="text-body-lg text-text-secondary mb-2">
                    Your trip is all set. Get ready for London! ✈️
                </p>
                <p className="text-body-sm text-text-muted mb-8">
                    Confirmation email sent to john@example.com
                </p>

                {/* Booking reference */}
                <div className="rounded-radius-lg bg-surface border border-border-default p-6 mb-8">
                    <p className="text-overline text-text-muted mb-2">BOOKING REFERENCE</p>
                    <p className="font-mono text-3xl font-bold text-primary-500 tracking-wider mb-4">
                        TW-X8K2M9
                    </p>

                    <div className="flex items-center justify-center gap-6 text-body-sm text-text-secondary">
                        <div className="flex items-center gap-1.5">
                            <Plane className="h-4 w-4 text-primary-500" />
                            JFK → LHR
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-text-muted" />
                            Mar 15 – Mar 22
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border-default flex justify-between text-body-sm">
                        <span className="text-text-muted">Total paid</span>
                        <span className="font-mono font-bold text-text-primary">$573.40</span>
                    </div>
                </div>

                {/* Journey Timeline — Book stamp earned! */}
                <div className="mb-8">
                    <p className="text-overline text-accent-500 mb-4">YOUR JOURNEY PROGRESS</p>
                    <div className="flex justify-center">
                        <JourneyTimeline stages={confirmationStages} />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                    <Button variant="primary" icon={<Calendar className="h-4 w-4" />}>
                        Add to Calendar
                    </Button>
                    <Button variant="outline" icon={<Download className="h-4 w-4" />}>
                        Download Receipt
                    </Button>
                    <Button variant="ghost" icon={<Mail className="h-4 w-4" />}>
                        Email Itinerary
                    </Button>
                </div>

                <Link href="/trips" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors">
                    View my trips
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
