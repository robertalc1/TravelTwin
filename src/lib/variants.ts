/**
 * Variant specs for the "single-destination" mode of the AI trip planner.
 *
 * When the user picks a specific destination (e.g. Malta) in the /plan wizard,
 * the API returns exactly 3 packages — one per tier defined here — instead of
 * the standard 18-destination discovery output. Each tier differs on hotel
 * stars, hotel zone, flight type, and AI itinerary theme.
 */

export type VariantTier = 'budget' | 'standard' | 'premium';

export interface VariantSpec {
  tier: VariantTier;
  /** Romanian user-facing badge text */
  label: 'Buget' | 'Standard' | 'Premium';
  /** Romanian theme shown as card subtitle */
  theme: string;
  /** English theme sent to Claude so the prompt stays consistent across locales */
  themeEN: string;
  targetStars: 3 | 4 | 5;
  zoneHint: 'periphery' | 'central' | 'seafront';
  /** Inserted into the synthetic hotel name, e.g. "Valletta Seafront Hotel" */
  zoneLabel: string;
  flightPref: 'cheapest' | 'balanced' | 'direct';
  /** Multiplier applied to base estimator hotel + flight prices */
  priceMultiplier: number;
  /** Amenities biased toward the tier */
  amenities: string[];
  /** Tailwind accent palette used by the results page badge */
  accentColor: 'emerald' | 'blue' | 'amber';
}

export const VARIANT_SPECS: readonly VariantSpec[] = [
  {
    tier: 'budget',
    label: 'Buget',
    theme: 'Relax & Plajă',
    themeEN: 'Relax & Beach',
    targetStars: 3,
    zoneHint: 'periphery',
    zoneLabel: 'City',
    flightPref: 'cheapest',
    priceMultiplier: 0.78,
    amenities: ['Free Wi-Fi', 'Breakfast', 'Air conditioning'],
    accentColor: 'emerald',
  },
  {
    tier: 'standard',
    label: 'Standard',
    theme: 'Cultură & Gastronomie',
    themeEN: 'Culture & Food',
    targetStars: 4,
    zoneHint: 'central',
    zoneLabel: 'Central',
    flightPref: 'balanced',
    priceMultiplier: 1.0,
    amenities: ['Pool', 'Breakfast', 'Gym', 'Free Wi-Fi'],
    accentColor: 'blue',
  },
  {
    tier: 'premium',
    label: 'Premium',
    theme: 'Romantic & Lux',
    themeEN: 'Romantic & Luxury',
    targetStars: 5,
    zoneHint: 'seafront',
    zoneLabel: 'Seafront',
    flightPref: 'direct',
    priceMultiplier: 1.55,
    amenities: ['Spa', 'Sea view', 'Concierge', 'Fine dining', 'Pool'],
    accentColor: 'amber',
  },
] as const;

export function variantSpecFor(tier: VariantTier): VariantSpec {
  const spec = VARIANT_SPECS.find((v) => v.tier === tier);
  if (!spec) throw new Error(`Unknown variant tier: ${tier}`);
  return spec;
}
