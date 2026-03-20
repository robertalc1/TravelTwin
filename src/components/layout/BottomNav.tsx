"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/plan", label: "Plan", icon: Sparkles, accent: true },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-surface/95 backdrop-blur-xl lg:hidden"
            aria-label="Mobile navigation"
        >
            <div className="flex h-16 items-center justify-around px-2">
                {navItems.map(({ href, label, icon: Icon, accent }) => {
                    const isActive = pathname?.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 min-w-[56px] transition-colors duration-200",
                                accent
                                    ? isActive
                                        ? "text-primary-500"
                                        : "text-primary-500"
                                    : isActive
                                        ? "text-accent-500"
                                        : "text-text-muted hover:text-text-secondary"
                            )}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {accent ? (
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-transform",
                                    isActive
                                        ? "bg-primary-600 scale-110"
                                        : "bg-primary-500 hover:scale-105"
                                )}>
                                    <Icon className="h-5 w-5 text-white stroke-[2.5]" />
                                </div>
                            ) : (
                                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                            )}
                            <span className={cn("text-[11px] font-medium leading-none", accent && "text-primary-500")}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
            {/* Safe area for devices with home indicator */}
            <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
    );
}
