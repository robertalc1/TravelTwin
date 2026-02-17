"use client";

import { ArrowLeft, MapPin, Star, Wifi, Car, Waves, Coffee, Dumbbell, Sparkles, Heart, Share2, Shield, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RatingStars } from "@/components/ui/RatingStars";
import { cn } from "@/lib/utils";

const images = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
];

const rooms = [
    { name: "Superior Room", size: "28 m²", bed: "1 King Bed", price: 289, originalPrice: 389, features: ["City view", "Free WiFi", "Breakfast included"] },
    { name: "Deluxe Room", size: "35 m²", bed: "1 King Bed", price: 389, features: ["Park view", "Free WiFi", "Breakfast included", "Minibar"] },
    { name: "Junior Suite", size: "48 m²", bed: "1 King Bed + Sofa", price: 529, features: ["Panoramic view", "Free WiFi", "Breakfast included", "Lounge access"] },
];

export default function HotelDetailPage() {
    const [activeImage, setActiveImage] = useState(0);

    return (
        <div className="min-h-screen bg-background">
            {/* Gallery */}
            <div className="bg-neutral-900">
                <div className="mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:h-[400px]">
                        <div className="md:col-span-2 md:row-span-2 relative overflow-hidden">
                            <img src={images[0]} alt="Hotel main view" className="h-full w-full object-cover" />
                        </div>
                        {images.slice(1).map((img, i) => (
                            <div key={i} className="hidden md:block relative overflow-hidden">
                                <img src={img} alt={`Hotel view ${i + 2}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
                <Link href="/hotels" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6">
                    <ArrowLeft className="h-4 w-4" />
                    Back to results
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header */}
                        <div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="accent">Best Seller</Badge>
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} className="h-4 w-4 fill-gold-500 text-gold-500" />
                                            ))}
                                        </div>
                                    </div>
                                    <h1 className="text-h1 text-text-primary">The Langham, London</h1>
                                    <div className="flex items-center gap-2 mt-2 text-text-secondary">
                                        <MapPin className="h-4 w-4" />
                                        <span>1C Portland Place, Marylebone, London W1B 1JA</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex h-10 w-10 items-center justify-center rounded-radius-full border border-border-default hover:bg-surface-sunken transition-colors">
                                        <Share2 className="h-4 w-4 text-text-secondary" />
                                    </button>
                                    <button className="flex h-10 w-10 items-center justify-center rounded-radius-full border border-border-default hover:bg-surface-sunken transition-colors">
                                        <Heart className="h-4 w-4 text-text-secondary" />
                                    </button>
                                </div>
                            </div>

                            <RatingStars rating={4.8} reviewCount={2341} size="md" className="mt-4" />
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-h4 text-text-primary mb-3">About this hotel</h2>
                            <p className="text-body text-text-secondary leading-relaxed">
                                The Langham, London is a luxury 5-star hotel located in the heart of the West End. Established in 1865,
                                it was Europe&apos;s first Grand Hotel and offers a perfect blend of Victorian grandeur and modern luxury.
                                Enjoy award-winning dining, the renowned Chuan Body + Soul spa, and elegant rooms overlooking Portland Place.
                            </p>
                        </div>

                        {/* Amenities */}
                        <div>
                            <h2 className="text-h4 text-text-primary mb-4">Amenities</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { icon: Wifi, label: "Free WiFi" },
                                    { icon: Waves, label: "Indoor Pool" },
                                    { icon: Car, label: "Valet Parking" },
                                    { icon: Coffee, label: "Restaurant & Bar" },
                                    { icon: Dumbbell, label: "Fitness Center" },
                                    { icon: Sparkles, label: "Spa & Wellness" },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center gap-3 rounded-radius-md border border-border-default p-3">
                                        <Icon className="h-5 w-5 text-primary-500" />
                                        <span className="text-body-sm text-text-secondary">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rooms */}
                        <div>
                            <h2 className="text-h4 text-text-primary mb-4">Available Rooms</h2>
                            <div className="space-y-3">
                                {rooms.map((room) => (
                                    <div key={room.name} className="rounded-radius-lg border border-border-default bg-surface p-5 hover:border-border-emphasis transition-colors">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-display text-lg font-bold text-text-primary">{room.name}</h3>
                                                <p className="text-body-sm text-text-muted mt-1">{room.size} · {room.bed}</p>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {room.features.map((f) => (
                                                        <Badge key={f} variant="neutral" className="text-[11px]">{f}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-baseline gap-1.5 justify-end">
                                                    <span className="font-mono text-2xl font-bold text-text-primary">${room.price}</span>
                                                    {room.originalPrice && (
                                                        <span className="text-sm text-text-muted line-through">${room.originalPrice}</span>
                                                    )}
                                                </div>
                                                <span className="text-caption text-text-muted">per night</span>
                                                <div className="mt-3">
                                                    <Link href={`/booking/hotel-${room.name.toLowerCase().replace(/\s/g, "-")}`}>
                                                        <Button variant="primary" size="sm">Select Room</Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-20 rounded-radius-lg border border-border-default bg-surface p-6">
                            <div className="flex items-baseline gap-1.5 mb-1">
                                <span className="font-mono text-3xl font-bold text-text-primary">$289</span>
                                <span className="text-sm text-text-muted line-through">$389</span>
                            </div>
                            <p className="text-caption text-text-muted mb-6">per night · taxes included</p>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 rounded-radius-md border border-border-default p-3">
                                    <Calendar className="h-4 w-4 text-text-muted" />
                                    <div>
                                        <div className="text-[10px] font-semibold text-text-muted uppercase">Check-in — Check-out</div>
                                        <div className="text-sm font-medium text-text-primary">Mar 15 – Mar 22</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-radius-md border border-border-default p-3">
                                    <Users className="h-4 w-4 text-text-muted" />
                                    <div>
                                        <div className="text-[10px] font-semibold text-text-muted uppercase">Guests</div>
                                        <div className="text-sm font-medium text-text-primary">2 Adults, 1 Room</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6 pb-6 border-b border-border-default">
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-text-secondary">$289 × 7 nights</span>
                                    <span className="text-text-primary font-medium">$2,023</span>
                                </div>
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-text-secondary">Taxes & fees</span>
                                    <span className="text-text-primary font-medium">$254</span>
                                </div>
                                <div className="flex justify-between text-body font-semibold pt-2">
                                    <span className="text-text-primary">Total</span>
                                    <span className="font-mono text-xl text-text-primary">$2,277</span>
                                </div>
                            </div>

                            <Button variant="primary" size="lg" className="w-full">
                                Reserve Now
                            </Button>

                            <div className="mt-4 flex items-center gap-2 text-caption text-text-muted">
                                <Shield className="h-3.5 w-3.5 text-success" />
                                Free cancellation before Mar 13
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
