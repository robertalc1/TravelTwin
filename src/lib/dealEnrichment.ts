import type { TripPackage } from '@/app/api/ai/plan-trip/route'
import { DESTINATIONS } from '@/lib/destinations'

/**
 * Extra tags for IATA codes not fully covered by destinations.ts,
 * or that need additional category tagging (snow, intercontinental, etc.)
 */
const EXTRA_TAGS: Record<string, string[]> = {
  // ── Snow / Alpine ─────────────────────────────────
  ZRH: ['snow'], INN: ['snow'], GVA: ['snow'], SZG: ['snow'],
  GRZ: ['snow'], LJU: ['snow'], MUC: ['snow'], PRG: ['snow'],
  BUD: ['snow'], WAW: ['snow'], KRK: ['snow'], SOF: ['snow'],
  OTP: ['snow'], CLJ: ['snow'], TSR: ['snow'], SBZ: ['snow'],
  BEG: ['snow'], SKP: ['snow'], TGD: ['snow'], TIV: ['snow'],
  // ── Beach (supplement destinations.ts) ────────────
  PMI: ['beach', 'nightlife'], RHO: ['beach'], CTA: ['beach'],
  NAP: ['beach', 'culture'], IBZ: ['beach', 'nightlife'],
  LPA: ['beach', 'family'], FUE: ['beach', 'family'],
  ACE: ['beach'], MRS: ['beach', 'culture'], AGP: ['beach'],
  FAO: ['beach'], OLB: ['beach'], CAG: ['beach'], PMO: ['beach'],
  LCA: ['beach'], PFO: ['beach'], BRI: ['beach', 'culture'],
  CRL: ['beach'], SPU: ['beach'], DBV: ['beach'], ZAD: ['beach'],
  // ── Intercontinental (non-European long-haul) ─────
  JFK: ['intercontinental'], LAX: ['intercontinental'],
  MIA: ['intercontinental', 'beach'], ORD: ['intercontinental'],
  BOS: ['intercontinental'], SFO: ['intercontinental'],
  YYZ: ['intercontinental'], YVR: ['intercontinental'],
  NRT: ['intercontinental'], HND: ['intercontinental'],
  BKK: ['intercontinental'], SIN: ['intercontinental'],
  HKG: ['intercontinental'], DPS: ['intercontinental', 'beach'],
  SYD: ['intercontinental', 'beach'], MEL: ['intercontinental'],
  GRU: ['intercontinental'], BOG: ['intercontinental'],
  LIM: ['intercontinental'], CMN: ['intercontinental'],
  JNB: ['intercontinental', 'adventure'], NBO: ['intercontinental'],
  CPT: ['intercontinental', 'nature'], CAI: ['intercontinental'],
  DEL: ['intercontinental'], BOM: ['intercontinental'],
  PEK: ['intercontinental'], PVG: ['intercontinental'],
  ICN: ['intercontinental'], DXB: ['intercontinental', 'beach', 'luxury'],
  AUH: ['intercontinental'], DOH: ['intercontinental'],
}

// Well-known mainstream hubs — NOT tagged as "hidden-gem"
const POPULAR_HUBS = new Set([
  'LHR', 'CDG', 'FCO', 'BCN', 'AMS', 'DXB', 'JFK', 'IST', 'MAD', 'MXP',
  'FRA', 'BRU', 'ATH', 'MUC', 'VIE', 'ZRH', 'CPH', 'ARN', 'HEL', 'OSL',
  'FCO', 'LIS', 'WAW', 'PRG', 'BUD', 'NRT', 'BKK', 'SIN',
])

export type EnrichedDeal = TripPackage & {
  readonly categories: string[]
}

export function enrichDeal(pkg: TripPackage): EnrichedDeal {
  const iata = pkg.destination.iata
  const tags = new Set<string>(pkg.destination.tags ?? [])

  // Merge from DESTINATIONS catalogue
  const known = DESTINATIONS.find((d) => d.iata === iata)
  if (known) {
    known.tags.forEach((t) => tags.add(t))
    if (known.budgetLevel === 'budget') tags.add('budget')
    if (known.budgetLevel === 'luxury') tags.add('luxury')
  }

  // Merge extra IATA-level tags
  ;(EXTRA_TAGS[iata] ?? []).forEach((t) => tags.add(t))

  // Derive "hidden-gem": budget destination that isn't a mainstream hub
  const isBudget =
    pkg.destination.budgetLevel === 'budget' || known?.budgetLevel === 'budget'
  if (isBudget && !POPULAR_HUBS.has(iata)) {
    tags.add('hidden-gem')
  }

  return { ...pkg, categories: Array.from(tags) }
}

export function enrichDeals(packages: TripPackage[]): EnrichedDeal[] {
  return packages.map(enrichDeal)
}
