"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPin, Calendar, Plane, Hotel, Clock, Loader2, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { JourneyTimeline } from "@/components/shared/JourneyTimeline";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { SavedTrip } from "@/lib/supabase/types";

export default function TripsPage() {
    const { user, loading: userLoading } = useUser();
    const [trips, setTrips] = useState<SavedTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        loadTrips();
    }, [user]);

    async function loadTrips() {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("saved_trips")
                .select("*")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTrips((data as SavedTrip[]) || []);
        } catch (err) {
            console.error("Failed to load trips:", err);
        } finally {
            setLoading(false);
        }
    }

    async function deleteTrip(tripId: string) {
        setDeleting(tripId);
        try {
            const supabase = createClient();
            await supabase.from("saved_trips").delete().eq("id", tripId);
            setTrips((prev) => prev.filter((t) => t.id !== tripId));
        } catch (err) {
            console.error("Failed to delete trip:", err);
        } finally {
            setDeleting(null);
        }
    }

    const statusColor = (s: string) => {
        switch (s) {
            case "planning": return "neutral";
            case "booked": return "primary";
            case "completed": return "success";
            default: return "neutral";
        }
    };

    const timelineStages = (status: string) => [
        { label: "Planned", completed: true, icon: "📝" },
        { label: "Booked", completed: status === "booked" || status === "completed", icon: "✅" },
        { label: "Completed", completed: status === "completed", icon: "✈️" },
    ];

    if (userLoading || loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
                <Skeleton className="h-10 w-48 mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 rounded-radius-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-h2 text-text-primary">My Trips</h1>
                    <p className="text-body text-text-muted mt-1">
                        {trips.length} {trips.length === 1 ? "trip" : "trips"} saved
                    </p>
                </div>
            </div>

            {trips.length === 0 ? (
                <div className="text-center py-24 rounded-radius-xl bg-surface-sunken border border-border-default">
                    <MapPin className="h-14 w-14 text-text-muted mx-auto mb-4 opacity-30" />
                    <h3 className="text-h3 text-text-primary mb-2">No trips yet</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto mb-6">
                        Search for trips on the homepage and save the ones you like. They&apos;ll appear here for you to track and manage.
                    </p>
                    <Button variant="primary" size="lg" onClick={() => window.location.href = "/"}>
                        Start Searching
                    </Button>
                </div>
            ) : (
                <div className="space-y-5">
                    {trips.map((trip) => (
                        <div
                            key={trip.id}
                            className="rounded-radius-xl border border-border-default bg-surface overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-display text-lg font-bold text-white">
                                        {trip.origin} → {trip.destination}
                                    </h3>
                                    <Badge variant={statusColor(trip.status) as "neutral" | "primary" | "success"}>
                                        {trip.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-primary-100">
                                        {new Date(trip.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={() => deleteTrip(trip.id)}
                                        disabled={deleting === trip.id}
                                        className="text-white/60 hover:text-error transition-colors"
                                        aria-label="Delete trip"
                                    >
                                        {deleting === trip.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center gap-6 mb-4">
                                    <JourneyTimeline stages={timelineStages(trip.status)} />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="rounded-radius-md bg-surface-sunken p-3 text-center">
                                        <Calendar className="h-4 w-4 text-text-muted mx-auto mb-1" />
                                        <p className="text-lg font-bold text-text-primary">{trip.days}</p>
                                        <p className="text-xs text-text-muted">{trip.days === 1 ? "Night" : "Nights"}</p>
                                    </div>
                                    <div className="rounded-radius-md bg-surface-sunken p-3 text-center">
                                        <span className="text-lg font-bold text-primary-500">R${trip.total_cost.toLocaleString()}</span>
                                        <p className="text-xs text-text-muted">Total Cost</p>
                                    </div>
                                    <div className="rounded-radius-md bg-surface-sunken p-3 text-center">
                                        <span className="text-lg font-bold text-text-primary">R${trip.budget.toLocaleString()}</span>
                                        <p className="text-xs text-text-muted">Budget</p>
                                    </div>
                                    <div className="rounded-radius-md bg-surface-sunken p-3 text-center">
                                        <span className={cn(
                                            "text-lg font-bold",
                                            trip.budget - trip.total_cost >= 0 ? "text-success" : "text-error"
                                        )}>
                                            R${(trip.budget - trip.total_cost).toLocaleString()}
                                        </span>
                                        <p className="text-xs text-text-muted">Saved</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
