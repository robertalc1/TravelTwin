/**
 * Hotel image utility — provides real/relevant photos for hotels.
 * Uses curated Unsplash photos by star rating as a reliable fallback.
 */

const HOTEL_IMAGES: Record<number, string[]> = {
  5: [
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
  ],
  4: [
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
    'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
  ],
  3: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  ],
  2: [
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    'https://images.unsplash.com/photo-1630660664869-c9d3cc676880?w=800&q=80',
  ],
  1: [
    'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80',
    'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800&q=80',
  ],
};

/**
 * Returns a curated hotel photo URL based on star rating.
 * Uses hotel name + city as a seed so the same hotel always gets the same image.
 */
export function getHotelImage(
  hotelName: string,
  city: string,
  starRating: number = 3
): string {
  const rating = Math.max(1, Math.min(5, Math.round(starRating || 3)));
  const images = HOTEL_IMAGES[rating] ?? HOTEL_IMAGES[3];
  // Deterministic seed so the same hotel always gets the same photo
  const seed =
    ((hotelName.charCodeAt(0) || 72) + (city.charCodeAt(0) || 72)) %
    images.length;
  return images[seed];
}

/** Format a price number nicely: $225.53 or $1,200 */
export function formatPrice(amount: number, currency: string): string {
  const symbol =
    currency === 'EUR' ? '€' : currency === 'BRL' ? 'R$' : '$';
  if (amount === 0) return `${symbol}0`;
  const isWhole = amount % 1 === 0;
  const formatted = isWhole
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${symbol}${formatted}`;
}

/** Format ISO duration "PT2H30M" → "2h 30m" */
export function formatDuration(duration: string): string {
  if (!duration) return '';
  if (duration.startsWith('PT')) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const h = parseInt(match[1] || '0');
      const m = parseInt(match[2] || '0');
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }
  }
  return duration;
}
