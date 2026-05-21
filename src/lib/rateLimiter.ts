// Tripadvisor RapidAPI runaway protection — sliding window 24h, 500 calls cap.
// The project is on Tripadvisor16 PAID PRO tier ($7.99/mo, ~10k req/mo) so the
// cap below is NOT a quota fence — it's a safety net to keep a bug loop from
// burning the monthly allowance in a single bad afternoon. 500/day still leaves
// ~10x headroom against the monthly budget.
const rapidApiTimestamps: number[] = [];
const MAX_RAPIDAPI_PER_DAY = 500;

export function canMakeRapidApiCall(): boolean {
  if (!process.env.RAPIDAPI_KEY) return false;
  const now = Date.now();
  while (rapidApiTimestamps.length > 0 && rapidApiTimestamps[0] < now - 86_400_000) {
    rapidApiTimestamps.shift();
  }
  if (rapidApiTimestamps.length >= MAX_RAPIDAPI_PER_DAY) {
    console.warn('[RateLimiter] RapidAPI daily safety cap reached:', rapidApiTimestamps.length);
    return false;
  }
  return true;
}

export function recordRapidApiCall(): void {
  rapidApiTimestamps.push(Date.now());
}
