"use client";

import Link from "next/link";
import { Plus, Calendar, Plane, Hotel, Ticket, MapPin } from "lucide-react";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const mockTrips = [
    {
        id: "london-2025",
        name: "London Adventure",
        destination: "London, UK",
        dates: "Mar 15 – Mar 22, 2025",
        duration: "7 days",
        image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
        flights: 2,
        hotels: 1,
        activities: 5,
        stages: [
            { label: "Inspire", completed: true },
            { label: "Search", completed: true },
            { label: "Compare", completed: true },
            { label: "Book", completed: true },
            { label: "Travel", completed: false },
        ],
        status: "Booked",
    },
    {
        id: "bali-2025",
        name: "Bali Relaxation",
        destination: "Bali, Indonesia",
        dates: "May 1 – May 10, 2025",
        duration: "10 days",
        image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
        flights: 2,
        hotels: 2,
        activities: 3,
        stages: [
            { label: "Inspire", completed: true },
            { label: "Search", completed: true },
            { label: "Compare", completed: false },
            { label: "Book", completed: false },
            { label: "Travel", completed: false },
        ],
        status: "Planning",
    },
    {
        id: "tokyo-2025",
        name: "Tokyo Discovery",
        destination: "Tokyo, Japan",
        dates: "Jun 14 – Jun 25, 2025",
        duration: "12 days",
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
        flights: 0,
        hotels: 0,
        activities: 0,
        stages: [
            { label: "Inspire", completed: true },
            { label: "Search", completed: false },
            { label: "Compare", completed: false },
            { label: "Book", completed: false },
            { label: "Travel", completed: false },
        ],
        status: "Draft",
    },
];

export default function TripsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-h1 text-text-primary">My Trips</h1>
                        <p className="text-body text-text-tertiary mt-1">
                            {mockTrips.length} trips planned
                        </p>
                    </div>
                    <Link href="/trips/new">
                        <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
                            New Trip
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockTrips.map((trip, i) => (
                        <Link
                            key={trip.id}
                            href={`/trips/${trip.id}`}
                            className="stagger-item group rounded-radius-xl overflow-hidden bg-surface border border-border-default hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                        >
                            {/* Hero image */}
                            <div className="relative aspect-[16/10] overflow-hidden">
                                <img
                                    src={trip.image}
                                    alt={trip.destination}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4">
                                    <Badge
                                        variant={trip.status === "Booked" ? "success" : trip.status === "Planning" ? "primary" : "neutral"}
                                        className="mb-2"
                                    >
                                        {trip.status}
                                    </Badge>
                                    <h3 className="font-display text-xl font-bold text-white">{trip.name}</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-white/80 mt-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {trip.destination}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <div className="flex items-center gap-2 text-body-sm text-text-muted mb-3">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {trip.dates} · {trip.duration}
                                </div>

                                {/* Trip components */}
                                <div className="flex items-center gap-4 mb-4">
                                    {trip.flights > 0 && (
                                        <span className="flex items-center gap-1 text-body-sm text-text-secondary">
                                            <Plane className="h-3.5 w-3.5" /> {trip.flights}
                                        </span>
                                    )}
                                    {trip.hotels > 0 && (
                                        <span className="flex items-center gap-1 text-body-sm text-text-secondary">
                                            <Hotel className="h-3.5 w-3.5" /> {trip.hotels}
                                        </span>
                                    )}
                                    {trip.activities > 0 && (
                                        <span className="flex items-center gap-1 text-body-sm text-text-secondary">
                                            <Ticket className="h-3.5 w-3.5" /> {trip.activities}
                                        </span>
                                    )}
                                </div>

                                {/* Journey Timeline stamps */}
                                <JourneyTimeline stages={trip.stages} className="justify-center" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
