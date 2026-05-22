"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LogOut, Heart, Loader2, Menu, Sparkles, Headphones, User,
    ChevronLeft, ChevronRight, CalendarDays, Hotel, Car, CarFront,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { CurrencySelector } from "@/components/CurrencySelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuthModalStore } from "@/stores/authModalStore";
import { useChatStore } from "@/stores/chatStore";
import { AvatarMenu } from "./AvatarMenu";
import { useLocale, useTranslations } from "next-intl";

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("nav");
    const tCommon = useTranslations("common");
    const [loggingOut, setLoggingOut] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { user, loading, displayName } = useUser();
    const openAuthModal = useAuthModalStore((s) => s.open);
    const openChat = useChatStore((s) => s.open);

    const lp = (path: string) => `/${locale}${path === "/" ? "" : path}`;
    const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await fetch("/auth/logout", { method: "POST" });
            router.push(lp("/"));
            router.refresh();
        } catch {
            setLoggingOut(false);
        }
    }

    return (
        <>
            <header
                className={cn(
                    "w-full z-50",
                    isHome
                        ? "absolute top-0 left-0 right-0 bg-transparent"
                        : "relative bg-white dark:bg-surface border-b border-neutral-200 dark:border-border-default"
                )}
            >
                <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
                    <div className="flex h-14 sm:h-16 items-center justify-between">

                        {/* Left — logo */}
                        <Link
                            href={lp("/")}
                            className="flex items-center leading-none"
                        >
                            <span className={cn(
                                "font-display text-xl sm:text-2xl font-extrabold tracking-tight",
                                isHome ? "text-white" : ""
                            )}>
                                <span className={isHome ? "text-white" : "text-primary-500"}>TRAVEL</span>
                                <span className={isHome ? "text-white/80" : "text-secondary-500"}>TWIN</span>
                            </span>
                        </Link>

                        {/* Right — Plan a Trip + Live Agent + user icon + hamburger */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Plan a Trip — desktop only */}
                            <Link
                                href={lp("/plan")}
                                className={cn(
                                    "hidden sm:flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
                                    isHome
                                        ? "bg-primary-500 text-white hover:bg-primary-600 shadow-lg"
                                        : "bg-primary-500 text-white hover:bg-primary-600"
                                )}
                            >
                                <Sparkles className="h-4 w-4" />
                                {t("planTrip")}
                            </Link>

                            {/* Live Agent — desktop only — opens AI chat widget */}
                            <button
                                type="button"
                                onClick={openChat}
                                className={cn(
                                    "hidden md:flex items-center gap-2 text-sm font-medium cursor-pointer transition-colors",
                                    isHome ? "text-white/90 hover:text-white" : "text-text-secondary hover:text-text-primary"
                                )}
                                aria-label={t("liveAgent")}
                            >
                                <Headphones className="h-4 w-4" />
                                {t("liveAgent")}
                            </button>

                            {/* Language + Currency selectors — visible on tablet+ */}
                            <div className="hidden sm:flex items-center gap-2">
                                <LanguageSelector />
                                <CurrencySelector />
                            </div>

                            {/* User icon — always visible */}
                            {loading ? (
                                <div className={cn(
                                    "h-8 w-8 sm:h-9 sm:w-9 rounded-full animate-pulse",
                                    isHome ? "bg-white/20" : "bg-neutral-100 dark:bg-surface-elevated"
                                )} />
                            ) : user ? (
                                <AvatarMenu
                                    email={user.email ?? ""}
                                    displayName={displayName}
                                    variant={isHome ? "transparent" : "solid"}
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openAuthModal("login")}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 h-8 sm:h-9 text-sm font-semibold transition-colors",
                                        isHome
                                            ? "bg-white text-secondary-500 hover:bg-white/90"
                                            : "bg-primary-500 text-white hover:bg-primary-600"
                                    )}
                                    title={t("signIn")}
                                >
                                    <User className="h-4 w-4" />
                                    <span>{t("signIn")}</span>
                                </button>
                            )}

                            {/* Hamburger */}
                            <button
                                onClick={() => setMenuOpen(true)}
                                className={cn(
                                    "flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-colors",
                                    isHome
                                        ? "text-white/80 hover:bg-white/10 hover:text-white"
                                        : "text-text-secondary hover:bg-neutral-100 dark:hover:bg-surface-elevated"
                                )}
                                aria-label={tCommon("close")}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══════ FULL-SCREEN SLIDE MENU (TRYP style) ═══════ */}
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 z-[9998] transition-opacity duration-300",
                    menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setMenuOpen(false)}
            />

            {/* Slide panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-surface z-[9999] transition-transform duration-300 ease-in-out overflow-y-auto",
                    menuOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Close / Back button */}
                <div className="flex items-center h-14 px-4">
                    <button
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors text-text-secondary"
                        aria-label={tCommon("close")}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                </div>

                {/* ── Join The Community Card ── */}
                <div className="px-5 pb-6">
                    <div className="rounded-2xl bg-neutral-50 dark:bg-surface-elevated p-5 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-text-primary mb-1">
                                {locale === "ro" ? "Alătură-te comunității!" : "Join The Community!"}
                            </h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                {locale === "ro"
                                    ? "Reduceri exclusive, gestionează rezervări și multe altele."
                                    : "Exclusive discounts, manage bookings and much more."}
                            </p>
                            {user ? (
                                <Link
                                    href={lp("/profile")}
                                    onClick={() => setMenuOpen(false)}
                                    className="text-sm font-semibold text-primary-500 hover:text-primary-600 mt-1 inline-block"
                                >
                                    {locale === "ro" ? "Vezi profilul" : "View profile"}
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        openAuthModal("login");
                                    }}
                                    className="text-sm font-semibold text-primary-500 hover:text-primary-600 mt-1 inline-block"
                                >
                                    {locale === "ro" ? "Conectează-te aici" : "Log in here"}
                                </button>
                            )}
                        </div>
                        <div className="text-4xl shrink-0">🏝️</div>
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-neutral-200 dark:bg-border-default mx-5" />

                {/* ── Main Navigation ── */}
                <nav className="py-2 px-5">
                    <MenuLink
                        href={lp("/plan")}
                        icon={<Sparkles className="h-5 w-5" />}
                        label={t("planTrip")}
                        onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                        href={lp("/road-trip")}
                        icon={<Car className="h-5 w-5" />}
                        label={locale === "ro" ? "Road trip" : "Road trip"}
                        onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                        href={lp("/hotels")}
                        icon={<Hotel className="h-5 w-5" />}
                        label={locale === "ro" ? "Caută hoteluri" : "Search Hotels"}
                        onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                        href={lp("/transfers")}
                        icon={<CarFront className="h-5 w-5" />}
                        label={t("carRentals")}
                        onClick={() => setMenuOpen(false)}
                    />
                </nav>

                {/* ── Divider ── */}
                <div className="h-px bg-neutral-200 dark:bg-border-default mx-5" />

                {/* ── My Account ── */}
                <div className="px-5 pt-6 pb-2">
                    <h4 className="text-lg font-bold text-text-primary mb-1">{t("myAccount")}</h4>
                </div>
                <nav className="px-5 pb-2">
                    <MenuLink
                        href={lp("/trips")}
                        icon={<CalendarDays className="h-5 w-5" />}
                        label={t("myTrips")}
                        onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                        href={lp("/favorites")}
                        icon={<Heart className="h-5 w-5" />}
                        label={t("favorites")}
                        onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                        href={lp("/profile")}
                        icon={<User className="h-5 w-5" />}
                        label={t("profile")}
                        onClick={() => setMenuOpen(false)}
                    />
                </nav>

                {/* ── Mobile language + currency selectors ── */}
                <div className="h-px bg-neutral-200 dark:bg-border-default mx-5" />
                <div className="px-5 py-4 sm:hidden flex items-center gap-2">
                    <LanguageSelector />
                    <CurrencySelector />
                </div>

                {/* ── Sign out (only if logged in) ── */}
                {!loading && user && (
                    <>
                        <div className="h-px bg-neutral-200 dark:bg-border-default mx-5" />
                        <div className="px-5 py-4">
                            <button
                                onClick={() => { handleLogout(); setMenuOpen(false); }}
                                disabled={loggingOut}
                                className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                                {t("signOut")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

/* ── Reusable menu link row ── */
function MenuLink({
    href,
    icon,
    label,
    value,
    onClick,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    value?: string;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-4 py-3.5 text-text-primary hover:text-primary-500 transition-colors group"
        >
            <span className="text-text-secondary group-hover:text-primary-500 transition-colors shrink-0">
                {icon}
            </span>
            <span className="flex-1 text-base font-medium">{label}</span>
            {value && (
                <span className="text-sm text-text-secondary mr-1">{value}</span>
            )}
            <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
        </Link>
    );
}
