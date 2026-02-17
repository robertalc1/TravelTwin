import { Compass } from "lucide-react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            {/* Left — Decorative Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-500 to-primary-800 items-center justify-center">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-accent-500 blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-300 blur-3xl" />
                </div>
                <div className="relative z-10 text-center px-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-6">
                        <Compass className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="font-display text-4xl font-extrabold text-white mb-4">
                        Travel<span className="text-accent-400">Twin</span>
                    </h1>
                    <p className="text-lg text-primary-100 max-w-md">
                        Your journey begins here. Discover destinations, plan trips, and create unforgettable memories.
                    </p>
                </div>
            </div>

            {/* Right — Form Area */}
            <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
