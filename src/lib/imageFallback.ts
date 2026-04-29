/**
 * Centralized image fallback handlers used across the app.
 * Keep these constants stable — they map to assets in /public/images.
 */
export const DESTINATION_FALLBACK = "/images/destination-fallback.svg";

/**
 * onError handler that swaps a broken destination photo with the local fallback.
 * Guards against infinite loops by clearing onerror after the first swap.
 */
export function handleDestinationImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>
): void {
  const img = event.currentTarget;
  if (img.dataset.fallback === "applied") return;
  img.dataset.fallback = "applied";
  img.src = DESTINATION_FALLBACK;
}

/**
 * onError for tiny airline logos (pics.avs.io). Hides the image rather than
 * showing a broken icon — the airline name is still rendered next to it.
 */
export function handleAirlineLogoError(
  event: React.SyntheticEvent<HTMLImageElement, Event>
): void {
  event.currentTarget.style.display = "none";
}
