"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Plane, Hotel, MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/flights", label: "Flights", icon: Plane },
    { href: "/hotels", label: "Hotels", icon: Hotel },
    { href: "/trips", label: "Trips", icon: MapIcon },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-surface/95 backdrop-blur-xl lg:hidden"
            aria-label="Mobile navigation"
        >
            <div className="flex h-16 items-center justify-around px-2">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname?.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-radius-lg px-3 py-1.5 min-w-[64px] transition-colors duration-200",
                                isActive
                                    ? "text-accent-500"
                                    : "text-text-muted hover:text-text-secondary"
                            )}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                            <span className="text-[11px] font-medium leading-none">{label}</span>
                        </Link>
                    );
                })}
            </div>
            {/* Safe area for devices with home indicator */}
            <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
    );
}
