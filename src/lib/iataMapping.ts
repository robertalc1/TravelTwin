// Maps city names to IATA codes (Romanian + major European + Brazilian)
export const CITY_TO_IATA: Record<string, string> = {
  // Romanian airports
  'Bucharest': 'OTP',
  'Bucharest OTP': 'OTP',
  'Bucharest Otopeni': 'OTP',
  'Henri Coanda': 'OTP',
  'Bucharest Baneasa': 'BBU',
  'Cluj-Napoca': 'CLJ',
  'Cluj': 'CLJ',
  'Timisoara': 'TSR',
  'Timișoara': 'TSR',
  'Iasi': 'IAS',
  'Iași': 'IAS',
  'Sibiu': 'SBZ',
  'Constanta': 'CND',
  'Constanța': 'CND',
  'Craiova': 'CRA',
  'Oradea': 'OMR',
  'Suceava': 'SCV',
  'Bacau': 'BCM',
  'Bacău': 'BCM',
  'Targu Mures': 'TGM',
  'Târgu Mureș': 'TGM',
  'Satu Mare': 'SUJ',
  'Arad': 'ARW',
  // UK
  'London': 'LHR',
  'London Heathrow': 'LHR',
  'London Gatwick': 'LGW',
  'London Stansted': 'STN',
  'London Luton': 'LTN',
  'London City': 'LCY',
  'Manchester': 'MAN',
  'Birmingham': 'BHX',
  'Edinburgh': 'EDI',
  // France
  'Paris': 'CDG',
  'Paris CDG': 'CDG',
  'Paris Charles de Gaulle': 'CDG',
  'Paris Orly': 'ORY',
  'Nice': 'NCE',
  'Lyon': 'LYS',
  'Marseille': 'MRS',
  // Germany
  'Frankfurt': 'FRA',
  'Munich': 'MUC',
  'Berlin': 'BER',
  'Hamburg': 'HAM',
  'Dusseldorf': 'DUS',
  'Cologne': 'CGN',
  // Netherlands
  'Amsterdam': 'AMS',
  // Spain
  'Madrid': 'MAD',
  'Barcelona': 'BCN',
  'Malaga': 'AGP',
  'Valencia': 'VLC',
  'Seville': 'SVQ',
  // Italy
  'Rome': 'FCO',
  'Rome Fiumicino': 'FCO',
  'Milan': 'MXP',
  'Milan Malpensa': 'MXP',
  'Milan Bergamo': 'BGY',
  'Venice': 'VCE',
  'Naples': 'NAP',
  'Florence': 'FLR',
  // Austria
  'Vienna': 'VIE',
  // Switzerland
  'Zurich': 'ZRH',
  'Geneva': 'GVA',
  // Belgium
  'Brussels': 'BRU',
  // Portugal
  'Lisbon': 'LIS',
  'Porto': 'OPO',
  // Ireland
  'Dublin': 'DUB',
  // Czech Republic
  'Prague': 'PRG',
  // Hungary
  'Budapest': 'BUD',
  // Poland
  'Warsaw': 'WAW',
  'Krakow': 'KRK',
  // Denmark
  'Copenhagen': 'CPH',
  // Sweden
  'Stockholm': 'ARN',
  'Gothenburg': 'GOT',
  // Norway
  'Oslo': 'OSL',
  // Finland
  'Helsinki': 'HEL',
  // Greece
  'Athens': 'ATH',
  'Thessaloniki': 'SKG',
  'Heraklion': 'HER',
  'Rhodes': 'RHO',
  // Turkey
  'Istanbul': 'IST',
  'Ankara': 'ESB',
  'Antalya': 'AYT',
  // Croatia
  'Zagreb': 'ZAG',
  'Split': 'SPU',
  'Dubrovnik': 'DBV',
  // Serbia
  'Belgrade': 'BEG',
  // Bulgaria
  'Sofia': 'SOF',
  'Varna': 'VAR',
  // Ukraine
  'Kyiv': 'KBP',
  // Moldova
  'Chisinau': 'KIV',
  // UAE
  'Dubai': 'DXB',
  'Abu Dhabi': 'AUH',
  // USA
  'New York': 'JFK',
  'New York JFK': 'JFK',
  'New York Newark': 'EWR',
  'Los Angeles': 'LAX',
  'Miami': 'MIA',
  'Chicago': 'ORD',
  // Asia
  'Bangkok': 'BKK',
  'Singapore': 'SIN',
  'Tokyo': 'NRT',
  'Beijing': 'PEK',
  'Hong Kong': 'HKG',
  // Brazil (legacy)
  'Sao Paulo (SP)': 'GRU',
  'Rio de Janeiro (RJ)': 'GIG',
  'Salvador (BH)': 'SSA',
  'Recife (PE)': 'REC',
  'Florianopolis (SC)': 'FLN',
  'Brasilia (DF)': 'BSB',
  'Natal (RN)': 'NAT',
  'Aracaju (SE)': 'AJU',
  'Campo Grande (MS)': 'CGR',
};

export const IATA_TO_CITY: Record<string, string> = {
  // Romanian
  OTP: 'Bucharest', BBU: 'Bucharest Baneasa', CLJ: 'Cluj-Napoca',
  TSR: 'Timișoara', IAS: 'Iași', SBZ: 'Sibiu', CND: 'Constanța',
  CRA: 'Craiova', OMR: 'Oradea', SCV: 'Suceava', BCM: 'Bacău',
  TGM: 'Târgu Mureș', SUJ: 'Satu Mare', ARW: 'Arad',
  // UK
  LHR: 'London', LGW: 'London Gatwick', STN: 'London Stansted',
  LTN: 'London Luton', LCY: 'London City', MAN: 'Manchester', BHX: 'Birmingham', EDI: 'Edinburgh',
  // France
  CDG: 'Paris', ORY: 'Paris Orly', NCE: 'Nice', LYS: 'Lyon', MRS: 'Marseille',
  // Germany
  FRA: 'Frankfurt', MUC: 'Munich', BER: 'Berlin', HAM: 'Hamburg', DUS: 'Dusseldorf', CGN: 'Cologne',
  // Netherlands
  AMS: 'Amsterdam',
  // Spain
  MAD: 'Madrid', BCN: 'Barcelona', AGP: 'Malaga', VLC: 'Valencia', SVQ: 'Seville',
  // Italy
  FCO: 'Rome', MXP: 'Milan', BGY: 'Milan Bergamo', VCE: 'Venice', NAP: 'Naples', FLR: 'Florence',
  // Austria
  VIE: 'Vienna',
  // Switzerland
  ZRH: 'Zurich', GVA: 'Geneva',
  // Belgium
  BRU: 'Brussels',
  // Portugal
  LIS: 'Lisbon', OPO: 'Porto',
  // Ireland
  DUB: 'Dublin',
  // Czech Republic
  PRG: 'Prague',
  // Hungary
  BUD: 'Budapest',
  // Poland
  WAW: 'Warsaw', KRK: 'Krakow',
  // Scandinavia
  CPH: 'Copenhagen', ARN: 'Stockholm', GOT: 'Gothenburg', OSL: 'Oslo', HEL: 'Helsinki',
  // Greece
  ATH: 'Athens', SKG: 'Thessaloniki', HER: 'Heraklion', RHO: 'Rhodes',
  // Turkey
  IST: 'Istanbul', ESB: 'Ankara', AYT: 'Antalya',
  // Balkans
  ZAG: 'Zagreb', SPU: 'Split', DBV: 'Dubrovnik', BEG: 'Belgrade', SOF: 'Sofia', VAR: 'Varna',
  KBP: 'Kyiv', KIV: 'Chisinau',
  // Middle East
  DXB: 'Dubai', AUH: 'Abu Dhabi',
  // USA
  JFK: 'New York', EWR: 'New York Newark', LAX: 'Los Angeles', MIA: 'Miami', ORD: 'Chicago',
  // Asia
  BKK: 'Bangkok', SIN: 'Singapore', NRT: 'Tokyo', PEK: 'Beijing', HKG: 'Hong Kong',
  // Brazil (legacy)
  GRU: 'Sao Paulo', GIG: 'Rio de Janeiro', SSA: 'Salvador', REC: 'Recife',
  FLN: 'Florianopolis', BSB: 'Brasilia', NAT: 'Natal', AJU: 'Aracaju', CGR: 'Campo Grande',
};

// IATA → Country mapping
export const IATA_TO_COUNTRY: Record<string, string> = {
  // Romania
  OTP: 'Romania', BBU: 'Romania', CLJ: 'Romania', TSR: 'Romania',
  IAS: 'Romania', SBZ: 'Romania', CND: 'Romania', CRA: 'Romania',
  OMR: 'Romania', SCV: 'Romania', BCM: 'Romania', TGM: 'Romania',
  SUJ: 'Romania', ARW: 'Romania', GHV: 'Romania',
  // UK
  LHR: 'United Kingdom', LGW: 'United Kingdom', STN: 'United Kingdom',
  LTN: 'United Kingdom', LCY: 'United Kingdom', MAN: 'United Kingdom',
  EDI: 'United Kingdom', BHX: 'United Kingdom', BRS: 'United Kingdom', GLA: 'United Kingdom',
  // France
  CDG: 'France', ORY: 'France', NCE: 'France', LYS: 'France', MRS: 'France', TLS: 'France',
  // Germany
  FRA: 'Germany', MUC: 'Germany', BER: 'Germany', HAM: 'Germany',
  DUS: 'Germany', CGN: 'Germany', STR: 'Germany',
  // Italy
  FCO: 'Italy', MXP: 'Italy', BGY: 'Italy', LIN: 'Italy', VCE: 'Italy',
  NAP: 'Italy', FLR: 'Italy', BLQ: 'Italy', CTA: 'Italy',
  // Spain
  MAD: 'Spain', BCN: 'Spain', PMI: 'Spain', AGP: 'Spain',
  ALC: 'Spain', VLC: 'Spain', SVQ: 'Spain', TFS: 'Spain',
  // Netherlands
  AMS: 'Netherlands', EIN: 'Netherlands',
  // Belgium
  BRU: 'Belgium', CRL: 'Belgium',
  // Portugal
  LIS: 'Portugal', OPO: 'Portugal', FAO: 'Portugal',
  // Austria
  VIE: 'Austria', SZG: 'Austria',
  // Switzerland
  ZRH: 'Switzerland', GVA: 'Switzerland', BSL: 'Switzerland',
  // Greece
  ATH: 'Greece', SKG: 'Greece', HER: 'Greece', JTR: 'Greece',
  JMK: 'Greece', RHO: 'Greece', CFU: 'Greece',
  // Turkey
  IST: 'Turkey', SAW: 'Turkey', AYT: 'Turkey', ESB: 'Turkey', BJV: 'Turkey', ADB: 'Turkey',
  // Poland
  WAW: 'Poland', KRK: 'Poland', GDN: 'Poland', WRO: 'Poland', KTW: 'Poland', POZ: 'Poland',
  // Czech Republic
  PRG: 'Czech Republic', BRQ: 'Czech Republic',
  // Hungary
  BUD: 'Hungary', DEB: 'Hungary',
  // Ireland
  DUB: 'Ireland', ORK: 'Ireland',
  // Scandinavia
  CPH: 'Denmark', ARN: 'Sweden', OSL: 'Norway', HEL: 'Finland',
  BGO: 'Norway', GOT: 'Sweden',
  // Croatia
  ZAG: 'Croatia', SPU: 'Croatia', DBV: 'Croatia',
  // Bulgaria
  SOF: 'Bulgaria', VAR: 'Bulgaria', BOJ: 'Bulgaria',
  // Serbia
  BEG: 'Serbia',
  // Moldova
  KIV: 'Moldova',
  // Ukraine
  KBP: 'Ukraine',
  // UAE
  DXB: 'UAE', AUH: 'UAE',
  // Asia
  NRT: 'Japan', HND: 'Japan', SIN: 'Singapore', BKK: 'Thailand',
  HKG: 'Hong Kong', ICN: 'South Korea', PVG: 'China', PEK: 'China',
  KUL: 'Malaysia', DPS: 'Indonesia', DEL: 'India', BOM: 'India',
  // Americas
  JFK: 'USA', EWR: 'USA', LAX: 'USA', ORD: 'USA', MIA: 'USA',
  SFO: 'USA', YYZ: 'Canada', CUN: 'Mexico',
  // Africa
  CAI: 'Egypt', RAK: 'Morocco', CPT: 'South Africa',
  JNB: 'South Africa', CMN: 'Morocco',
  // Oceania
  SYD: 'Australia', MEL: 'Australia', AKL: 'New Zealand',
  // Brazil
  GRU: 'Brazil', GIG: 'Brazil', SSA: 'Brazil', REC: 'Brazil',
  FLN: 'Brazil', BSB: 'Brazil', NAT: 'Brazil', AJU: 'Brazil', CGR: 'Brazil',
};

export function getCountryFromIata(iataCode: string): string {
  return IATA_TO_COUNTRY[iataCode] || '';
}

// Extract just the city name (before parenthetical state code)
export function getCityName(fullName: string): string {
  return fullName.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// Get IATA code for a city name (tries exact match then fuzzy)
export function getIataCode(cityName: string): string | null {
  if (CITY_TO_IATA[cityName]) return CITY_TO_IATA[cityName];

  const lower = cityName.toLowerCase();
  for (const [key, iata] of Object.entries(CITY_TO_IATA)) {
    if (key.toLowerCase() === lower) return iata;
    if (key.toLowerCase().startsWith(lower) || lower.startsWith(getCityName(key).toLowerCase())) {
      return iata;
    }
  }
  return null;
}

// Get display city name from IATA code
export function getCityFromIata(iataCode: string): string {
  return IATA_TO_CITY[iataCode] || iataCode;
}

// Extract code like "SP" from "Sao Paulo (SP)"
export function extractStateCode(cityName: string): string {
  const match = cityName.match(/\(([^)]+)\)/);
  return match ? match[1] : cityName.substring(0, 3).toUpperCase();
}
