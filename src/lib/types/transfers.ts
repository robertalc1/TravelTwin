/* Shared TransferOffer type. The legacy /api/amadeus/transfers route was
   removed when rental cars replaced airport transfers in the trip detail,
   but the type still lives in the trip pricing store and a few legacy
   components — keep it here so deleting the route doesn't break imports. */

export interface TransferOffer {
  id: string;
  transferType: string;
  start?: { dateTime?: string; locationCode?: string };
  end?: { address?: { line?: string; cityName?: string } };
  vehicle: {
    code: string;
    description: string;
    seats: { count: number }[];
    baggages: { count: number; size: string }[];
    imageURL?: string;
  };
  serviceProvider: {
    name: string;
    logoUrl?: string;
    rating?: string;
  };
  quotation: {
    monetaryAmount: string;
    currencyCode: string;
    isEstimated?: boolean;
  };
  distance: { value: number; unit: string };
  duration: string;
  source?: 'live' | 'cached' | 'fallback';
}
