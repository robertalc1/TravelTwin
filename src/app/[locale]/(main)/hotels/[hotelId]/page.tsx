"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, MapPin, ChevronLeft, ChevronRight,
  Navigation,
} from "lucide-react";
import { useCurrencyStore } from "@/stores/currencyStore";
import { getHotelImage } from "@/lib/hotelImages";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";

interface TAHotelDetail {
  id: string;
  name: string;
  about?: string;
  photos: string[];
  amenities: string[];
  rating?: number;
  numReviews?: number;
  stars?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  priceRange?: string;
  rankingString?: string;
}

const SECTIONS = [
  { id: "images", label_en: "Images", label_ro: "Imagini" },
  { id: "details", label_en: "Details", label_ro: "Detalii" },
  { id: "location", label_en: "Location", label_ro: "Locație" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function StandaloneHotelDetailPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isRo = locale === "ro";
  const id = (params?.hotelId as string) || "";
  const checkIn = search.get("checkIn") || "";
  const checkOut = search.get("checkOut") || "";
  const cityCode = (search.get("cityCode") || "").toUpperCase();
  const totalQs = search.get("total") || "";
  const nameQs = search.get("name") || "";

  const [hotel, setHotel] = useState<TAHotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionId>("images");

  const formatCurrency = useCurrencyStore((s) => s.format);
  const { user } = useUser();
  const openAuthModal = useAuthModalStore((s) => s.open);

  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    images: null,
    details: null,
    location: null,
  });

  const setSectionRef = useCallback(
    (key: SectionId) => (el: HTMLElement | null) => {
      sectionRefs.current[key] = el;
    },
    [],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const qs = new URLSearchParams();
    if (checkIn) qs.set("checkIn", checkIn);
    if (checkOut) qs.set("checkOut", checkOut);

    fetch(`/api/hotels/${encodeURIComponent(id)}?${qs.toString()}`)
      .then((r) => r.json())
      .then((data: { hotel: TAHotelDetail | null; warning?: string }) => {
        if (cancelled) return;
        setHotel(data.hotel);
        setWarning(data.warning || null);
      })
      .catch(() => {
        if (!cancelled) {
          setWarning(isRo ? "Nu am putut încărca detaliile hotelului." : "Could not load hotel details.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, checkIn, checkOut, isRo]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const s of SECTIONS) {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [loading]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    return Math.max(
      1,
      Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }, [checkIn, checkOut]);

  const total = Number(totalQs) > 0 ? Number(totalQs) : 0;
  const perNight = total > 0 ? total / nights : 0;
  const displayName = hotel?.name || nameQs || "Hotel";
  const stars = Math.max(
    1,
    Math.min(5, hotel?.stars || Math.round(hotel?.rating || 3) || 3),
  );
  const fallbackImg = getHotelImage(displayName, cityCode, stars);
  const photos = hotel?.photos?.length ? hotel.photos : [fallbackImg];
  const heroPhoto = photos[photoIndex] || photos[0];

  function scrollToSection(sec: SectionId) {
    const el = sectionRefs.current[sec];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleBookHotel() {
    const target = `/${locale}/booking/simulate?type=hotel&hotelId=${encodeURIComponent(id)}&name=${encodeURIComponent(displayName)}&total=${total}&checkIn=${checkIn}&checkOut=${checkOut}`;
    if (!user) {
      openAuthModal("login", target);
      return;
    }
    router.push(target);
  }

  const directionsUrl =
    hotel?.latitude && hotel?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}`
      : hotel?.address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${displayName}, ${hotel.address}`)}`
        : null;

  // Embedded map shows the property pin + surrounding area so the user can see
  // restaurants, transit, landmarks "around" the hotel without leaving the page.
  const mapEmbedUrl =
    hotel?.latitude && hotel?.longitude
      ? `https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}&z=15&output=embed`
      : hotel?.address
        ? `https://www.google.com/maps?q=${encodeURIComponent(`${displayName}, ${hotel.address}`)}&z=15&output=embed`
        : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-float">🏨</div>
          <p className="text-text-secondary">{isRo ? "Se încarcă hotelul..." : "Loading hotel..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-200 dark:border-border-default">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={isRo ? "Înapoi" : "Back"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="flex-1 text-base sm:text-lg font-bold text-text-primary truncate">
            {displayName}
          </h1>
        </div>
      </div>

      {/* Anchor menu */}
      <nav className="sticky top-[57px] z-30 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-neutral-100 dark:border-border-default">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <ul className="flex gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className={`whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeSection === s.id
                      ? "text-primary-500 border-primary-500"
                      : "text-text-secondary border-transparent hover:text-text-primary"
                  }`}
                >
                  {isRo ? s.label_ro : s.label_en}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6 lg:py-10">
        {warning && (
          <div className="mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </div>
        )}

        {/* Images gallery */}
        <motion.section
          id="images"
          ref={setSectionRef("images")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mb-8 scroll-mt-[120px]"
        >
          <div className="relative aspect-[16/10] lg:aspect-auto lg:h-[480px] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-surface-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label={isRo ? "Poza anterioară" : "Previous photo"}
                  onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-surface/90 backdrop-blur-md shadow-md text-text-primary hover:scale-105 transition-transform"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label={isRo ? "Poza următoare" : "Next photo"}
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-surface/90 backdrop-blur-md shadow-md text-text-primary hover:scale-105 transition-transform"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-semibold rounded-full px-3 py-1">
                  {photoIndex + 1} / {photos.length}
                </span>
              </>
            )}
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-3 h-[480px] auto-rows-fr">
            {photos.slice(0, 4).map((p, i) => (
              <button
                key={p + i}
                type="button"
                onClick={() => setPhotoIndex(i)}
                className={`relative rounded-2xl overflow-hidden transition-all ${
                  photoIndex === i
                    ? "ring-2 ring-primary-500"
                    : "ring-1 ring-neutral-200 dark:ring-border-default opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p}
                  alt={`${displayName} ${i + 2}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                />
              </button>
            ))}
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Main column */}
          <div className="space-y-8">
            <section id="details" ref={setSectionRef("details")} className="scroll-mt-[120px]">
              <div className="flex items-center gap-2 mb-2">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
                {hotel?.rankingString && (
                  <span className="text-xs text-text-muted ml-2 truncate">{hotel.rankingString}</span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-2">{displayName}</h2>
              {(hotel?.address || cityCode) && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{hotel?.address || cityCode}</span>
                </div>
              )}
              {hotel?.rating != null && hotel.rating > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-500/10 px-3 py-1.5">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    {hotel.rating.toFixed(1)}
                  </span>
                  {hotel.numReviews ? (
                    <span className="text-xs text-text-secondary">
                      · {hotel.numReviews} {isRo ? "recenzii" : "reviews"}
                    </span>
                  ) : null}
                </div>
              )}

              {hotel?.about && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-text-primary mb-3">
                    {isRo ? "Descriere proprietate" : "Property description"}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {hotel.about}
                  </p>
                </div>
              )}

              {hotel?.amenities && hotel.amenities.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-text-primary mb-3">
                    {isRo ? "Facilități" : "Amenities"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {hotel.amenities.slice(0, 12).map((a) => (
                      <div
                        key={a}
                        className="flex items-center gap-2 text-sm text-text-secondary rounded-xl bg-neutral-50 dark:bg-surface-elevated px-3 py-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                        <span className="truncate">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section id="location" ref={setSectionRef("location")} className="scroll-mt-[120px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-text-primary">
                  {isRo ? "Locația proprietății" : "Property location"}
                </h3>
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    {isRo ? "Deschide în Google Maps" : "Open in Google Maps"}
                  </a>
                )}
              </div>
              {hotel?.address && (
                <p className="text-sm text-text-secondary mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
                  {hotel.address}
                </p>
              )}
              {mapEmbedUrl ? (
                <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default">
                  <iframe
                    src={mapEmbedUrl}
                    title={`${displayName} map`}
                    className="w-full h-[360px] border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-neutral-50 dark:bg-surface-elevated p-6 text-sm text-text-muted text-center">
                  {isRo ? "Localizare exactă indisponibilă pentru acest hotel." : "Exact location unavailable for this hotel."}
                </div>
              )}
            </section>
          </div>

          {/* Sticky sidebar — Your stay */}
          <aside className="lg:sticky lg:top-[110px] lg:self-start">
            <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-5 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                {isRo ? "Sejurul tău" : "Your stay"}
              </p>
              <div className="mt-3 mb-4 space-y-1">
                {checkIn && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{isRo ? "Check-in" : "Check-in"}</span>
                    <span className="font-semibold text-text-primary">{checkIn}</span>
                  </div>
                )}
                {checkOut && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{isRo ? "Check-out" : "Check-out"}</span>
                    <span className="font-semibold text-text-primary">{checkOut}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{isRo ? "Nopți" : "Nights"}</span>
                  <span className="font-semibold text-text-primary">{nights}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-border-default">
                {perNight > 0 ? (
                  <>
                    <p className="text-xs text-text-muted">{isRo ? "pe noapte de la" : "per night from"}</p>
                    <p className="text-3xl font-extrabold text-primary-500">
                      {formatCurrency(perNight, "EUR")}
                    </p>
                    <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-neutral-100 dark:border-border-default">
                      <span className="text-text-secondary">
                        {isRo
                          ? `Total pentru ${nights} ${nights === 1 ? "noapte" : "nopți"}`
                          : `Total for ${nights} ${nights === 1 ? "night" : "nights"}`}
                      </span>
                      <span className="font-bold text-text-primary">{formatCurrency(total, "EUR")}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">
                    {isRo
                      ? "Prețul se preia separat — întoarce-te la lista de hoteluri pentru oferte live."
                      : "Pricing fetched separately — go back to the hotel list for live offers."}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleBookHotel}
                className="mt-5 w-full rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-all shadow hover:shadow-md"
              >
                {isRo ? "Rezervă hotel" : "Book Hotel"}
              </button>
              <p className="mt-2 text-[11px] text-text-muted text-center">
                {isRo ? "Nu vei fi taxat încă" : "You won't be charged yet"}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
