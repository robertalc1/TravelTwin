"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Plane } from "lucide-react";
import { getCityImageByIata } from "@/lib/cityImages";
import type { ChatDeal } from "@/app/api/chat/route";

type ChatDealCardProps = {
  deal: ChatDeal;
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `€${Math.round(amount)}`;
  }
}

export function ChatDealCard({ deal }: ChatDealCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = getCityImageByIata(deal.destination, deal.id);
  const fallback =
    "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=300&fit=crop&q=80";

  function handleViewDeal() {
    sessionStorage.setItem(
      `trip_${deal.id}`,
      JSON.stringify({
        destinationCode: deal.destination,
        destinationCity: deal.city,
        destinationCountry: deal.country,
        nights: deal.days,
        departureDate: deal.departureDate,
        returnDate: deal.returnDate,
        currency: deal.currency,
        totalPrice: deal.price,
        stops: 1,
      })
    );
    router.push(`/trips/${deal.id}`);
  }

  return (
    <div
      onClick={handleViewDeal}
      className="group w-full max-w-[320px] cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-border-default dark:bg-surface"
    >
      {/* Image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={imgError ? fallback : imageUrl}
          alt={deal.city}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Badge */}
        {deal.badge && (
          <span className="absolute left-2 top-2 rounded-full bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white">
            {deal.badge}
          </span>
        )}
        {!deal.badge && deal.isDirect && (
          <span className="absolute left-2 top-2 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-white">
            Direct
          </span>
        )}

        {/* Favorite */}
        <button
          onClick={e => {
            e.stopPropagation();
            setIsFavorite(f => !f);
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all hover:scale-110"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-neutral-600"
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-base font-bold text-secondary-500 dark:text-white">
          {deal.days} days - {deal.city}
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary">
          {formatDate(deal.departureDate)} - {formatDate(deal.returnDate)}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
          <span>{deal.originCity}</span>
          <Plane className="h-3 w-3 rotate-90 text-text-muted" />
          <span>{deal.city}</span>
          <Plane className="h-3 w-3 -rotate-90 text-text-muted" />
          <span>{deal.originCity}</span>
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div>
            {deal.originalPrice > deal.price && (
              <span className="mr-1 text-xs text-text-muted line-through">
                {formatPrice(deal.originalPrice, deal.currency)}
              </span>
            )}
            <span className="text-lg font-bold text-secondary-500 dark:text-white">
              {formatPrice(deal.price, deal.currency)}
            </span>
            <p className="mt-0.5 text-[10px] text-text-muted">Transportation for 1 person</p>
          </div>

          <button
            onClick={e => {
              e.stopPropagation();
              handleViewDeal();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
          >
            View deal
          </button>
        </div>
      </div>
    </div>
  );
}
