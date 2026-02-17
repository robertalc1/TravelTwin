"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Globe, Compass, Heart, Search, MapPin, Plane, Hotel, Calendar, Loader2, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Profile, SavedTrip, UserSearch, Review } from "@/lib/supabase/types";

export default function ProfilePage() {
    const { user, profile, loading: userLoading, displayName } = useUser();
    const [fullName, setFullName] = useState("");
    const [nationality, setNationality] = useState("");
    const [travelStyle, setTravelStyle] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        trips: 0,
        searches: 0,
        reviews: 0,
        favorites: 0,
    });
    const [recentSearches, setRecentSearches] = useState<UserSearch[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "");
            setNationality(profile.nationality || "");
            setTravelStyle(profile.travel_style || "");
        }
    }, [profile]);

    useEffect(() => {
        if (!user) return;
        loadStats();
    }, [user]);

    async function loadStats() {
        try {
            const supabase = createClient();
            const [tripsRes, searchesRes, reviewsRes, favsRes, recentRes] = await Promise.all([
                supabase.from("saved_trips").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
                supabase.from("user_searches").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
                supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
                supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
                supabase.from("user_searches").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
            ]);

            setStats({
                trips: tripsRes.count || 0,
                searches: searchesRes.count || 0,
                reviews: reviewsRes.count || 0,
                favorites: favsRes.count || 0,
            });
            setRecentSearches((recentRes.data as UserSearch[]) || []);
        } catch (err) {
            console.error("Failed to load stats:", err);
        } finally {
            setLoadingStats(false);
        }
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaveSuccess(false);

        try {
            const supabase = createClient();
            const { error } = await supabase.from("profiles").upsert({
                id: user!.id,
                full_name: fullName,
                email: user!.email,
                nationality,
                travel_style: travelStyle,
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save profile:", err);
        } finally {
            setSaving(false);
        }
    }

    if (userLoading) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
                <Skeleton className="h-10 w-48 mb-6" />
                <Skeleton className="h-48 rounded-radius-xl mb-6" />
                <Skeleton className="h-48 rounded-radius-xl" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
            <h1 className="text-h2 text-text-primary mb-8">My Profile</h1>

            {/* Profile Card */}
            <div className="rounded-radius-xl border border-border-default bg-surface overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white text-2xl font-bold backdrop-blur-sm">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="font-display text-xl font-bold text-white">{displayName}</h2>
                            <p className="text-sm text-primary-100">{user?.email}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            leadingIcon={<User className="h-4 w-4" />}
                            placeholder="Your full name"
                        />
                        <Input
                            label="Email"
                            value={user?.email || ""}
                            disabled
                            leadingIcon={<Mail className="h-4 w-4" />}
                        />
                        <Input
                            label="Nationality"
                            value={nationality}
                            onChange={(e) => setNationality(e.target.value)}
                            leadingIcon={<Globe className="h-4 w-4" />}
                            placeholder="e.g. Brazilian"
                        />
                        <Input
                            label="Travel Style"
                            value={travelStyle}
                            onChange={(e) => setTravelStyle(e.target.value)}
                            leadingIcon={<Compass className="h-4 w-4" />}
                            placeholder="e.g. Adventure, Luxury, Budget"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="primary" size="md" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Profile
                                </>
                            )}
                        </Button>
                        {saveSuccess && (
                            <span className="text-sm text-success font-medium">✓ Profile saved!</span>
                        )}
                    </div>
                </form>
            </div>

            {/* Stats */}
            <div className="rounded-radius-xl border border-border-default bg-surface p-6 mb-8">
                <h2 className="text-h4 text-text-primary mb-4">Travel Stats</h2>
                {loadingStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-20 rounded-radius-md" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: MapPin, label: "Trips", value: stats.trips, color: "text-primary-500" },
                            { icon: Search, label: "Searches", value: stats.searches, color: "text-accent-500" },
                            { icon: Star, label: "Reviews", value: stats.reviews, color: "text-gold-500" },
                            { icon: Heart, label: "Favorites", value: stats.favorites, color: "text-error" },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="rounded-radius-md bg-surface-sunken p-4 text-center">
                                <Icon className={cn("h-5 w-5 mx-auto mb-2", color)} />
                                <p className="text-2xl font-bold text-text-primary">{value}</p>
                                <p className="text-xs text-text-muted">{label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
                <div className="rounded-radius-xl border border-border-default bg-surface p-6">
                    <h2 className="text-h4 text-text-primary mb-4">Recent Searches</h2>
                    <div className="space-y-3">
                        {recentSearches.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between rounded-radius-md bg-surface-sunken p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Plane className="h-4 w-4 text-primary-500" />
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">
                                            From {s.from_city}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            R${s.budget} budget · {s.days} nights · {s.flight_type}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="neutral">{s.results_count} results</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
