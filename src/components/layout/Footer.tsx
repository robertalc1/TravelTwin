import Link from "next/link";
import { Compass, Github, Twitter, Instagram, Mail, Heart } from "lucide-react";

const footerLinks = {
    Product: [
        { label: "Explore", href: "/explore" },
        { label: "Flights", href: "/flights" },
        { label: "Hotels", href: "/hotels" },
        { label: "Trip Planner", href: "/trips/new" },
    ],
    Company: [
        { label: "About", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Press", href: "#" },
        { label: "Blog", href: "#" },
    ],
    Support: [
        { label: "Help Center", href: "#" },
        { label: "Contact Us", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
    ],
};

const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Mail, href: "#", label: "Email" },
];

export function Footer() {
    return (
        <footer className="border-t border-border-default bg-surface-sunken">
            <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-radius-md bg-primary-500">
                                <Compass className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-display text-lg font-extrabold tracking-tight text-text-primary">
                                Travel<span className="text-accent-500">Twin</span>
                            </span>
                        </Link>
                        <p className="text-body-sm text-text-tertiary max-w-[240px] mb-6">
                            Your trusted travel companion. Discover the world with confidence and warmth.
                        </p>
                        <div className="flex items-center gap-3">
                            {socialLinks.map(({ icon: Icon, href, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    className="flex h-9 w-9 items-center justify-center rounded-radius-full bg-surface text-text-muted transition-all duration-200 hover:text-primary-500 hover:bg-primary-50"
                                    aria-label={label}
                                >
                                    <Icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h3 className="text-overline text-text-muted mb-4">{title}</h3>
                            <ul className="space-y-2.5">
                                {links.map(({ label, href }) => (
                                    <li key={label}>
                                        <Link
                                            href={href}
                                            className="text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
                                        >
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border-default pt-8 md:flex-row">
                    <p className="text-caption text-text-muted">
                        © {new Date().getFullYear()} TravelTwin. All rights reserved.
                    </p>
                    <p className="flex items-center gap-1 text-caption text-text-muted">
                        Made with <Heart className="h-3 w-3 fill-accent-500 text-accent-500" /> for travelers everywhere
                    </p>
                </div>
            </div>
        </footer>
    );
}
