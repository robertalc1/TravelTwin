import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { FooterAuthLinks } from "./FooterAuthLinks";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:bg-surface-sunken dark:border-border-default">
      <div className="mx-auto max-w-[1280px] px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-0 mb-4">
              <span className="font-display text-2xl font-extrabold tracking-tight text-primary-500">Travel</span>
              <span className="font-display text-2xl font-extrabold tracking-tight text-secondary-500">Twin</span>
            </Link>
            <p className="text-body-sm text-text-secondary max-w-[280px] mb-4">
              Travel more for less. Together with AI we help you find the best travel deals.
            </p>
            <p className="text-caption text-text-muted mb-4">Constanța, Romania</p>
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

          {/* Travel */}
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">Travel</h3>
            <ul className="space-y-2.5">
              <li><Link href="/plan" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Plan a Trip</Link></li>
              <li><Link href="/flights" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Search Flights</Link></li>
              <li><Link href="/hotels" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Search Hotels</Link></li>
              <li><Link href="/explore" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Explore Destinations</Link></li>
            </ul>
          </div>

          {/* My Account */}
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">My Account</h3>
            <ul className="space-y-2.5">
              <li><Link href="/trips" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">My Trips</Link></li>
              <li><Link href="/favorites" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Favorites</Link></li>
              <li><Link href="/profile" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Profile</Link></li>
              <li><Link href="/reviews" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Reviews</Link></li>
            </ul>
          </div>

          {/* More */}
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">More</h3>
            <ul className="space-y-2.5">
              <li><Link href="/stats" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Travel Stats</Link></li>
              <FooterAuthLinks />
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 dark:border-border-default pt-6 md:flex-row">
          <p className="text-caption text-text-muted">
            © {new Date().getFullYear()} TravelTwin. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-caption text-text-muted">
            Made with <Heart className="h-3 w-3 fill-primary-500 text-primary-500" /> for travelers everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
