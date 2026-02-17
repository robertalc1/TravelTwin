import { cn } from "@/lib/utils";

interface JourneyTimelineProps {
    stages: {
        label: string;
        completed: boolean;
        icon?: string;
    }[];
    className?: string;
}

export function JourneyTimeline({ stages, className }: JourneyTimelineProps) {
    return (
        <div className={cn("flex items-center gap-0", className)}>
            {stages.map((stage, i) => (
                <div key={stage.label} className="flex items-center">
                    {/* Stamp */}
                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className={cn(
                                "relative flex h-10 w-10 items-center justify-center rounded-radius-full border-2 transition-all duration-300",
                                stage.completed
                                    ? "border-accent-500 bg-accent-500 text-white shadow-md"
                                    : "border-border-emphasis bg-surface text-text-muted"
                            )}
                        >
                            {stage.completed ? (
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <span className="text-sm font-bold">{stage.icon || i + 1}</span>
                            )}
                            {/* Stamp texture overlay */}
                            {stage.completed && (
                                <div className="absolute inset-0 rounded-radius-full ring-4 ring-accent-500/20" />
                            )}
                        </div>
                        <span
                            className={cn(
                                "text-[10px] font-semibold whitespace-nowrap",
                                stage.completed ? "text-accent-600 dark:text-accent-500" : "text-text-muted"
                            )}
                        >
                            {stage.label}
                        </span>
                    </div>

                    {/* Connector */}
                    {i < stages.length - 1 && (
                        <div
                            className={cn(
                                "h-0.5 w-8 md:w-12 mx-1 rounded-radius-full transition-colors duration-300 -mt-5",
                                stage.completed ? "bg-accent-500" : "bg-border-default"
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
