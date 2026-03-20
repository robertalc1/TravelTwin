"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Plane, Hotel, Ticket, Clock, ChevronRight, Edit3, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";
import { getCityImageByIata } from "@/lib/cityImages";

interface TripViewData {
    destination: string;
    destinationCity: string;
    origin: string;
    originCity: string;
    departureDate: string;
    returnDate: string;
    days: number;
    price: number;
    originalPrice?: number;
    currency: string;
    isDirect?: boolean;
    travelers?: number;
    imageUrl?: string;
}

const stages = [
    { label: "Inspire", completed: true },
    { label: "Search", completed: true },
    { label: "Compare", completed: true },
    { label: "Book", completed: false },
    { label: "Travel", completed: false },
];

const iconMap: Record<string, typeof Plane> = { flight: Plane, hotel: Hotel, activity: Ticket };

function formatDate(dateStr: string) {
    try {
        return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short" });
    } catch {
        return dateStr;
    }
}

function formatPrice(price: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    } catch {
        return `${currency} ${Math.round(price)}`;
    }
}

export default function TripDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [tripData, setTripData] = useState<TripViewData | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;
        try {
            const stored = sessionStorage.getItem(`tripView_${id}`);
            if (stored) {
                setTripData(JSON.parse(stored));
            } else {
                setNotFound(true);
            }
        } catch {
            setNotFound(true);
        }
    }, [id]);

    if (notFound) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center px-4">
                    <Plane className="h-16 w-16 text-text-muted mx-auto mb-4 opacity-30" />
                    <h1 className="text-h3 text-text-primary mb-2">Trip not found</h1>
                    <p className="text-body text-text-muted mb-6">
                        This trip could not be loaded. Please go back and click {'"View deal"'} again.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to search
                    </Link>
                </div>
            </div>
        );
    }

    if (!tripData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    const heroImage = tripData.imageUrl || getCityImageByIata(tripData.destination, tripData.destination);

    const itinerary = [
        {
            day: 1,
            date: formatDate(tripData.departureDate),
            title: `Arrival in ${tripData.destinationCity}`,
            items: [
                {
                    time: "—",
                    type: "flight",
                    title: `Flight to ${tripData.destinationCity} (${tripData.destination})`,
                    subtitle: `${tripData.isDirect ? "Direct flight" : "Connecting flight"} from ${tripData.originCity || tripData.origin}`,
                },
                {
                    time: "—",
                    type: "hotel",
                    title: `Check in at hotel in ${tripData.destinationCity}`,
                    subtitle: `${tripData.days} night${tripData.days !== 1 ? "s" : ""} stay`,
                },
            ],
        },
        ...(tripData.days > 1
            ? [
                {
                    day: 2,
                    date: "",
                    title: `Explore ${tripData.destinationCity}`,
                    items: [
                        {
                            time: "09:00",
                            type: "activity",
                            title: `Discover ${tripData.destinationCity}`,
                            subtitle: "Visit local attractions and landmarks",
                        },
                    ],
                },
            ]
            : []),
        {
            day: tripData.days,
            date: formatDate(tripData.returnDate),
            title: "Return Journey",
            items: [
                {
                    time: "—",
                    type: "hotel",
                    title: "Check out",
                    subtitle: "Hotel checkout",
                },
                {
                    time: "—",
                    type: "flight",
                    title: `Return flight to ${tripData.originCity || tripData.origin}`,
                    subtitle: `Back to ${tripData.originCity || tripData.origin}`,
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <div className="relative h-64 md:h-80 overflow-hidden">
                <img
                    src={heroImage}
                    alt={tripData.destinationCity}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&q=80";
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <Badge variant="success" className="mb-3">Live Deal</Badge>
                        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">
                            {tripData.destinationCity} Trip
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-white/80 text-sm">
                            <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" /> {tripData.destinationCity}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(tripData.departureDate)} – {formatDate(tripData.returnDate)}
                            </span>
                            <span>{tripData.days} day{tripData.days !== 1 ? "s" : ""}</span>
                            <span className="font-bold text-white">
                                {formatPrice(tripData.price, tripData.currency)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6">
                    <ArrowLeft className="h-4 w-4" /> Back to search
                </Link>

                {/* Journey Timeline */}
                <div className="mb-8 flex justify-center">
                    <JourneyTimeline stages={stages} />
                </div>

                {/* Trip summary bar */}
                <div className="flex flex-wrap items-center gap-6 rounded-radius-lg bg-surface border border-border-default p-4 mb-8">
                    <div className="flex items-center gap-2 text-body-sm">
                        <Plane className="h-4 w-4 text-primary-500" />
                        <span className="font-medium">2 Flights</span>
                    </div>
                    <div className="flex items-center gap-2 text-body-sm">
                        <Hotel className="h-4 w-4 text-primary-500" />
                        <span className="font-medium">1 Hotel</span>
                    </div>
                    <div className="flex items-center gap-2 text-body-sm">
                        <Ticket className="h-4 w-4 text-primary-500" />
                        <span className="font-medium">{tripData.days} Nights</span>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" icon={<Share2 className="h-4 w-4" />}>Share</Button>
                        <Button variant="ghost" size="sm" icon={<Edit3 className="h-4 w-4" />}>Edit</Button>
                    </div>
                </div>

                {/* Day-by-day timeline */}
                <div className="space-y-8">
                    {itinerary.map(({ day, date, title, items }) => (
                        <div key={day} className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-radius-full bg-primary-500 text-white font-display font-bold text-sm shrink-0">
                                    {day}
                                </div>
                                <div>
                                    <h3 className="text-h4 text-text-primary">{title}</h3>
                                    {date && <p className="text-caption text-text-muted">{date}</p>}
                                </div>
                            </div>

                            <div className="ml-5 border-l-2 border-border-default pl-6 space-y-4">
                                {items.map(({ time, type, title: itemTitle, subtitle }, j) => {
                                    const Icon = iconMap[type] || Ticket;
                                    return (
                                        <div key={j} className="relative group">
                                            <div className="absolute -left-[31px] top-3 h-3 w-3 rounded-full border-2 border-primary-500 bg-surface" />
                                            <div className="rounded-radius-md border border-border-default bg-surface p-4 hover:border-border-emphasis transition-colors cursor-pointer">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-radius-md bg-primary-50 shrink-0">
                                                        <Icon className="h-4 w-4 text-primary-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        {time !== "—" && (
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-caption text-text-muted flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> {time}
                                                                </span>
                                                            </div>
                                                        )}
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

                {/* Book CTA */}
                <div className="mt-10 rounded-xl bg-primary-50 border border-primary-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-text-secondary mb-1">Total estimated price</p>
                        <div className="flex items-baseline gap-2">
                            {tripData.originalPrice && tripData.originalPrice > tripData.price && (
                                <span className="text-sm text-text-muted line-through">
                                    {formatPrice(tripData.originalPrice, tripData.currency)}
                                </span>
                            )}
                            <span className="text-2xl font-bold text-primary-600">
                                {formatPrice(tripData.price, tripData.currency)}
                            </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                            For {tripData.travelers || 1} traveler{(tripData.travelers || 1) > 1 ? "s" : ""}
                        </p>
                    </div>
                    <Link
                        href="/booking/simulate"
                        className="rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors whitespace-nowrap"
                    >
                        Book this trip
                    </Link>
                </div>
            </div>
        </div>
    );
}
