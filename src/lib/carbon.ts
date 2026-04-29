/**
 * Carbon footprint calculations for travel.
 *
 * Emission factors are kg CO₂ per passenger-km, sourced from:
 *  - DEFRA 2024 (UK govt) for short / medium / long haul flights
 *  - EEA for trains and intercity buses (Europe averages)
 *  - DEFRA 2024 average car (medium petrol, 1 occupant)
 *
 * Aviation is multiplied by a Radiative Forcing Index (RFI = 1.9, ICAO)
 * to account for non-CO₂ effects of high-altitude emissions (NOx, contrails).
 */

const EMISSION_FACTORS = {
  shortHaul: 0.255,   // < 1500 km
  mediumHaul: 0.195,  // 1500–4000 km
  longHaul: 0.147,    // > 4000 km
  train: 0.041,
  car: 0.171,
  bus: 0.089,
} as const;

const RFI = 1.9;

export interface CarbonResult {
  /** Total flight CO₂ in kg, including return leg if requested. */
  flightCO2: number;
  trainCO2: number;
  carCO2: number;
  busCO2: number;
  /** Suggested offset cost in EUR (€15 per tonne CO₂, market avg). */
  offsetEur: number;
  /** 0–100 score; 100 = lowest impact, 0 = very high. */
  ecoScore: number;
  /** True when total flight CO₂ is below 200 kg per traveler. */
  isEcoTrip: boolean;
  /** Distance band actually used to compute the flight factor. */
  flightBand: "shortHaul" | "mediumHaul" | "longHaul";
}

/**
 * Calculate CO₂ for a flight + ground-transport alternatives over the same distance.
 *
 * @param distanceKm  Great-circle distance between origin and destination, one-way.
 * @param passengers  Number of travelers (default 1).
 * @param isReturn    Multiply distance by 2 when true.
 */
export function calculateCO2(
  distanceKm: number,
  passengers = 1,
  isReturn = true
): CarbonResult {
  const km = isReturn ? distanceKm * 2 : distanceKm;
  const flightBand: CarbonResult["flightBand"] =
    distanceKm > 4000 ? "longHaul" : distanceKm > 1500 ? "mediumHaul" : "shortHaul";
  const factor = EMISSION_FACTORS[flightBand];

  const flightCO2 = Math.round(km * factor * RFI * passengers);
  const trainCO2 = Math.round(km * EMISSION_FACTORS.train * passengers);
  const carCO2 = Math.round(km * EMISSION_FACTORS.car * passengers);
  const busCO2 = Math.round(km * EMISSION_FACTORS.bus * passengers);

  const offsetEur = Math.round((flightCO2 / 1000) * 15 * 10) / 10;
  const ecoScore = Math.max(0, Math.min(100, Math.round(100 - (flightCO2 / 2000) * 100)));
  const isEcoTrip = flightCO2 < 200;

  return { flightCO2, trainCO2, carCO2, busCO2, offsetEur, ecoScore, isEcoTrip, flightBand };
}

/**
 * Haversine distance between two lat/lon points, in kilometers.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
