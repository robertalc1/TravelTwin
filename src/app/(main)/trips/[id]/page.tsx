"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Plane, Hotel, Ticket, Clock, ChevronRight, Edit3, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";

const itinerary = [
    {
        day: 1,
        date: "Mar 15",
        title: "Arrival in London",
        items: [
            { time: "14:45", type: "flight", title: "Arrive at London Heathrow (LHR)", subtitle: "Emirates EK 201 from JFK" },
            { time: "17:00", type: "hotel", title: "Check in at The Langham", subtitle: "Superior Room — 7 nights" },
            { time: "19:30", type: "activity", title: "Welcome dinner at The Wigmore", subtitle: "British gastropub at the hotel" },
        ],
    },
    {
        day: 2,
        date: "Mar 16",
        title: "Classic London",
        items: [
            { time: "09:00", type: "activity", title: "Tower of London", subtitle: "Crown Jewels and Beefeater tour" },
            { time: "13:00", type: "activity", title: "Borough Market lunch", subtitle: "Street food and local specialties" },
            { time: "15:00", type: "activity", title: "Tate Modern", subtitle: "Contemporary art collection" },
        ],
    },
    {
        day: 3,
        date: "Mar 17",
        title: "Royal London",
        items: [
            { time: "10:00", type: "activity", title: "Buckingham Palace", subtitle: "Changing of the Guard ceremony" },
            { time: "14:00", type: "activity", title: "Afternoon tea at Claridge's", subtitle: "Traditional English tea service" },
        ],
    },
];

const stages = [
    { label: "Inspire", completed: true },
    { label: "Search", completed: true },
    { label: "Compare", completed: true },
    { label: "Book", completed: true },
    { label: "Travel", completed: false },
];

const iconMap: Record<string, typeof Plane> = { flight: Plane, hotel: Hotel, activity: Ticket };

export default function TripDetailPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <div className="relative h-64 md:h-80 overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80"
                    alt="London"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <Badge variant="success" className="mb-3">Booked</Badge>
                        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">London Adventure</h1>
                        <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
                            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> London, UK</span>
                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Mar 15 – Mar 22</span>
                            <span>7 days</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
                <Link href="/trips" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6">
                    <ArrowLeft className="h-4 w-4" /> Back to trips
                </Link>

                {/* Journey Timeline */}
                <div className="mb-8 flex justify-center">
                    <JourneyTimeline stages={stages} />
                </div>

                {/* Trip summary bar */}
                <div className="flex items-center gap-6 rounded-radius-lg bg-surface border border-border-default p-4 mb-8">
                    <div className="flex items-center gap-2 text-body-sm"><Plane className="h-4 w-4 text-primary-500" /><span className="font-medium">2 Flights</span></div>
                    <div className="flex items-center gap-2 text-body-sm"><Hotel className="h-4 w-4 text-primary-500" /><span className="font-medium">1 Hotel</span></div>
                    <div className="flex items-center gap-2 text-body-sm"><Ticket className="h-4 w-4 text-primary-500" /><span className="font-medium">5 Activities</span></div>
                    <div className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" icon={<Share2 className="h-4 w-4" />}>Share</Button>
                        <Button variant="ghost" size="sm" icon={<Edit3 className="h-4 w-4" />}>Edit</Button>
                    </div>
                </div>

                {/* Day-by-day timeline */}
                <div className="space-y-8">
                    {itinerary.map(({ day, date, title, items }) => (
                        <div key={day} className="relative">
                            {/* Day header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-radius-full bg-primary-500 text-white font-display font-bold text-sm shrink-0">
                                    {day}
                                </div>
                                <div>
                                    <h3 className="text-h4 text-text-primary">{title}</h3>
                                    <p className="text-caption text-text-muted">{date}</p>
                                </div>
                            </div>

                            {/* Timeline items */}
                            <div className="ml-5 border-l-2 border-border-default pl-6 space-y-4">
                                {items.map(({ time, type, title: itemTitle, subtitle }, j) => {
                                    const Icon = iconMap[type] || Ticket;
                                    return (
                                        <div key={j} className="relative group">
                                            {/* Dot on timeline */}
                                            <div className="absolute -left-[31px] top-3 h-3 w-3 rounded-full border-2 border-primary-500 bg-surface" />
                                            <div className="rounded-radius-md border border-border-default bg-surface p-4 hover:border-border-emphasis transition-colors cursor-pointer">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-radius-md bg-primary-50 shrink-0 dark:bg-primary-50">
                                                        <Icon className="h-4 w-4 text-primary-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-caption text-text-muted flex items-center gap-1">
                                                                <Clock className="h-3 w-3" /> {time}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-body font-semibold text-text-primary">{itemTitle}</h4>
                                                        <p className="text-body-sm text-text-muted">{subtitle}</p>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-4" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
