"use client";

import { ArrowLeft, Plane, Clock, Briefcase, CreditCard, ChevronDown, Shield } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function FlightDetailPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="bg-primary-700 py-4">
                <div className="mx-auto max-w-5xl px-4 lg:px-8">
                    <Link href="/flights" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Back to results
                    </Link>
                    <h1 className="text-h3 text-white">New York → London</h1>
                    <p className="text-sm text-white/60">Round trip · Mar 15 – Mar 22 · 1 Adult</p>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Outbound flight */}
                        <div className="rounded-radius-lg border border-border-default bg-surface p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="primary">Outbound</Badge>
                                <span className="text-body-sm text-text-muted">Saturday, March 15</span>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-radius-full bg-primary-50 dark:bg-primary-50">
                                    <Plane className="h-6 w-6 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-display text-lg font-bold text-text-primary">Emirates</p>
                                    <p className="text-body-sm text-text-muted">EK 201 · Boeing 777-300ER</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <p className="font-mono text-3xl font-bold text-text-primary">06:30</p>
                                    <p className="font-mono text-sm font-semibold text-text-secondary mt-1">JFK</p>
                                    <p className="text-caption text-text-muted">New York</p>
                                </div>

                                <div className="flex-1 flex flex-col items-center gap-1 px-4">
                                    <div className="flex items-center gap-2 text-body-sm text-text-muted">
                                        <Clock className="h-3.5 w-3.5" />
                                        7h 15m
                                    </div>
                                    <div className="w-full relative">
                                        <div className="h-px bg-border-emphasis w-full" />
                                        <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-accent-500 rotate-90 bg-surface px-0.5" />
                                    </div>
                                    <Badge variant="success" className="text-[10px]">Direct</Badge>
                                </div>

                                <div className="text-center">
                                    <p className="font-mono text-3xl font-bold text-text-primary">14:45</p>
                                    <p className="font-mono text-sm font-semibold text-text-secondary mt-1">LHR</p>
                                    <p className="text-caption text-text-muted">London</p>
                                </div>
                            </div>
                        </div>

                        {/* Return flight */}
                        <div className="rounded-radius-lg border border-border-default bg-surface p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="accent">Return</Badge>
                                <span className="text-body-sm text-text-muted">Saturday, March 22</span>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-radius-full bg-primary-50 dark:bg-primary-50">
                                    <Plane className="h-6 w-6 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-display text-lg font-bold text-text-primary">Emirates</p>
                                    <p className="text-body-sm text-text-muted">EK 202 · Boeing 777-300ER</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <p className="font-mono text-3xl font-bold text-text-primary">10:30</p>
                                    <p className="font-mono text-sm font-semibold text-text-secondary mt-1">LHR</p>
                                    <p className="text-caption text-text-muted">London</p>
                                </div>

                                <div className="flex-1 flex flex-col items-center gap-1 px-4">
                                    <div className="flex items-center gap-2 text-body-sm text-text-muted">
                                        <Clock className="h-3.5 w-3.5" />
                                        8h 25m
                                    </div>
                                    <div className="w-full relative">
                                        <div className="h-px bg-border-emphasis w-full" />
                                        <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-accent-500 -rotate-90 bg-surface px-0.5" />
                                    </div>
                                    <Badge variant="success" className="text-[10px]">Direct</Badge>
                                </div>

                                <div className="text-center">
                                    <p className="font-mono text-3xl font-bold text-text-primary">13:55</p>
                                    <p className="font-mono text-sm font-semibold text-text-secondary mt-1">JFK</p>
                                    <p className="text-caption text-text-muted">New York</p>
                                </div>
                            </div>
                        </div>

                        {/* Fare details */}
                        <div className="rounded-radius-lg border border-border-default bg-surface p-6">
                            <h3 className="text-h4 text-text-primary mb-4">Fare Details</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { name: "Economy Light", price: 487, bags: "Carry-on only", change: "No changes" },
                                    { name: "Economy Flex", price: 612, bags: "1 checked bag", change: "Free changes" },
                                    { name: "Business", price: 2340, bags: "2 checked bags", change: "Free changes" },
                                ].map((fare) => (
                                    <div key={fare.name} className="rounded-radius-md border border-border-default p-4 hover:border-primary-500 transition-colors cursor-pointer">
                                        <p className="font-display font-bold text-text-primary mb-1">{fare.name}</p>
                                        <p className="font-mono text-xl font-bold text-primary-500 mb-3">${fare.price}</p>
                                        <div className="space-y-1.5 text-body-sm text-text-muted">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="h-3.5 w-3.5" />
                                                {fare.bags}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-3.5 w-3.5" />
                                                {fare.change}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar — Price Summary */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-20 rounded-radius-lg border border-border-default bg-surface p-6">
                            <h3 className="text-h4 text-text-primary mb-4">Price Summary</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-text-secondary">Flight (1 adult)</span>
                                    <span className="text-text-primary font-medium">$487.00</span>
                                </div>
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-text-secondary">Taxes & fees</span>
                                    <span className="text-text-primary font-medium">$86.40</span>
                                </div>
                                <div className="h-px bg-border-default" />
                                <div className="flex justify-between">
                                    <span className="text-body font-semibold text-text-primary">Total</span>
                                    <span className="font-mono text-xl font-bold text-text-primary">$573.40</span>
                                </div>
                            </div>

                            <Link href="/booking/flight-1">
                                <Button variant="primary" size="lg" className="w-full">
                                    Continue to Booking
                                </Button>
                            </Link>

                            <div className="mt-4 flex items-center gap-2 text-caption text-text-muted">
                                <Shield className="h-3.5 w-3.5 text-success" />
                                Free cancellation within 24 hours
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
