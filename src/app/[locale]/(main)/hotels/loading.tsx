import { HotelCardSkeleton } from "@/components/ui/Skeleton";

export default function HotelsLoading() {
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
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <HotelCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
