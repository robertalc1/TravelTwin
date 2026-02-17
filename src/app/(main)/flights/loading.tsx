import { FlightCardSkeleton } from "@/components/ui/Skeleton";

export default function FlightsLoading() {
    return (
        <div className="min-h-screen bg-background">
            <div className="bg-primary-700 pb-6 pt-6">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="h-14 rounded-radius-md bg-white/5 animate-pulse" />
                </div>
            </div>
            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
                <div className="flex gap-6">
                    <aside className="hidden md:block w-64 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-radius-md bg-surface-sunken animate-pulse" />
                        ))}
                    </aside>
                    <div className="flex-1 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <FlightCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
