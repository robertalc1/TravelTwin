// Pre-populated common routes for when live APIs return insufficient results
export interface CommonRoute {
  from: string;
  to: string;
  airlines: string[];
  avgPrice: number;
  currency: string;
}

export const COMMON_ROUTES: CommonRoute[] = [
  // From Bucharest OTP
  { from: 'OTP', to: 'LHR', airlines: ['W6', 'RO', 'BA'], avgPrice: 89, currency: 'EUR' },
  { from: 'OTP', to: 'CDG', airlines: ['W6', 'RO', 'AF'], avgPrice: 79, currency: 'EUR' },
  { from: 'OTP', to: 'FCO', airlines: ['W6', 'RO'], avgPrice: 69, currency: 'EUR' },
  { from: 'OTP', to: 'BCN', airlines: ['W6', 'FR'], avgPrice: 59, currency: 'EUR' },
  { from: 'OTP', to: 'AMS', airlines: ['W6', 'KL'], avgPrice: 89, currency: 'EUR' },
  { from: 'OTP', to: 'BER', airlines: ['W6', 'RO'], avgPrice: 49, currency: 'EUR' },
  { from: 'OTP', to: 'VIE', airlines: ['W6', 'OS'], avgPrice: 39, currency: 'EUR' },
  { from: 'OTP', to: 'BRU', airlines: ['W6'], avgPrice: 59, currency: 'EUR' },
  { from: 'OTP', to: 'MAD', airlines: ['W6', 'IB'], avgPrice: 79, currency: 'EUR' },
  { from: 'OTP', to: 'LIS', airlines: ['W6'], avgPrice: 89, currency: 'EUR' },
  { from: 'OTP', to: 'ATH', airlines: ['W6', 'A3'], avgPrice: 59, currency: 'EUR' },
  { from: 'OTP', to: 'IST', airlines: ['TK', 'W6'], avgPrice: 69, currency: 'EUR' },
  { from: 'OTP', to: 'DXB', airlines: ['FZ', 'W6'], avgPrice: 149, currency: 'EUR' },
  { from: 'OTP', to: 'MXP', airlines: ['W6', 'FR'], avgPrice: 49, currency: 'EUR' },
  { from: 'OTP', to: 'BUD', airlines: ['W6', 'RO'], avgPrice: 29, currency: 'EUR' },
  { from: 'OTP', to: 'PRG', airlines: ['W6'], avgPrice: 39, currency: 'EUR' },
  { from: 'OTP', to: 'WAW', airlines: ['W6', 'LO'], avgPrice: 39, currency: 'EUR' },
  { from: 'OTP', to: 'CPH', airlines: ['W6'], avgPrice: 59, currency: 'EUR' },
  { from: 'OTP', to: 'DUB', airlines: ['FR'], avgPrice: 69, currency: 'EUR' },
  { from: 'OTP', to: 'STN', airlines: ['W6', 'FR'], avgPrice: 49, currency: 'EUR' },
  { from: 'OTP', to: 'FRA', airlines: ['LH', 'RO'], avgPrice: 69, currency: 'EUR' },
  { from: 'OTP', to: 'MUC', airlines: ['LH'], avgPrice: 79, currency: 'EUR' },
  { from: 'OTP', to: 'ZRH', airlines: ['LX', 'W6'], avgPrice: 89, currency: 'EUR' },
  // From Cluj CLJ
  { from: 'CLJ', to: 'LTN', airlines: ['W6'], avgPrice: 49, currency: 'EUR' },
  { from: 'CLJ', to: 'MXP', airlines: ['W6'], avgPrice: 39, currency: 'EUR' },
  { from: 'CLJ', to: 'BER', airlines: ['W6'], avgPrice: 39, currency: 'EUR' },
  { from: 'CLJ', to: 'CDG', airlines: ['W6'], avgPrice: 59, currency: 'EUR' },
  { from: 'CLJ', to: 'BCN', airlines: ['W6'], avgPrice: 49, currency: 'EUR' },
  { from: 'CLJ', to: 'VIE', airlines: ['W6', 'OS'], avgPrice: 39, currency: 'EUR' },
  { from: 'CLJ', to: 'LHR', airlines: ['W6'], avgPrice: 59, currency: 'EUR' },
  { from: 'CLJ', to: 'FCO', airlines: ['W6'], avgPrice: 45, currency: 'EUR' },
  // From Timisoara TSR
  { from: 'TSR', to: 'LTN', airlines: ['W6'], avgPrice: 49, currency: 'EUR' },
  { from: 'TSR', to: 'MXP', airlines: ['W6'], avgPrice: 35, currency: 'EUR' },
  { from: 'TSR', to: 'BER', airlines: ['W6'], avgPrice: 39, currency: 'EUR' },
  { from: 'TSR', to: 'VIE', airlines: ['W6'], avgPrice: 29, currency: 'EUR' },
  // From Iasi IAS
  { from: 'IAS', to: 'LTN', airlines: ['W6'], avgPrice: 49, currency: 'EUR' },
  { from: 'IAS', to: 'MXP', airlines: ['W6'], avgPrice: 49, currency: 'EUR' },
  { from: 'IAS', to: 'VIE', airlines: ['W6'], avgPrice: 39, currency: 'EUR' },
  // Reverse routes (to Romania)
  { from: 'LHR', to: 'OTP', airlines: ['W6', 'RO', 'BA'], avgPrice: 89, currency: 'EUR' },
  { from: 'CDG', to: 'OTP', airlines: ['W6', 'RO', 'AF'], avgPrice: 79, currency: 'EUR' },
  { from: 'FCO', to: 'OTP', airlines: ['W6', 'RO'], avgPrice: 69, currency: 'EUR' },
  { from: 'BCN', to: 'OTP', airlines: ['W6', 'FR'], avgPrice: 59, currency: 'EUR' },
  { from: 'VIE', to: 'OTP', airlines: ['W6', 'OS'], avgPrice: 39, currency: 'EUR' },
  { from: 'BUD', to: 'OTP', airlines: ['W6'], avgPrice: 29, currency: 'EUR' },
  { from: 'LTN', to: 'CLJ', airlines: ['W6'], avgPrice: 49, currency: 'EUR' },
  // Popular European routes
  { from: 'LHR', to: 'CDG', airlines: ['BA', 'AF'], avgPrice: 79, currency: 'EUR' },
  { from: 'LHR', to: 'JFK', airlines: ['BA', 'VS', 'AA'], avgPrice: 349, currency: 'EUR' },
  { from: 'LHR', to: 'DXB', airlines: ['EK', 'BA'], avgPrice: 199, currency: 'EUR' },
  { from: 'CDG', to: 'FCO', airlines: ['AF', 'AZ'], avgPrice: 89, currency: 'EUR' },
  { from: 'FRA', to: 'BCN', airlines: ['LH', 'VY'], avgPrice: 79, currency: 'EUR' },
  { from: 'AMS', to: 'BCN', airlines: ['KL', 'VY'], avgPrice: 89, currency: 'EUR' },
  { from: 'MAD', to: 'FCO', airlines: ['IB', 'AZ'], avgPrice: 79, currency: 'EUR' },
  { from: 'IST', to: 'LHR', airlines: ['TK', 'BA'], avgPrice: 149, currency: 'EUR' },
  { from: 'DXB', to: 'LHR', airlines: ['EK', 'BA'], avgPrice: 199, currency: 'EUR' },
];

// Airline display names for reference flights
export const AIRLINE_NAMES: Record<string, string> = {
  W6: 'Wizz Air',
  RO: 'TAROM',
  BA: 'British Airways',
  AF: 'Air France',
  FR: 'Ryanair',
  KL: 'KLM',
  LH: 'Lufthansa',
  OS: 'Austrian Airlines',
  IB: 'Iberia',
  AZ: 'Alitalia',
  A3: 'Aegean Airlines',
  TK: 'Turkish Airlines',
  FZ: 'flydubai',
  EK: 'Emirates',
  LX: 'Swiss',
  VY: 'Vueling',
  VS: 'Virgin Atlantic',
  AA: 'American Airlines',
  LO: 'LOT Polish Airlines',
};

// Typical departure times for generated flights
export const DEPARTURE_SLOTS = [
  { hour: '06', minute: '30' },
  { hour: '09', minute: '15' },
  { hour: '12', minute: '45' },
  { hour: '15', minute: '20' },
  { hour: '18', minute: '50' },
  { hour: '21', minute: '10' },
];

// Approximate flight durations in minutes for common route pairs (distance-based)
export const ROUTE_DURATIONS: Record<string, number> = {
  'OTP-LHR': 195, 'OTP-CDG': 175, 'OTP-FCO': 155, 'OTP-BCN': 215,
  'OTP-AMS': 195, 'OTP-BER': 155, 'OTP-VIE': 90, 'OTP-BRU': 185,
  'OTP-MAD': 250, 'OTP-LIS': 290, 'OTP-ATH': 90, 'OTP-IST': 100,
  'OTP-DXB': 330, 'OTP-MXP': 160, 'OTP-BUD': 75, 'OTP-PRG': 130,
  'OTP-WAW': 120, 'OTP-CPH': 195, 'OTP-DUB': 265, 'OTP-STN': 195,
  'OTP-FRA': 170, 'OTP-MUC': 145, 'OTP-ZRH': 175,
  'CLJ-LTN': 195, 'CLJ-MXP': 145, 'CLJ-BER': 155, 'CLJ-CDG': 185, 'CLJ-VIE': 85,
  'TSR-LTN': 205, 'TSR-MXP': 120, 'IAS-LTN': 210, 'IAS-MXP': 165,
  'LHR-CDG': 75, 'LHR-JFK': 435, 'LHR-DXB': 390, 'CDG-FCO': 120,
  'FRA-BCN': 175, 'AMS-BCN': 185, 'IST-LHR': 225, 'DXB-LHR': 390,
};

export function getRouteDuration(from: string, to: string): number {
  return ROUTE_DURATIONS[`${from}-${to}`] || ROUTE_DURATIONS[`${to}-${from}`] || 150;
}

export function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h}H${m.toString().padStart(2, '0')}M`;
}

export function findCommonRoute(from: string, to: string): CommonRoute | undefined {
  return COMMON_ROUTES.find(
    (r) => (r.from === from && r.to === to) || (r.from === to && r.to === from && r.from !== from)
  ) || COMMON_ROUTES.find((r) => r.from === from && r.to === to);
}
