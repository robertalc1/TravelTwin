"use client";

import { Plane } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface FlightCardProps {
    airline: string;
    airlineLogo?: string;
    departureTime: string;
    arrivalTime: string;
    departureCode: string;
    arrivalCode: string;
    departureCity: string;
    arrivalCity: string;
    duration: string;
    stops: number;
    price: number;
    tripType?: string;
    badges?: string[];
    className?: string;
}

export function FlightCard({
    airline,
    departureTime,
    arrivalTime,
    departureCode,
    arrivalCode,
    departureCity,
    arrivalCity,
    duration,
    stops,
    price,
    tripType = "Round trip",
    badges = [],
    className,
}: FlightCardProps) {
    const stopsLabel = stops === 0 ? "Direct" : stops === 1 ? "1 stop" : `${stops} stops`;

    return (
        <div
            className={cn(
                "group rounded-radius-lg border border-border-default bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-border-emphasis",
                className
            )}
        >
            {/* Top row: airline + price */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-radius-full bg-primary-50 dark:bg-primary-50 shrink-0">
                        <Plane className="h-4 w-4 text-primary-500" />
                    </div>
                    <span className="text-body-sm font-medium text-text-secondary">{airline}</span>
                </div>
                <div className="text-right">
                    <p className="font-mono text-xl font-bold text-text-primary">${price}</p>
                    <p className="text-caption text-text-muted">{tripType}</p>
                </div>
            </div>

            {/* Route visualization — departure board aesthetic */}
            <div className="flex items-center gap-3 mb-3">
                {/* Departure */}
                <div className="text-left">
                    <p className="font-mono text-2xl font-bold text-text-primary tracking-tight">
                        {departureTime}
                    </p>
                    <p className="font-mono text-sm font-semibold text-text-secondary tracking-wider">
                        {departureCode}
                    </p>
                </div>

                {/* Route line */}
                <div className="flex-1 flex items-center px-2">
                    <div className="flex-1 relative">
                        <div className="h-px bg-border-emphasis" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--border-emphasis) 0, var(--border-emphasis) 4px, transparent 4px, transparent 8px)" }} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-1">
                            <Plane className="h-4 w-4 text-accent-500 rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Arrival */}
                <div className="text-right">
                    <p className="font-mono text-2xl font-bold text-text-primary tracking-tight">
                        {arrivalTime}
                    </p>
                    <p className="font-mono text-sm font-semibold text-text-secondary tracking-wider">
                        {arrivalCode}
                    </p>
                </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between text-body-sm text-text-muted mb-4">
                <span>{departureCity}</span>
                <span className="flex items-center gap-1">
                    {duration} · <span className={cn(stops === 0 && "text-success font-medium")}>{stopsLabel}</span>
                </span>
                <span>{arrivalCity}</span>
            </div>

            {/* Badges + CTA */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {badges.map((badge) => (
                        <Badge
                            key={badge}
                            variant={badge === "Best Price" ? "success" : badge === "Direct" ? "primary" : "accent"}
                        >
                            {badge}
                        </Badge>
                    ))}
                </div>
                <Button variant="secondary" size="sm">
                    Select
                </Button>
            </div>
        </div>
    );
}
