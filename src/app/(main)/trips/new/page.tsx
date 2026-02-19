"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NewTripPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to homepage where the main search/recommendation engine lives
        router.replace("/#search");
    }, [router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-4" />
                <p className="text-text-muted">Redirecting to trip planner...</p>
            </div>
        </div>
    );
}
