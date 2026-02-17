"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, CreditCard, Shield, Plane, ChevronDown, ChevronUp, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type StepId = "traveler" | "payment" | "addons";

interface Step {
    id: StepId;
    label: string;
    icon: typeof User;
}

const steps: Step[] = [
    { id: "traveler", label: "Traveler Details", icon: User },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "addons", label: "Add-ons", icon: Shield },
];

export default function BookingPage() {
    const [expandedStep, setExpandedStep] = useState<StepId>("traveler");
    const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

    const toggleStep = (id: StepId) => {
        setExpandedStep(expandedStep === id ? id : id);
    };

    const completeStep = (id: StepId) => {
        setCompletedSteps([...completedSteps, id]);
        const currentIndex = steps.findIndex((s) => s.id === id);
        if (currentIndex < steps.length - 1) {
            setExpandedStep(steps[currentIndex + 1].id);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="bg-primary-700 py-4">
                <div className="mx-auto max-w-5xl px-4 lg:px-8">
                    <Link href="/flights" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors mb-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to flight details
                    </Link>
                    <h1 className="text-h3 text-white">Complete your booking</h1>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main — Accordion steps */}
                    <div className="lg:col-span-2 space-y-3">
                        {/* Step: Traveler Details */}
                        <div className="rounded-radius-lg border border-border-default bg-surface overflow-hidden">
                            <button
                                onClick={() => toggleStep("traveler")}
                                className="flex items-center justify-between w-full p-5"
                            >
                                <div className="flex items-center gap-3">
                                    {completedSteps.includes("traveler") ? (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-success text-white">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-primary-50 dark:bg-primary-50">
                                            <User className="h-4 w-4 text-primary-500" />
                                        </div>
                                    )}
                                    <span className="font-display text-lg font-bold text-text-primary">Traveler Details</span>
                                </div>
                                {expandedStep === "traveler" ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
                            </button>
                            {expandedStep === "traveler" && (
                                <div className="px-5 pb-5 border-t border-border-default pt-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="First Name" placeholder="John" />
                                        <Input label="Last Name" placeholder="Doe" />
                                        <Input label="Email" type="email" placeholder="john@example.com" />
                                        <Input label="Phone" type="tel" placeholder="+1 (555) 000-0000" />
                                        <Input label="Date of Birth" type="date" className="md:col-span-1" />
                                        <Input label="Passport Number" placeholder="AB1234567" />
                                    </div>
                                    <div className="mt-5 flex justify-end">
                                        <Button variant="primary" onClick={() => completeStep("traveler")}>
                                            Continue to Payment
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step: Payment */}
                        <div className="rounded-radius-lg border border-border-default bg-surface overflow-hidden">
                            <button
                                onClick={() => toggleStep("payment")}
                                className="flex items-center justify-between w-full p-5"
                            >
                                <div className="flex items-center gap-3">
                                    {completedSteps.includes("payment") ? (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-success text-white">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-primary-50 dark:bg-primary-50">
                                            <CreditCard className="h-4 w-4 text-primary-500" />
                                        </div>
                                    )}
                                    <span className="font-display text-lg font-bold text-text-primary">Payment</span>
                                </div>
                                {expandedStep === "payment" ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
                            </button>
                            {expandedStep === "payment" && (
                                <div className="px-5 pb-5 border-t border-border-default pt-5">
                                    <div className="space-y-4">
                                        <Input label="Card Number" placeholder="4242 4242 4242 4242" leadingIcon={<CreditCard className="h-4 w-4" />} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Expiry" placeholder="MM/YY" />
                                            <Input label="CVC" placeholder="123" />
                                        </div>
                                        <Input label="Cardholder Name" placeholder="John Doe" />
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-caption text-text-muted">
                                        <Lock className="h-3.5 w-3.5 text-success" />
                                        Your payment is encrypted and secure
                                    </div>
                                    <div className="mt-5 flex justify-end">
                                        <Button variant="primary" onClick={() => completeStep("payment")}>
                                            Continue to Add-ons
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step: Add-ons */}
                        <div className="rounded-radius-lg border border-border-default bg-surface overflow-hidden">
                            <button
                                onClick={() => toggleStep("addons")}
                                className="flex items-center justify-between w-full p-5"
                            >
                                <div className="flex items-center gap-3">
                                    {completedSteps.includes("addons") ? (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-success text-white">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-radius-full bg-primary-50 dark:bg-primary-50">
                                            <Shield className="h-4 w-4 text-primary-500" />
                                        </div>
                                    )}
                                    <span className="font-display text-lg font-bold text-text-primary">Add-ons</span>
                                </div>
                                {expandedStep === "addons" ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
                            </button>
                            {expandedStep === "addons" && (
                                <div className="px-5 pb-5 border-t border-border-default pt-5">
                                    <div className="space-y-3">
                                        {[
                                            { title: "Travel Insurance", desc: "Full coverage including medical & cancellation", price: "$24" },
                                            { title: "Extra Checked Bag", desc: "23kg additional checked baggage", price: "$35" },
                                            { title: "Priority Boarding", desc: "Board first and secure overhead space", price: "$12" },
                                        ].map((addon) => (
                                            <label key={addon.title} className="flex items-center gap-4 rounded-radius-md border border-border-default p-4 cursor-pointer hover:border-border-emphasis transition-colors">
                                                <input type="checkbox" className="h-4 w-4 rounded border-border-emphasis text-primary-500" />
                                                <div className="flex-1">
                                                    <p className="text-body font-semibold text-text-primary">{addon.title}</p>
                                                    <p className="text-body-sm text-text-muted">{addon.desc}</p>
                                                </div>
                                                <span className="font-mono text-body font-semibold text-text-primary">{addon.price}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-5 flex justify-end">
                                        <Link href="/booking/confirmation">
                                            <Button variant="primary" size="lg">
                                                <Lock className="h-4 w-4" />
                                                Confirm & Pay $573.40
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar — Price Summary */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-20 rounded-radius-lg border border-border-default bg-surface p-6">
                            <h3 className="text-h4 text-text-primary mb-4">Booking Summary</h3>

                            {/* Flight summary */}
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-default">
                                <div className="flex h-10 w-10 items-center justify-center rounded-radius-full bg-primary-50 dark:bg-primary-50">
                                    <Plane className="h-5 w-5 text-primary-500" />
                                </div>
                                <div>
                                    <p className="text-body font-semibold text-text-primary">JFK → LHR</p>
                                    <p className="text-caption text-text-muted">Mar 15 – 22 · Round trip · 1 Adult</p>
                                </div>
                            </div>

                            <div className="space-y-2.5 mb-4">
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-text-secondary">Base fare</span>
                                    <span className="text-text-primary font-medium">$487.00</span>
                                </div>
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-text-secondary">Taxes & fees</span>
                                    <span className="text-text-primary font-medium">$86.40</span>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4 border-t border-border-default">
                                <span className="text-body font-semibold text-text-primary">Total</span>
                                <span className="font-mono text-xl font-bold text-text-primary">$573.40</span>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-caption text-text-muted">
                                <Shield className="h-3.5 w-3.5 text-success" />
                                Free cancellation within 24h
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
