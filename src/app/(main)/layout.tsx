import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main id="main-content" className="flex-1">
                {children}
            </main>
            <Footer />
            <BottomNav />
            {/* Spacer for mobile bottom nav */}
            <div className="h-16 lg:hidden" />
        </div>
    );
}
