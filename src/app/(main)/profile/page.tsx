"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    Globe,
    Compass,
    Heart,
    Search,
    Plane,
    Calendar,
    Loader2,
    Save,
    Star,
    Pencil,
    BadgeCheck,
    Bell,
    Moon,
    DollarSign,
    AlertTriangle,
    Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToastStore } from "@/stores/toastStore";
import { useCurrencyStore, CURRENCY_LIST, type CurrencyCode } from "@/stores/currencyStore";
import { useAuthModal } from "@/stores/authModalStore";
import type { SavedTrip, Favorite } from "@/lib/supabase/types";

const NATIONALITIES = [
    "Romanian", "Bulgarian", "Hungarian", "Polish", "Czech", "German",
    "French", "Italian", "Spanish", "Portuguese", "Dutch", "Belgian",
    "Austrian", "Swiss", "Greek", "Swedish", "Norwegian", "Danish", "Finnish",
    "Irish", "British", "Croatian", "Serbian", "Ukrainian", "Other",
];

const TRAVEL_STYLES = [
    { id: "adventure", label: "Adventure" },
    { id: "luxury", label: "Luxury" },
    { id: "budget", label: "Budget" },
    { id: "family", label: "Family" },
    { id: "solo", label: "Solo" },
    { id: "business", label: "Business" },
] as const;

type TabId = "personal" | "trips" | "favorites" | "settings";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
    { id: "personal", label: "Personal Info" },
    { id: "trips", label: "My Trips" },
    { id: "favorites", label: "Favorites" },
    { id: "settings", label: "Settings" },
];

export default function ProfilePage() {
    const router = useRouter();
    const { user, profile, loading: userLoading, displayName } = useUser();
    const openAuthModal = useAuthModal((s) => s.open);
    const showToast = useToastStore((s) => s.show);

    const [activeTab, setActiveTab] = useState<TabId>("personal");

    /* ── Open auth modal if not logged in ── */
    useEffect(() => {
        if (!userLoading && !user) openAuthModal("login");
    }, [user, userLoading, openAuthModal]);

    /* ── Stats ── */
    const [stats, setStats] = useState({ trips: 0, searches: 0, reviews: 0, favorites: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const supabase = createClient();
            const [trips, searches, reviews, favs] = await Promise.all([
                supabase.from("saved_trips").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("user_searches").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            ]);
            if (!cancelled) {
                setStats({
                    trips: trips.count ?? 0,
                    searches: searches.count ?? 0,
                    reviews: reviews.count ?? 0,
                    favorites: favs.count ?? 0,
                });
                setStatsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    /* ── Member since ── */
    const memberSince = useMemo(() => {
        const ts = profile?.created_at ?? user?.created_at;
        if (!ts) return null;
        try {
            return new Date(ts).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        } catch { return null; }
    }, [profile, user]);

    if (userLoading) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8 space-y-6">
                <Skeleton className="h-48 rounded-2xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <User className="h-12 w-12 mx-auto text-text-muted mb-4" />
                <h2 className="text-xl font-bold text-text-primary mb-2">Sign in to view your profile</h2>
                <p className="text-text-secondary mb-6">A login modal should appear automatically.</p>
                <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className="rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                    Open login
                </button>
            </div>
        );
    }

    const initials = displayName
        .split(/\s+/)
        .filter((p: string) => p.length > 0)
        .slice(0, 2)
        .map((p: string) => p[0]!.toUpperCase())
        .join("") || "?";

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
            {/* ─── Cover + avatar header ─── */}
            <div className="rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-surface mb-6">
                <div className="relative h-32 sm:h-40 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_60%)]" />
                </div>
                <div className="px-5 sm:px-8 pb-6 -mt-12 sm:-mt-14 relative">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                        <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-primary-500 text-white text-3xl font-extrabold ring-4 ring-white dark:ring-surface shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0 sm:pb-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary truncate">{displayName}</h1>
                            <p className="text-sm text-text-secondary truncate">{user.email}</p>
                            {memberSince && (
                                <p className="text-xs text-text-muted mt-1">Member since {memberSince}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveTab("personal")}
                            className="inline-flex items-center gap-2 self-start rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Stats row ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <StatCard icon={Plane} label="Trips" value={stats.trips} loading={statsLoading} tint="primary" />
                <StatCard icon={Search} label="Searches" value={stats.searches} loading={statsLoading} tint="amber" />
                <StatCard icon={Star} label="Reviews" value={stats.reviews} loading={statsLoading} tint="yellow" />
                <StatCard icon={Heart} label="Favorites" value={stats.favorites} loading={statsLoading} tint="red" />
            </div>

            {/* ─── Tabs ─── */}
            <div className="flex gap-1 border-b border-neutral-200 dark:border-border-default mb-6 overflow-x-auto no-scrollbar">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                            "relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors",
                            activeTab === t.id ? "text-primary-500" : "text-text-secondary hover:text-text-primary"
                        )}
                        role="tab"
                        aria-selected={activeTab === t.id}
                    >
                        {t.label}
                        {activeTab === t.id && (
                            <motion.div
                                layoutId="profileActiveTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* ─── Tab content ─── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === "personal" && <PersonalInfoTab onSaved={() => showToast("Profile saved", "success")} />}
                    {activeTab === "trips" && <TripsTab onPlanClick={() => router.push("/plan")} />}
                    {activeTab === "favorites" && <FavoritesTab onExploreClick={() => router.push("/explore")} />}
                    {activeTab === "settings" && <SettingsTab />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

/* ═════════ Stat card ═════════ */
const TINTS = {
    primary: "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    yellow: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    red: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
} as const;

function StatCard({
    icon: Icon, label, value, loading, tint,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string; value: number; loading: boolean;
    tint: keyof typeof TINTS;
}) {
    return (
        <div className="rounded-2xl bg-white dark:bg-surface shadow-sm border border-neutral-100 dark:border-border-default p-4 flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TINTS[tint])}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                {loading ? (
                    <Skeleton className="h-7 w-12 mb-1" />
                ) : (
                    <p className="text-2xl font-extrabold text-text-primary leading-none">{value}</p>
                )}
                <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
        </div>
    );
}

/* ═════════ TAB — Personal Info ═════════ */
function PersonalInfoTab({ onSaved }: { onSaved: () => void }) {
    const { user, profile } = useUser();
    const [fullName, setFullName] = useState("");
    const [nationality, setNationality] = useState("");
    const [styles, setStyles] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const currency = useCurrencyStore((s) => s.currency);
    const setCurrency = useCurrencyStore((s) => s.setCurrency);

    useEffect(() => {
        if (!profile) return;
        setFullName(profile.full_name ?? "");
        setNationality(profile.nationality ?? "");
        const raw = profile.travel_style ?? "";
        setStyles(raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : []);
    }, [profile]);

    function toggleStyle(id: string) {
        setStyles((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.from("profiles").upsert({
                id: user.id,
                full_name: fullName,
                email: user.email,
                nationality,
                travel_style: styles.join(","),
                updated_at: new Date().toISOString(),
            });
            if (error) throw error;
            onSaved();
        } catch (err) {
            console.error("[profile/save]", err);
            useToastStore.getState().show("Couldn’t save — try again", "error");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSave}
            className="rounded-2xl bg-white dark:bg-surface shadow-sm border border-neutral-100 dark:border-border-default p-5 sm:p-7 space-y-5"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" icon={User}>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </Field>
                <Field label="Email" icon={Mail}>
                    <div className="relative">
                        <input
                            type="email"
                            value={user?.email ?? ""}
                            disabled
                            className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-neutral-50 dark:bg-surface-sunken px-3 py-2.5 pr-24 text-sm text-text-secondary cursor-not-allowed"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold">
                            <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                    </div>
                </Field>
                <Field label="Nationality" icon={Globe}>
                    <select
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Select…</option>
                        {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </Field>
                <Field label="Preferred currency" icon={DollarSign}>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                        className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {CURRENCY_LIST.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                        ))}
                    </select>
                </Field>
            </div>

            <div>
                <Label icon={Compass}>Travel style</Label>
                <div className="flex flex-wrap gap-2">
                    {TRAVEL_STYLES.map((s) => {
                        const selected = styles.includes(s.id);
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleStyle(s.id)}
                                className={cn(
                                    "rounded-full px-4 py-2 text-sm font-medium transition-all border",
                                    selected
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400"
                                        : "border-neutral-200 dark:border-border-default text-text-secondary hover:border-primary-300"
                                )}
                            >
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </button>
                <button
                    type="button"
                    disabled
                    title="Coming soon — for now use 'Forgot password' on the login modal"
                    className="rounded-full border border-neutral-200 dark:border-border-default px-5 py-3 text-sm font-semibold text-text-secondary cursor-not-allowed opacity-60"
                >
                    Change Password
                </button>
            </div>
        </form>
    );
}

function Label({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <Icon className="h-3.5 w-3.5" />
            {children}
        </div>
    );
}

function Field({
    label, icon, children,
}: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <label className="block">
            <Label icon={icon}>{label}</Label>
            {children}
        </label>
    );
}

/* ═════════ TAB — My Trips ═════════ */
function TripsTab({ onPlanClick }: { onPlanClick: () => void }) {
    const { user } = useUser();
    const [trips, setTrips] = useState<SavedTrip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("saved_trips")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (!cancelled) {
                setTrips((data as SavedTrip[]) ?? []);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
            </div>
        );
    }

    if (trips.length === 0) {
        return (
            <EmptyState
                icon={Calendar}
                title="No trips yet"
                body="Plan your first trip and we’ll save it here for easy access."
                ctaLabel="Plan Your First Trip"
                onCta={onPlanClick}
            />
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((t) => (
                <Link
                    key={t.id}
                    href={`/trips/${t.id}`}
                    className="rounded-2xl bg-white dark:bg-surface shadow-sm border border-neutral-100 dark:border-border-default p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-text-primary truncate">{t.destination}</h3>
                        <StatusPill status={t.status} />
                    </div>
                    <div className="text-xs text-text-secondary space-y-1">
                        <p className="flex items-center gap-1.5"><Plane className="h-3.5 w-3.5" /> from {t.origin}</p>
                        <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {t.days} days</p>
                    </div>
                    <p className="mt-3 text-lg font-extrabold text-primary-500">€{Math.round(t.total_cost ?? 0).toLocaleString()}</p>
                </Link>
            ))}
        </div>
    );
}

function StatusPill({ status }: { status: SavedTrip["status"] }) {
    const map: Record<SavedTrip["status"], { bg: string; text: string; label: string }> = {
        planning: { bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", label: "Planning" },
        booked: { bg: "bg-primary-100 dark:bg-primary-500/15", text: "text-primary-700 dark:text-primary-400", label: "Booked" },
        completed: { bg: "bg-emerald-100 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", label: "Completed" },
    };
    const m = map[status] ?? map.planning;
    return <span className={`rounded-full ${m.bg} ${m.text} px-2.5 py-0.5 text-[11px] font-semibold`}>{m.label}</span>;
}

/* ═════════ TAB — Favorites ═════════ */
function FavoritesTab({ onExploreClick }: { onExploreClick: () => void }) {
    const { user } = useUser();
    const showToast = useToastStore((s) => s.show);
    const [favs, setFavs] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("favorites")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (!cancelled) {
                setFavs((data as Favorite[]) ?? []);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    async function remove(fav: Favorite) {
        setRemoving(fav.id);
        try {
            const res = await fetch(`/api/favorites?id=${encodeURIComponent(fav.id)}`, { method: "DELETE" });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.error || `HTTP ${res.status}`);
            }
            setFavs((prev) => prev.filter((f) => f.id !== fav.id));
            showToast("Removed from favorites", "info");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Couldn’t remove — try again";
            showToast(message, "error");
        } finally {
            setRemoving(null);
        }
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
        );
    }

    if (favs.length === 0) {
        return (
            <EmptyState
                icon={Heart}
                title="No favorites yet"
                body="Bookmark destinations you love to access them quickly later."
                ctaLabel="Explore Destinations"
                onCta={onExploreClick}
            />
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favs.map((f) => (
                <div
                    key={f.id}
                    className="rounded-2xl bg-white dark:bg-surface shadow-sm border border-neutral-100 dark:border-border-default p-5 flex items-start justify-between"
                >
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                            {f.item_name}
                        </h3>
                        <p className="text-xs text-text-muted mt-1">
                            Saved {new Date(f.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => remove(f)}
                        disabled={removing === f.id}
                        aria-label={`Remove ${f.item_name}`}
                        className="text-text-muted hover:text-red-500 transition-colors disabled:opacity-60"
                    >
                        {removing === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                </div>
            ))}
        </div>
    );
}

/* ═════════ TAB — Settings ═════════ */
function SettingsTab() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const showToast = useToastStore((s) => s.show);
    const [emailNotif, setEmailNotif] = useState(true);
    const [priceAlerts, setPriceAlerts] = useState(false);

    const isDark = (theme === "dark") || (theme === "system" && resolvedTheme === "dark");

    return (
        <div className="space-y-4">
            <SettingRow
                icon={Bell}
                title="Email notifications"
                description="Trip confirmations, deals, and product updates."
                checked={emailNotif}
                onToggle={() => { setEmailNotif((v) => !v); showToast("Preference saved locally", "info"); }}
            />
            <SettingRow
                icon={DollarSign}
                title="Price alerts"
                description="We’ll ping you when a tracked flight or hotel drops in price."
                checked={priceAlerts}
                onToggle={() => { setPriceAlerts((v) => !v); showToast("Preference saved locally", "info"); }}
            />
            <SettingRow
                icon={Moon}
                title="Dark mode"
                description="Use the dark theme across the app."
                checked={isDark}
                onToggle={() => setTheme(isDark ? "light" : "dark")}
            />

            {/* Danger zone */}
            <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-5 mt-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-red-700 dark:text-red-300">Danger zone</h3>
                        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-3">
                            Permanently delete your account and all associated data. This cannot be undone.
                        </p>
                        <button
                            type="button"
                            onClick={() => showToast("Account deletion requires email verification — contact support.", "info")}
                            className="rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 text-sm transition-colors"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingRow({
    icon: Icon, title, description, checked, onToggle,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string; description: string;
    checked: boolean; onToggle: () => void;
}) {
    return (
        <div className="rounded-2xl bg-white dark:bg-surface shadow-sm border border-neutral-100 dark:border-border-default p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-surface-elevated text-text-secondary">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-text-primary">{title}</p>
                    <p className="text-xs text-text-secondary">{description}</p>
                </div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={onToggle}
                className={cn(
                    "relative h-6 w-11 rounded-full transition-colors shrink-0",
                    checked ? "bg-primary-500" : "bg-neutral-200 dark:bg-surface-elevated"
                )}
            >
                <span
                    className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
                    )}
                />
            </button>
        </div>
    );
}

/* ═════════ Empty state ═════════ */
function EmptyState({
    icon: Icon, title, body, ctaLabel, onCta,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string; body: string;
    ctaLabel: string; onCta: () => void;
}) {
    return (
        <div className="rounded-2xl bg-white dark:bg-surface shadow-sm border border-dashed border-neutral-300 dark:border-border-default p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-500/15 text-primary-500">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">{body}</p>
            <button
                type="button"
                onClick={onCta}
                className="rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
                {ctaLabel}
            </button>
        </div>
    );
}
