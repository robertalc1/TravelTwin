"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Plane, Hotel, MapIcon, LogOut, Heart, Loader2, Headphones, Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";

const navLinks = [
    { href: "/plan", label: "Plan a Trip", icon: Sparkles, accent: true },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/flights", label: "Flights", icon: Plane },
    { href: "/hotels", label: "Hotels", icon: Hotel },
    { href: "/trips", label: "Trips", icon: MapIcon },
];

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, loading, displayName } = useUser();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await fetch("/auth/logout", { method: "POST" });
            router.push("/");
            router.refresh();
        } catch {
            setLoggingOut(false);
        }
    }

    return (
        <>
            <header
                className={cn(
                    "sticky top-0 z-50 w-full transition-all duration-300 bg-white dark:bg-surface border-b",
                    scrolled
                        ? "shadow-sm border-neutral-200 dark:border-border-default"
                        : "border-transparent"
                )}
            >
                <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 lg:px-8">
                    {/* Logo — TravelTwin */}
                    <Link href="/" className="flex items-center gap-0 group">
                        <span className="font-display text-2xl font-extrabold tracking-tight text-primary-500">
                            Travel
                        </span>
                        <span className="font-display text-2xl font-extrabold tracking-tight text-secondary-500">Twin</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
                        {navLinks.map(({ href, label, icon: Icon, accent }) => {
                            const isActive = pathname?.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                                        accent && !isActive
                                            ? "bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
                                            : isActive
                                                ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10"
                                                : "text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated"
                                    )}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {/* Live Agent button */}
                        <button className="hidden md:flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 bg-neutral-100 text-text-secondary hover:bg-neutral-200 dark:bg-surface-elevated dark:hover:bg-surface">
                            <Headphones className="h-4 w-4" />
                            Live Agent
                        </button>

                        <ThemeToggle />

                        {loading ? (
                            <div className="h-9 w-20 rounded-full bg-neutral-100 animate-pulse" />
                        ) : user ? (
                            <div className="hidden sm:flex items-center gap-2">
                                <Link
                                    href="/favorites"
                                    className="flex items-center justify-center h-9 w-9 rounded-full transition-colors text-text-secondary hover:bg-neutral-100 hover:text-primary-500 dark:hover:bg-surface-elevated"
                                    title="Favorites"
                                >
                                    <Heart className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors bg-neutral-100 text-text-primary hover:bg-neutral-200 dark:bg-surface-elevated dark:hover:bg-surface"
                                >
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="max-w-[100px] truncate">{displayName}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="flex items-center justify-center h-9 w-9 rounded-full transition-colors text-text-secondary hover:bg-neutral-100 hover:text-error dark:hover:bg-surface-elevated"
                                    title="Sign out"
                                >
                                    {loggingOut ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <LogOut className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="hidden sm:flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="flex items-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98] bg-primary-500 text-white hover:bg-primary-600 hover:shadow-md"
                                >
                                    Sign In
                                </Link>
                            </div>
                        )}

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-full transition-colors text-text-secondary hover:bg-neutral-100 dark:hover:bg-surface-elevated"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 top-16 z-40 bg-white dark:bg-surface overflow-y-auto lg:hidden">
                    <nav className="p-4 space-y-1" aria-label="Mobile navigation">
                        {navLinks.map(({ href, label, icon: Icon, accent }) => {
                            const isActive = pathname?.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                                        accent && !isActive
                                            ? "bg-primary-500 text-white hover:bg-primary-600"
                                            : isActive
                                                ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10"
                                                : "text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {label}
                                </Link>
                            );
                        })}

                        <div className="border-t border-neutral-200 dark:border-border-default my-3" />

                        {!loading && user ? (
                            <>
                                <Link
                                    href="/favorites"
                                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated"
                                >
                                    <Heart className="h-5 w-5" />
                                    Favorites
                                </Link>
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    {displayName}
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-error w-full text-left hover:bg-neutral-100 dark:hover:bg-surface-elevated"
                                >
                                    {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                                    Sign Out
                                </button>
                            </>
                        ) : !loading ? (
                            <Link
                                href="/login"
                                className="flex items-center justify-center rounded-xl bg-primary-500 text-white px-4 py-3 text-base font-semibold hover:bg-primary-600 transition-colors"
                            >
                                Sign In
                            </Link>
                        ) : null}
                    </nav>
                </div>
            )}
        </>
    );
}
