"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Plane, Hotel, MapIcon, LogOut, User, Heart, Loader2, Headphones } from "lucide-react";
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
                    ? "bg-white/95 shadow-sm backdrop-blur-xl border-b border-neutral-200 dark:bg-surface/95 dark:border-border-default"
                    : "bg-transparent"
            )}
        >
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 lg:px-8">
                {/* Logo — TRYP */}
                <Link href="/" className="flex items-center gap-1 group">
                    <span className={cn(
                        "font-display text-2xl font-extrabold tracking-tight transition-colors",
                        scrolled ? "text-secondary-500" : "text-white"
                    )}>
                        TRYP
                    </span>
                    <span className={cn(
                        "text-2xl font-extrabold tracking-tight",
                        scrolled ? "text-primary-500" : "text-primary-300"
                    )}>.</span>
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
                                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                                    scrolled
                                        ? isActive
                                            ? "bg-primary-50 text-primary-600"
                                            : "text-text-secondary hover:text-text-primary hover:bg-neutral-100"
                                        : isActive
                                            ? "bg-white/20 text-white"
                                            : "text-white/80 hover:text-white hover:bg-white/10"
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
                    <button className={cn(
                        "hidden md:flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                        scrolled
                            ? "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
                            : "bg-white/15 text-white/90 hover:bg-white/25"
                    )}>
                        <Headphones className="h-4 w-4" />
                        Live Agent
                    </button>

                    <ThemeToggle />

                    {loading ? (
                        <div className="h-9 w-20 rounded-full bg-neutral-100 animate-pulse" />
                    ) : user ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/favorites"
                                className={cn(
                                    "hidden sm:flex items-center justify-center h-9 w-9 rounded-full transition-colors",
                                    scrolled
                                        ? "text-text-secondary hover:bg-neutral-100 hover:text-primary-500"
                                        : "text-white/80 hover:bg-white/10 hover:text-white"
                                )}
                                title="Favorites"
                            >
                                <Heart className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/profile"
                                className={cn(
                                    "hidden sm:flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                                    scrolled
                                        ? "bg-neutral-100 text-text-primary hover:bg-neutral-200"
                                        : "bg-white/15 text-white hover:bg-white/25"
                                )}
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="max-w-[100px] truncate">{displayName}</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className={cn(
                                    "hidden sm:flex items-center justify-center h-9 w-9 rounded-full transition-colors",
                                    scrolled
                                        ? "text-text-secondary hover:bg-neutral-100 hover:text-error"
                                        : "text-white/80 hover:bg-white/10 hover:text-red-300"
                                )}
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
                        <div className="flex items-center gap-2">
                            <Link
                                href="/login"
                                className={cn(
                                    "hidden sm:flex items-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                                    scrolled
                                        ? "bg-primary-500 text-white hover:bg-primary-600 hover:shadow-md"
                                        : "bg-white text-secondary-500 hover:bg-white/90"
                                )}
                            >
                                Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
