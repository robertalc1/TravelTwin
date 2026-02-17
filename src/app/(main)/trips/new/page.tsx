"use client";

import { useState } from "react";
import { Sparkles, MapPin, Calendar, Users, DollarSign, Sun, Mountain, Umbrella, Palmtree, Building2, Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const travelStyles = [
    { id: "beach", label: "Beach", icon: Umbrella },
    { id: "adventure", label: "Adventure", icon: Mountain },
    { id: "city", label: "City", icon: Building2 },
    { id: "nature", label: "Nature", icon: Palmtree },
    { id: "cultural", label: "Cultural", icon: Compass },
    { id: "romantic", label: "Romantic", icon: Sun },
];

const budgetOptions = ["$", "$$", "$$$", "$$$$"];

export default function NewTripPage() {
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [budget, setBudget] = useState<string>("$$");
    const [loading, setLoading] = useState(false);

    const toggleStyle = (id: string) => {
        setSelectedStyles((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    const handleGenerate = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 3000);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
                <div className="text-center mb-10">
                    <Badge variant="accent" className="mb-4 text-sm px-4 py-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Trip Builder
                    </Badge>
                    <h1 className="text-h1 text-text-primary mb-3">Plan your dream trip</h1>
                    <p className="text-body-lg text-text-tertiary max-w-lg mx-auto">
                        Tell us what you&apos;re looking for and our AI will create a personalized itinerary
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Destination */}
                    <div>
                        <label className="text-h5 text-text-primary block mb-3">Where do you want to go?</label>
                        <div className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface px-4 py-4 hover:border-border-emphasis transition-colors">
                            <MapPin className="h-5 w-5 text-text-muted" />
                            <input
                                type="text"
                                placeholder="Enter a destination or let AI surprise you..."
                                className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted outline-none text-body"
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div>
                        <label className="text-h5 text-text-primary block mb-3">When?</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface px-4 py-4 hover:border-border-emphasis transition-colors">
                                <Calendar className="h-5 w-5 text-text-muted" />
                                <div>
                                    <div className="text-[10px] font-semibold text-text-muted uppercase">Start</div>
                                    <div className="text-body text-text-primary">Select date</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface px-4 py-4 hover:border-border-emphasis transition-colors">
                                <Calendar className="h-5 w-5 text-text-muted" />
                                <div>
                                    <div className="text-[10px] font-semibold text-text-muted uppercase">End</div>
                                    <div className="text-body text-text-primary">Select date</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Travelers */}
                    <div>
                        <label className="text-h5 text-text-primary block mb-3">Who&apos;s going?</label>
                        <div className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface px-4 py-4 hover:border-border-emphasis transition-colors">
                            <Users className="h-5 w-5 text-text-muted" />
                            <div className="text-body text-text-primary">2 Adults</div>
                        </div>
                    </div>

                    {/* Travel style */}
                    <div>
                        <label className="text-h5 text-text-primary block mb-3">What&apos;s your travel style?</label>
                        <div className="grid grid-cols-3 gap-3">
                            {travelStyles.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => toggleStyle(id)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 rounded-radius-lg border p-4 transition-all duration-200",
                                        selectedStyles.includes(id)
                                            ? "border-primary-500 bg-primary-50 text-primary-600 shadow-sm dark:bg-primary-50 dark:text-primary-500"
                                            : "border-border-default bg-surface text-text-secondary hover:border-border-emphasis"
                                    )}
                                >
                                    <Icon className="h-6 w-6" />
                                    <span className="text-sm font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="text-h5 text-text-primary block mb-3">Budget range</label>
                        <div className="flex gap-3">
                            {budgetOptions.map((b) => (
                                <button
                                    key={b}
                                    onClick={() => setBudget(b)}
                                    className={cn(
                                        "flex-1 rounded-radius-lg border py-3 text-center font-mono text-lg font-semibold transition-all duration-200",
                                        budget === b
                                            ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-50 dark:text-primary-500"
                                            : "border-border-default bg-surface text-text-secondary hover:border-border-emphasis"
                                    )}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate button */}
                    <div className="pt-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full"
                            onClick={handleGenerate}
                            loading={loading}
                            icon={!loading ? <Sparkles className="h-4 w-4" /> : undefined}
                        >
                            {loading ? "Creating tailored trips just for you..." : "Generate My Trip"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
