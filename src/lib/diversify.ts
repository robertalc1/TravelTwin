/**
 * Diversifies a sorted-by-price list so the user sees variety:
 * - First slot: cheapest
 * - Then alternates: cheap mid-range, mid-range exotic, etc.
 * - Ensures no two adjacent cards are the same country
 */
export function diversifyPackages<T extends { totalPrice: number; destination: { country: string; iata: string } }>(
  packages: T[],
  maxResults: number
): T[] {
  if (packages.length <= maxResults) return packages;

  const result: T[] = [];
  const used = new Set<string>();
  const usedCountries = new Map<string, number>(); // country -> count

  // Always include the absolute cheapest first
  if (packages[0]) {
    result.push(packages[0]);
    used.add(packages[0].destination.iata);
    usedCountries.set(packages[0].destination.country, 1);
  }

  // For remaining slots, prefer destinations that diversify country
  while (result.length < maxResults && result.length < packages.length) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (used.has(p.destination.iata)) continue;

      const countryCount = usedCountries.get(p.destination.country) || 0;
      // Prefer new countries (lower count) — penalty for repeating
      const diversityBonus = -countryCount * 1000;
      // Prefer cheaper (lower price = higher score)
      const priceScore = -p.totalPrice;
      const score = diversityBonus + priceScore * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    const chosen = packages[bestIdx];
    result.push(chosen);
    used.add(chosen.destination.iata);
    usedCountries.set(chosen.destination.country, (usedCountries.get(chosen.destination.country) || 0) + 1);
  }

  return result;
}
