import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: ReactNode;
    children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
    primary:
        "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm hover:shadow-md",
    secondary:
        "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm hover:shadow-md",
    ghost:
        "bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text-primary",
    outline:
        "border border-border-emphasis bg-transparent text-text-primary hover:bg-surface-sunken",
    danger:
        "bg-error text-white hover:opacity-90",
};

const sizeStyles: Record<Size, string> = {
    sm: "h-9 px-4 text-sm gap-1.5",
    md: "h-11 px-6 text-sm gap-2",
    lg: "h-13 px-8 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", loading, disabled, icon, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(
                    "inline-flex items-center justify-center font-semibold rounded-radius-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                {...props}
            >
                {loading ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                ) : icon ? (
                    <span className="shrink-0">{icon}</span>
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
