import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse-soft rounded-radius-md bg-neutral-200 dark:bg-neutral-800",
                className
            )}
        />
    );
}

export function FlightCardSkeleton() {
    return (
        <div className="rounded-radius-lg border border-border-default bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-radius-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex items-center gap-4 mb-3">
                <Skeleton className="h-8 w-16" />
                <div className="flex-1 flex items-center gap-2">
                    <Skeleton className="h-0.5 flex-1" />
                    <Skeleton className="h-5 w-5 rounded-radius-full" />
                    <Skeleton className="h-0.5 flex-1" />
                </div>
                <Skeleton className="h-8 w-16" />
            </div>
            <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
            </div>
        </div>
    );
}

export function HotelCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-radius-lg border border-border-default bg-surface">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-6 rounded-radius-full" />
                    <Skeleton className="h-6 w-6 rounded-radius-full" />
                    <Skeleton className="h-6 w-6 rounded-radius-full" />
                </div>
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-9 w-20 rounded-radius-sm" />
                </div>
            </div>
        </div>
    );
}
