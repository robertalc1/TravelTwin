"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Plane, Hotel, MapIcon, LogOut, User, Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";

const navLinks = [
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
    const { user, loading, displayName } = useUser();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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
        <header
            className={cn(
                "sticky top-0 z-50 w-full transition-all duration-300",
                scrolled
                    ? "bg-surface/90 shadow-sm backdrop-blur-xl border-b border-border-default"
                    : "bg-transparent"
            )}
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-radius-lg bg-primary-500 transition-transform duration-200 group-hover:scale-105">
                        <Compass className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-display text-xl font-extrabold tracking-tight text-text-primary">
                        Travel<span className="text-accent-500">Twin</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname?.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center gap-2 rounded-radius-full px-4 py-2 text-body-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary-50 text-primary-600 dark:bg-primary-50 dark:text-primary-500"
                                        : "text-text-secondary hover:text-text-primary hover:bg-surface-sunken"
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
                    <ThemeToggle />

                    {loading ? (
                        <div className="h-9 w-20 rounded-radius-full bg-surface-sunken animate-pulse" />
                    ) : user ? (
                        /* Logged in state */
                        <div className="flex items-center gap-2">
                            <Link
                                href="/favorites"
                                className="hidden sm:flex items-center justify-center h-9 w-9 rounded-radius-full text-text-secondary hover:bg-surface-sunken hover:text-accent-500 transition-colors"
                                title="Favorites"
                            >
                                <Heart className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/profile"
                                className="hidden sm:flex items-center gap-2 rounded-radius-full bg-surface-sunken px-3 py-2 text-sm font-medium text-text-primary hover:bg-primary-50 hover:text-primary-600 transition-colors"
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="max-w-[100px] truncate">{displayName}</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="hidden sm:flex items-center justify-center h-9 w-9 rounded-radius-full text-text-secondary hover:bg-surface-sunken hover:text-error transition-colors"
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
                        /* Logged out state */
                        <div className="flex items-center gap-2">
                            <Link
                                href="/login"
                                className="hidden sm:flex items-center rounded-radius-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-600 hover:shadow-md active:scale-[0.98]"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="hidden md:flex items-center rounded-radius-full border border-border-default px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken transition-colors"
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
