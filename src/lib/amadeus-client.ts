// Dual-mode Amadeus client: tries SDK first, falls back to REST
import Amadeus from 'amadeus';

// Hostname switch: 'test' (sandbox) or 'production' (live data).
// Defaults to 'test' for safety. Flip via AMADEUS_HOSTNAME=production once
// production credentials are issued by Amadeus.
const AMADEUS_HOSTNAME = (process.env.AMADEUS_HOSTNAME === 'production') ? 'production' : 'test';
const AMADEUS_BASE_URL = AMADEUS_HOSTNAME === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

// SDK client
let sdkClient: InstanceType<typeof Amadeus> | null = null;
try {
  sdkClient = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID!,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
    hostname: AMADEUS_HOSTNAME,
  });
} catch (e) {
  console.warn('[Amadeus] SDK init failed:', e);
}

// REST fallback with token caching
let tokenCache: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires) return tokenCache.token;

  const res = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 120) * 1000 };
  return tokenCache.token;
}

export async function amadeusRest(path: string, params: Record<string, string | number>): Promise<any> {
  const token = await getToken();
  const url = new URL(`${AMADEUS_BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);
  return res.json();
}

// Unified search functions that try SDK → REST
export async function searchFlights(params: Record<string, string>): Promise<any[]> {
  if (sdkClient) {
    try {
      const res = await (sdkClient.shopping as any).flightOffersSearch.get(params);
      return res.data || [];
    } catch (e) { console.warn('[Amadeus] SDK flights failed:', e); }
  }
  const data = await amadeusRest('/v2/shopping/flight-offers', params);
  return data.data || [];
}

export async function searchHotelsByCity(cityCode: string): Promise<any[]> {
  if (sdkClient) {
    try {
      const res = await (sdkClient.referenceData as any).locations.hotels.byCity.get({ cityCode, radius: 30, radiusUnit: 'KM' });
      return res.data || [];
    } catch (e) { console.warn('[Amadeus] SDK hotel list failed:', e); }
  }
  const data = await amadeusRest('/v1/reference-data/locations/hotels/by-city', { cityCode, radius: 30, radiusUnit: 'KM' });
  return data.data || [];
}

export async function searchHotelOffers(hotelIds: string[], checkIn: string, checkOut: string, adults: string = '1'): Promise<any[]> {
  if (sdkClient) {
    try {
      const res = await (sdkClient.shopping as any).hotelOffersSearch.get({
        hotelIds: hotelIds.join(','), checkInDate: checkIn, checkOutDate: checkOut, adults, roomQuantity: '1', currency: 'EUR',
      });
      return res.data || [];
    } catch (e) { console.warn('[Amadeus] SDK hotel offers failed:', e); }
  }
  const data = await amadeusRest('/v3/shopping/hotel-offers', {
    hotelIds: hotelIds.join(','), checkInDate: checkIn, checkOutDate: checkOut, adults, roomQuantity: 1, currency: 'EUR',
  });
  return data.data || [];
}

export async function searchLocations(keyword: string): Promise<any[]> {
  if (sdkClient) {
    try {
      const res = await (sdkClient.referenceData as any).locations.get({ keyword, subType: 'CITY,AIRPORT', 'page[limit]': '10' });
      return res.data || [];
    } catch (e) { console.warn('[Amadeus] SDK locations failed:', e); }
  }
  const data = await amadeusRest('/v1/reference-data/locations', { keyword, subType: 'CITY,AIRPORT', 'page[limit]': 10 });
  return data.data || [];
}

export async function searchFlightInspirations(origin: string): Promise<any[]> {
  if (sdkClient) {
    try {
      const res = await (sdkClient.shopping as any).flightDestinations.get({ origin, maxPrice: '500' });
      return res.data || [];
    } catch (e) { console.warn('[Amadeus] SDK inspiration failed:', e); }
  }
  const data = await amadeusRest('/v1/shopping/flight-destinations', { origin, maxPrice: 500 });
  return data.data || [];
}

export { sdkClient as amadeus };
