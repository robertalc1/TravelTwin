import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, leadingIcon, trailingIcon, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s/g, "-");

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="mb-1.5 block text-body-sm font-medium text-text-secondary"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leadingIcon && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                            {leadingIcon}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            "w-full rounded-radius-sm border border-border-default bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-muted transition-all duration-200",
                            "focus:border-border-focus focus:ring-2 focus:ring-border-focus/20 focus:outline-none",
                            "hover:border-border-emphasis",
                            leadingIcon && "pl-10",
                            trailingIcon && "pr-10",
                            error && "border-error focus:border-error focus:ring-error/20",
                            className
                        )}
                        {...props}
                    />
                    {trailingIcon && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                            {trailingIcon}
                        </span>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-body-sm text-error" role="alert">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
