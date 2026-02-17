"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <div className="h-9 w-9 rounded-radius-md bg-surface-sunken" />;
    }

    const options = [
        { value: "light", icon: Sun, label: "Light mode" },
        { value: "dark", icon: Moon, label: "Dark mode" },
        { value: "system", icon: Monitor, label: "System theme" },
    ] as const;

    return (
        <div className="flex items-center gap-0.5 rounded-radius-full bg-surface-sunken p-1">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-radius-full transition-all duration-200",
                        theme === value
                            ? "bg-surface text-text-primary shadow-xs"
                            : "text-text-muted hover:text-text-secondary"
                    )}
                    aria-label={label}
                    title={label}
                >
                    <Icon className="h-3.5 w-3.5" />
                </button>
            ))}
        </div>
    );
}
