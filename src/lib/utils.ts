import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: Date | string, style: "short" | "long" = "short"): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (style === "long") {
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
}

export function formatFlightTime(time: string): string {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
}
