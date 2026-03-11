export interface DestinationProfile {
  city: string;
  country: string;
  iata: string;
  tags: string[];
  climate: 'warm' | 'mild' | 'cold' | 'varied';
  budgetLevel: 'budget' | 'mid' | 'luxury';
  bestMonths: number[];
  imageId: string;
  latitude: number;
  longitude: number;
}

export const DESTINATIONS: DestinationProfile[] = [
  { city: "Santorini", country: "Greece", iata: "JTR", tags: ["beach", "romantic", "culture"], climate: "warm", budgetLevel: "mid", bestMonths: [5,6,7,8,9,10], imageId: "photo-1570077188670-e3a8d69ac5ff", latitude: 36.3932, longitude: 25.4615 },
  { city: "Barcelona", country: "Spain", iata: "BCN", tags: ["beach", "culture", "nightlife", "food"], climate: "warm", budgetLevel: "mid", bestMonths: [4,5,6,7,8,9,10], imageId: "photo-1583422409516-2895a77efded", latitude: 41.3874, longitude: 2.1686 },
  { city: "Paris", country: "France", iata: "CDG", tags: ["culture", "romantic", "food"], climate: "mild", budgetLevel: "mid", bestMonths: [4,5,6,7,9,10], imageId: "photo-1502602898657-3e91760cbb34", latitude: 48.8566, longitude: 2.3522 },
  { city: "Rome", country: "Italy", iata: "FCO", tags: ["culture", "food", "romantic"], climate: "warm", budgetLevel: "mid", bestMonths: [4,5,6,9,10], imageId: "photo-1552832230-c0197dd311b5", latitude: 41.9028, longitude: 12.4964 },
  { city: "Istanbul", country: "Turkey", iata: "IST", tags: ["culture", "food", "adventure"], climate: "mild", budgetLevel: "budget", bestMonths: [4,5,6,9,10], imageId: "photo-1524231757912-21f4fe3a7200", latitude: 41.0082, longitude: 28.9784 },
  { city: "Bali", country: "Indonesia", iata: "DPS", tags: ["beach", "nature", "adventure", "romantic"], climate: "warm", budgetLevel: "budget", bestMonths: [4,5,6,7,8,9,10], imageId: "photo-1537996194471-e657df975ab4", latitude: -8.3405, longitude: 115.0920 },
  { city: "Dubai", country: "UAE", iata: "DXB", tags: ["luxury", "beach", "nightlife", "adventure"], climate: "warm", budgetLevel: "luxury", bestMonths: [10,11,12,1,2,3], imageId: "photo-1512453979798-5ea266f8880c", latitude: 25.2048, longitude: 55.2708 },
  { city: "London", country: "United Kingdom", iata: "LHR", tags: ["culture", "nightlife", "food", "family"], climate: "mild", budgetLevel: "mid", bestMonths: [5,6,7,8,9], imageId: "photo-1513635269975-59663e0ac1ad", latitude: 51.5074, longitude: -0.1278 },
  { city: "Tokyo", country: "Japan", iata: "NRT", tags: ["culture", "food", "adventure", "family"], climate: "varied", budgetLevel: "mid", bestMonths: [3,4,5,10,11], imageId: "photo-1540959733332-eab4deabeeaf", latitude: 35.6762, longitude: 139.6503 },
  { city: "New York", country: "USA", iata: "JFK", tags: ["culture", "nightlife", "food", "family"], climate: "varied", budgetLevel: "luxury", bestMonths: [4,5,6,9,10], imageId: "photo-1496442226666-8d4d0e62e6e9", latitude: 40.7128, longitude: -74.0060 },
  { city: "Prague", country: "Czech Republic", iata: "PRG", tags: ["culture", "nightlife", "romantic"], climate: "mild", budgetLevel: "budget", bestMonths: [4,5,6,7,8,9], imageId: "photo-1541849546-216549ae216d", latitude: 50.0755, longitude: 14.4378 },
  { city: "Lisbon", country: "Portugal", iata: "LIS", tags: ["beach", "culture", "food", "nightlife", "nomad"], climate: "warm", budgetLevel: "budget", bestMonths: [4,5,6,7,8,9,10], imageId: "photo-1548707309-dcebeab9ea9b", latitude: 38.7223, longitude: -9.1393 },
  { city: "Amsterdam", country: "Netherlands", iata: "AMS", tags: ["culture", "nightlife", "romantic"], climate: "mild", budgetLevel: "mid", bestMonths: [4,5,6,7,8,9], imageId: "photo-1534351590666-13e3e96b5017", latitude: 52.3676, longitude: 4.9041 },
  { city: "Vienna", country: "Austria", iata: "VIE", tags: ["culture", "romantic", "food"], climate: "mild", budgetLevel: "mid", bestMonths: [4,5,6,9,10], imageId: "photo-1516550893923-42d28e5677af", latitude: 48.2082, longitude: 16.3738 },
  { city: "Bangkok", country: "Thailand", iata: "BKK", tags: ["food", "culture", "adventure", "nightlife", "budget"], climate: "warm", budgetLevel: "budget", bestMonths: [11,12,1,2,3], imageId: "photo-1508009603885-50cf7c579365", latitude: 13.7563, longitude: 100.5018 },
  { city: "Bucharest", country: "Romania", iata: "OTP", tags: ["culture", "nightlife", "food", "budget"], climate: "varied", budgetLevel: "budget", bestMonths: [5,6,7,8,9], imageId: "photo-1558618666-fcd25c85cd64", latitude: 44.4268, longitude: 26.1025 },
  { city: "Antalya", country: "Turkey", iata: "AYT", tags: ["beach", "family", "budget"], climate: "warm", budgetLevel: "budget", bestMonths: [5,6,7,8,9,10], imageId: "photo-1542051841857-5f90071e7989", latitude: 36.8969, longitude: 30.7133 },
  { city: "Crete", country: "Greece", iata: "HER", tags: ["beach", "culture", "food", "family"], climate: "warm", budgetLevel: "budget", bestMonths: [5,6,7,8,9,10], imageId: "photo-1570077188670-e3a8d69ac5ff", latitude: 35.2401, longitude: 24.4691 },
  { city: "Tenerife", country: "Spain", iata: "TFS", tags: ["beach", "nature", "family"], climate: "warm", budgetLevel: "budget", bestMonths: [1,2,3,4,5,10,11,12], imageId: "photo-1518709268805-4e9042af9f23", latitude: 28.2916, longitude: -16.6291 },
  { city: "Marrakech", country: "Morocco", iata: "RAK", tags: ["culture", "adventure", "food"], climate: "warm", budgetLevel: "budget", bestMonths: [3,4,5,10,11], imageId: "photo-1489749798305-4fea3ae63d43", latitude: 31.6295, longitude: -7.9811 },
];

export function matchDestinations(
  travelStyles: string[],
  climate: string,
  budget: number,
  month: number,
  maxResults: number = 8
): DestinationProfile[] {
  const budgetLevel = budget < 800 ? 'budget' : budget < 2000 ? 'mid' : 'luxury';

  return DESTINATIONS
    .map(dest => {
      let score = 0;
      const tagMatches = travelStyles.filter(s => dest.tags.includes(s)).length;
      score += tagMatches * 30;
      if (climate === 'no-preference' || dest.climate === climate || dest.climate === 'varied') score += 20;
      if (dest.budgetLevel === budgetLevel) score += 25;
      else if (
        (budgetLevel === 'mid' && dest.budgetLevel === 'budget') ||
        (budgetLevel === 'luxury' && dest.budgetLevel === 'mid')
      ) score += 10;
      if (dest.bestMonths.includes(month)) score += 15;
      if (tagMatches === 0) score -= 50;
      return { dest, score };
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(d => d.dest);
}
