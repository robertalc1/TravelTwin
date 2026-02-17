import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "accent" | "success" | "warning" | "neutral" | "primary" | "info";

interface BadgeProps {
    variant?: BadgeVariant;
    children: ReactNode;
    className?: string;
    icon?: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
    accent: "bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500",
    success: "bg-green-50 text-success dark:bg-green-500/15 dark:text-success",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-warning",
    neutral: "bg-neutral-100 text-text-secondary dark:bg-neutral-800 dark:text-text-secondary",
    primary: "bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-500",
    info: "bg-blue-50 text-info dark:bg-blue-500/15 dark:text-info",
};

export function Badge({ variant = "neutral", children, className, icon }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-radius-full px-2.5 py-0.5 text-[12px] font-semibold leading-5",
                variantStyles[variant],
                className
            )}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </span>
    );
}
