import Link from "next/link";
import { Compass, Github, Twitter, Instagram, Mail, Heart, Star } from "lucide-react";

const footerLinks = {
    SITE: [
        { label: "About us", href: "#" },
        { label: "How it works", href: "#" },
        { label: "FAQ", href: "#" },
        { label: "Partners", href: "#" },
        { label: "Articles", href: "#" },
    ],
    DISCOVER: [
        { label: "Sustainable", href: "#" },
        { label: "Weekend", href: "#" },
        { label: "Beach", href: "#" },
        { label: "Snow", href: "#" },
        { label: "Multi City", href: "#" },
        { label: "Single City", href: "#" },
    ],
    HELP: [
        { label: "Help Centre", href: "#" },
        { label: "Privacy", href: "#" },
        { label: "Terms & Conditions", href: "#" },
        { label: "Press/Media", href: "#" },
        { label: "Cookies", href: "#" },
    ],
};

const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Mail, href: "#", label: "Email" },
];

const paymentIcons = ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay"];

export function Footer() {
    return (
        <footer className="border-t border-neutral-200 bg-white dark:bg-surface-sunken dark:border-border-default">
            <div className="mx-auto max-w-[1280px] px-4 py-12 lg:px-8 lg:py-16">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
                    {/* Brand */}
                    <div className="col-span-2">
                        <Link href="/" className="flex items-center gap-1 mb-4">
                            <span className="font-display text-2xl font-extrabold tracking-tight text-secondary-500">
                                TRYP<span className="text-primary-500">.</span>
                            </span>
                        </Link>
                        <p className="text-body-sm text-text-secondary max-w-[280px] mb-4">
                            Travel more for less. Together with AI we help millions
                            simply get the best travel deals.
                        </p>
                        <p className="text-caption text-text-muted mb-4">
                            Piata N. Filipescu nr. 2, etaj, Bl. 62, scara A,
                            etaj 4, apt.14, Bucharest, Romania
                        </p>
                        <div className="flex items-center gap-3 mb-4">
                            {socialLinks.map(({ icon: Icon, href, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-text-muted transition-all duration-200 hover:text-primary-500 hover:bg-primary-50 dark:bg-surface dark:hover:bg-primary-50/10"
                                    aria-label={label}
                                >
                                    <Icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                        {/* App store badges */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-white">
                                <span className="text-[10px] font-medium">App Store</span>
                            </div>
                            <div className="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-white">
                                <span className="text-[10px] font-medium">Google Play</span>
                            </div>
                        </div>
                        {/* Google Reviews */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text-secondary">Google Reviews</span>
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4].map((i) => (
                                    <Star key={i} className="h-3 w-3 fill-gold-500 text-gold-500" />
                                ))}
                                <Star className="h-3 w-3 fill-gold-500/50 text-gold-500" />
                            </div>
                            <span className="text-xs font-bold text-text-primary">4.6</span>
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">{title}</h3>
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

                {/* Payment icons */}
                <div className="mt-10 flex items-center justify-between border-t border-neutral-200 dark:border-border-default pt-6 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        {paymentIcons.map((icon) => (
                            <div
                                key={icon}
                                className="flex items-center justify-center rounded-md border border-neutral-200 px-3 py-1.5 text-[10px] font-medium text-text-muted"
                            >
                                {icon}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
                    <p className="text-caption text-text-muted">
                        © {new Date().getFullYear()} TRYP. All rights reserved.
                    </p>
                    <p className="flex items-center gap-1 text-caption text-text-muted">
                        Made with <Heart className="h-3 w-3 fill-primary-500 text-primary-500" /> for travelers everywhere
                    </p>
                </div>
            </div>
        </footer>
    );
}
