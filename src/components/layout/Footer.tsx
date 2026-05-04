import Link from "next/link";
import { Heart, Plane, Hotel, CalendarDays, Heart as FavIcon, User, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:bg-surface-sunken dark:border-border-default">
      <div className="mx-auto max-w-[1280px] px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 lg:gap-16">

          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-0 mb-4">
              <span className="font-display text-2xl font-extrabold tracking-tight text-primary-500">Travel</span>
              <span className="font-display text-2xl font-extrabold tracking-tight text-secondary-500">Twin</span>
            </Link>
            <p className="text-body-sm text-text-secondary max-w-[280px] mb-5 leading-relaxed">
              Travel more for less. Together with AI we help you find the best travel deals around the world.
            </p>
            <p className="flex items-center gap-1.5 text-caption text-text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Constanța, Romania
            </p>
          </div>

          {/* Travel */}
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-5">Travel</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/plan" className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-primary-500 transition-colors group">
                  <Plane className="h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors shrink-0" />
                  Plan a Trip
                </Link>
              </li>
              <li>
                <Link href="/flights" className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-primary-500 transition-colors group">
                  <Plane className="h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors shrink-0" />
                  Search Flights
                </Link>
              </li>
              <li>
                <Link href="/hotels" className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-primary-500 transition-colors group">
                  <Hotel className="h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors shrink-0" />
                  Search Hotels
                </Link>
              </li>
            </ul>
          </div>

          {/* My Account */}
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-5">My Account</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/trips" className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-primary-500 transition-colors group">
                  <CalendarDays className="h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors shrink-0" />
                  My Trips
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-primary-500 transition-colors group">
                  <Heart className="h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors shrink-0" />
                  Favorites
                </Link>
              </li>
              <li>
                <Link href="/profile" className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-primary-500 transition-colors group">
                  <User className="h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors shrink-0" />
                  Profile
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-neutral-200 dark:border-border-default pt-6 sm:flex-row">
          <p className="text-caption text-text-muted">
            © {new Date().getFullYear()} TravelTwin. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-caption text-text-muted">
            Made with <Heart className="h-3 w-3 fill-primary-500 text-primary-500" /> by{" "}
            <a
              href="https://alcaziurobert.ro/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              Alcaziu Robert
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
