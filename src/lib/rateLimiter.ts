// Tripadvisor RapidAPI rate limiter — sliding window 24h, 100 calls cap.
// Free-tier on Tripadvisor16 is ~500 req/month; 100/day leaves comfortable
// headroom and degrades gracefully (cache takes over).
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
