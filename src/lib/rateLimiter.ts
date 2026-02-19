// Simple in-memory rate limiter for Amadeus API calls
const callTimestamps: number[] = [];

const MAX_PER_SECOND = 10;
const MAX_PER_MINUTE = 100;

export function canMakeAmadeusCall(): boolean {
  const now = Date.now();

  // Clean old entries
  while (callTimestamps.length > 0 && callTimestamps[0] < now - 60000) {
    callTimestamps.shift();
  }

  // Check per-minute limit
  if (callTimestamps.length >= MAX_PER_MINUTE) {
    console.warn('[RateLimiter] Minute limit reached:', callTimestamps.length);
    return false;
  }

  // Check per-second limit
  const lastSecond = callTimestamps.filter((t) => t > now - 1000);
  if (lastSecond.length >= MAX_PER_SECOND) {
    console.warn('[RateLimiter] Second limit reached:', lastSecond.length);
    return false;
  }

  return true;
}

export function recordAmadeusCall(): void {
  callTimestamps.push(Date.now());
}
