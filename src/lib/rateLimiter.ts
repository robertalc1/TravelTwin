// Tripadvisor RapidAPI rate limiter — sliding window 24h, 100 calls cap.
// Free-tier on Tripadvisor16 is ~500 req/month; 100/day leaves comfortable
// headroom and degrades gracefully (cache + AviationStack take over).
const rapidApiTimestamps: number[] = [];
const MAX_RAPIDAPI_PER_DAY = 100;

export function canMakeRapidApiCall(): boolean {
  if (!process.env.RAPIDAPI_KEY) return false;
  const now = Date.now();
  while (rapidApiTimestamps.length > 0 && rapidApiTimestamps[0] < now - 86_400_000) {
    rapidApiTimestamps.shift();
  }
  if (rapidApiTimestamps.length >= MAX_RAPIDAPI_PER_DAY) {
    console.warn('[RateLimiter] RapidAPI daily limit reached:', rapidApiTimestamps.length);
    return false;
  }
  return true;
}

export function recordRapidApiCall(): void {
  rapidApiTimestamps.push(Date.now());
}

// @deprecated — kept temporarily during Tripadvisor migration so existing
// Amadeus route imports compile. Removed after all routes migrate.
export function canMakeAmadeusCall(): boolean {
  return canMakeRapidApiCall();
}

export function recordAmadeusCall(): void {
  recordRapidApiCall();
}

// AviationStack rate limiter — 90 req/month budget (soft cap, cache is primary guard)
let aviationstackMonthlyCount = 0;
const MAX_AVIATIONSTACK_MONTHLY = 90;

export function canMakeAviationstackCall(): boolean {
  if (!process.env.AVIATIONSTACK_API_KEY) return false;
  return aviationstackMonthlyCount < MAX_AVIATIONSTACK_MONTHLY;
}

export function recordAviationstackCall(): void {
  aviationstackMonthlyCount++;
  console.log(`[RateLimiter] AviationStack calls this session: ${aviationstackMonthlyCount}`);
}
