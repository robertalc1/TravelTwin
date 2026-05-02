# TravelTwin — PROJECT LOG

> **Tracking file** for ongoing development. Read this at the start of every session along with `PROJECT_SUMMARY.md` to know what's done, what's pending, and what's broken.

**Created:** 2026-05-01
**Last updated:** 2026-05-02
**Live URL:** https://travel-twin.vercel.app
**Repository:** https://github.com/robertalc1/TravelTwin

---

## 1. Implemented features (based on `src/` folder structure)

### Auth & accounts
- Supabase Auth with email + password
- Google OAuth (re-enabled with hardcoded prod callback URL)
- Facebook OAuth (with `email`, `public_profile` scopes)
- Modal-based auth flow — `/login` and `/register` routes removed; middleware bounces home with `?auth=login`
- Profile page with avatar menu, full name, nationality, travel style and stats counters
- Auth callback route (`/auth/callback`)

### Trip planning (AI)
- 4-step Plan wizard (`/plan`): budget → dates/nights/travelers → travel styles + climate → priorities
- AI itinerary generation via Anthropic Claude (`claude-sonnet-4-20250514`) — endpoint `/api/ai/plan-trip`
- Alternate generator at `/api/itinerary/generate`
- Trip-content endpoint `/api/ai/trip-content`
- Visa-check endpoint `/api/ai/visa-check`
- Dedicated chat endpoint `/api/chat`
- Results page (`/plan/results`) with `Best Match` badge, package cards
- Detailed trip view (`/plan/trip/[id]`) with day-by-day itinerary
- State transfer via `sessionStorage` (planResults + trip_{id})

### Flights
- Live Amadeus search at `/api/flights/live`
- AviationStack fallback at `/api/flights/aviationstack`
- Cheapest-destinations endpoint `/api/flights/inspiration`
- Per-airport deals at `/api/deals/from/[iata]`
- IATA autocomplete at `/api/locations/search`
- Public `/flights` page with results, source badges (Live/Cached/Error)

### Hotels
- Live Amadeus hotel search at `/api/hotels/live`
- Hotel images mapped by star rating via Unsplash
- Recently added: hotels fallback offers + dynamic price breakdown
- Public `/hotels` page

### Transfers (newly added)
- `/transfers` page
- `/api/amadeus/transfers` and `/api/amadeus/hotels` endpoints
- Trip detail tabs include transfer route map

### Discovery & maps
- Explore page (`/explore`) with 16 destinations, including 5 Romanian airports (OTP, CLJ, TSR, IAS, SBZ)
- Popular trips on homepage with geo-aware deals via `useUserLocation`
- Interactive map (`InteractiveMap.tsx`) with React-Leaflet 5.0 + OpenStreetMap
- Nominatim/OSM geocoding for attractions
- 4 marker types: attraction, restaurant, city, selected

### User content
- Saved trips (`/trips`) backed by Supabase + JourneyTimeline component
- Public shareable URL per trip (`/trips/share/[ref]`)
- Favorites (`/favorites`) with POST/DELETE `/api/favorites`
- Reviews (`/reviews`) — skeleton
- Stats (`/stats`) — skeleton
- Search history via `/api/searches`
- Recommendations endpoint `/api/recommendations`

### Booking
- 4-step simulator (`/booking/simulate`): Review → Traveler info → Payment → Confirmation
- DEMO ONLY — no real payment processing

### Infrastructure
- Multi-level DB cache (`api_cache`) with TTL: flights 15 min, hotels 30 min, IATA 24 h, inspiration 15 min
- Rate limiting per external API (`rateLimiter.ts`)
- Toaster + avatar menu UI components
- Dark mode via `next-themes` + Tailwind v4
- Responsive design (mobile-first)
- Geolocation hook (`useUserLocation`) — IP-based + browser fallback
- Supabase Row Level Security on user tables
- Soft-delete with `deleted_at`
- Audit fields (`created_at`, `updated_at`)
- 21+ REST endpoints across `/api/*`
- IATA database (`iataMapping.ts`, ~311 LOC)
- Budget allocator (`budgetAllocator.ts`)
- Pricing engine (`pricing.ts`)
- City fallback database (`cityFallbackData.ts`)
- Destinations matcher (`destinations.ts`)

---

## 2. Pending features (from `RESEARCH_REPORT.md`)

### High priority — thesis-grade
| # | Feature | Effort (h) | Notes |
|---|---|---|---|
| 1 | Conversational AI Trip Planner (chat-first, Claude Tool Use, streaming SSE) | 20–26 | Replaces wizard with chat panel |
| 2 | Live Price Drop Alerts (WebPush + Vercel cron) | 14–18 | Daily Amadeus diff vs `baseline_price` |
| 3 | Collaborative Trip Editing (Yjs CRDT + Supabase Realtime) | 35–45 | "WOW" capstone feature; presence + share token |
| 4 | AI Persona + ML Personalization (pgvector + OpenAI embeddings) | 22–28 | Cluster users after 3+ trips |
| 5 | PWA + offline itineraries (next-pwa + Workbox + Dexie) | 10–14 | OSM tile cache + IndexedDB |

### Medium priority
| # | Feature | Effort (h) |
|---|---|---|
| 6 | AR Camera Mode (WebXR via @react-three/xr) | 40–50 |
| 7 | Group Polling (vote destinations) | 6–8 |
| 9 | AI Voice Mode (Web Speech + ElevenLabs) | 12–16 |
| 10 | Currency Conversion Real-Time (exchangerate.host) | 3–5 |

### Low priority — vision
| # | Feature | Effort (h) |
|---|---|---|
| 11 | Trip Diary with photo auto-geotag (exifr) | 20–25 |
| 12 | Real Booking via Skyscanner Affiliate | 15–20 |
| 13 | Travel Insurance Marketplace (AXA / Allianz / Hanse Merkur) | 20–30 |
| 14 | Co-Traveler Match for solo travelers | 25–30 |
| 15 | Local Experiences Marketplace (Viator + GetYourGuide) | 15–20 |

### Cross-cutting tooling pending
- Vitest unit tests (target ≥70% coverage on `src/lib/`)
- Playwright E2E for full plan flow
- GitHub Actions CI (`tsc --noEmit`, lint, test, e2e)
- Sentry observability
- Pino structured logging
- Upstash Redis rate limiting on `/api/ai/plan-trip`
- Mapbox geocoding to replace Nominatim (with `geocoding_cache`)
- Custom domain (e.g. `traveltwin.ai`)
- LaTeX thesis (UPB template, 80–120 pp.)

---

## 3. Last 10 git commits

```
b81c0a5 feat: hotels fallback offers, transfer route map, dynamic price breakdown
44823ae feat: Amadeus transfers/cars + hotels API and trip detail tabs
72fb836 feat: avatar menu, toaster, favorites components and profile rework
05a68aa feat: remove /login & /register from URL flow — middleware bounces home with ?auth=login, all in-app links open modal directly
50b68b6 fix: declare email,public_profile scopes for Facebook OAuth
8265441 docs: document NEXT_PUBLIC_FACEBOOK_APP_ID in .env.example
2aefd49 feat: re-enable Google/Facebook OAuth buttons with hardcoded prod callback URL
33ad6d0 feat: auth modal with Google + Facebook OAuth, replaces /login and /register pages
3f437f3 chore: allow .env.example in repo for onboarding
c86fb32 docs: add README, .env.example, and architecture diagrams
```

---

## 4. Known bugs (from `RESEARCH_REPORT.md` — PASUL 5)

| # | Severity | Location | Problem | Fix |
|---|---|---|---|---|
| 1 | ~~CRITICAL~~ ✅ | `src/app/(main)/plan/page.tsx` | _Resolved._ Step 0 with `LocationAutocomplete` + Romanian airport chips (OTP/CLJ/TSR/CND/IAS), initial origin is empty string, `totalSteps = 5`, Next disabled until origin selected. | Verified 2026-05-01 |
| 2 | Major | `src/app/(main)/plan/page.tsx:296–298` | Budget slider max 3000€ blocks intercontinental | Raise `max` to 8000 |
| 3 | Major | `src/app/(main)/plan/results/page.tsx:30–49` | `sessionStorage` loses results on refresh | Persist in `plan_sessions` Supabase table, pass `?session=ID` |
| 4 | Major | `src/app/(main)/plan/results/page.tsx:163–169` | Unsplash images have no `onError` fallback → silent 404s | Add `onError` → fallback hero image |
| 5 | Minor | `src/app/(main)/page.tsx:139–148` | `Math.random()` shuffle on every load → "cheapest" inconsistent | Default `sortBy: 'price-asc'`, drop the shuffle |
| 6 | ~~Major (legal)~~ ✅ | `src/components/layout/Footer.tsx` | _Resolved._ Removed hardcoded "Google Reviews 4.6" badge from Footer brand block (badge had migrated from homepage to footer). Also dropped now-unused `Star` import. | Verified 2026-05-01 |
| 7 | Major | `src/components/InteractiveMap.tsx:55–59` | Nominatim sequential 300ms × N → ~3s + rate-limit risk | `geocoding_cache` table + Mapbox |
| 8 | Minor | `src/components/InteractiveMap.tsx:11–13` | Leaflet icons fetched from `unpkg.com` CDN | Self-host in `public/leaflet/` |
| 9 | CRITICAL (legal) | `src/app/(main)/booking/simulate/page.tsx` | Booking simulator accepts real card numbers | Red `DEMO MODE` banner + force test card `4242 4242 4242 4242` |
| 10 | Minor | multiple files | `pics.avs.io` airline logos no fallback | Add `onError` → hide |
| 11 | Major | `src/hooks/useUserLocation.ts` | IP geolocation imprecise for VPN/mobile users | Fallback to `navigator.geolocation` when low confidence |
| 12 | Minor | all `/api/*/live/route.ts` | No retry on Amadeus 5xx | `retryFetch` helper with exponential backoff |
| 13 | CRITICAL (cost) | `src/app/api/ai/plan-trip/route.ts` | No rate limiting → cost explosion possible | Upstash sliding-window 10/h/IP |
| 14 | Major | `src/app/(auth)/login/page.tsx` | _Stale in report — Google + Facebook OAuth now implemented_ | ✅ resolved (commits `2aefd49`, `33ad6d0`, `50b68b6`) |
| 15 | CRITICAL (security) | `src/app/(main)/booking/simulate/page.tsx` | Form accepts real card details | Combined with Bug #9 fix |
| 16 | Minor | all pages | No dynamic `generateMetadata` for SEO/OG | Add per-route metadata factories |
| 17 | Minor | `src/app/(main)/plan/results/page.tsx:88` | "No flights" message has no diagnostic context | Add `diagnoseError(params)` helper |
| 18 | Minor (perf) | multiple | Plain `<img>` instead of `next/image` | Migrate + whitelist `images.unsplash.com`, `pics.avs.io` |

> **Note:** Bug #14 in the research report is already fixed in production based on recent commits. Verify against the current `login` page during the next bug-fix pass.

---

## 5. Changelog

> Append a row here for every meaningful change. Keep newest at the top.

| Date | Type | Description | Commit |
|---|---|---|---|
| 2026-05-02 | feat | **Carbon Footprint feature fully removed.** Deleted `src/lib/carbon.ts`, the entire `src/components/CarbonTracker/` folder (`CarbonFootprintBadge`, `CarbonFootprintCard`, `CarbonComparisonBar`), and stripped `CarbonFootprintBadge` + `calculateCO2` references from `plan/results/page.tsx`. Also dropped item #8 (Carbon Footprint Calculator + Eco Mode) from the pending-features backlog. `tsc --noEmit` clean. | _this commit_ |
| 2026-05-01 | refactor | Removed "Climate impact" / Carbon Footprint section from `TripDetailView.tsx` per user request — not useful in the trip detail flow. Dropped `CarbonFootprintCard` + `calculateCO2` imports and orphan helpers `durationToMinutes` / `approxDistanceKmFromDuration`. | _this commit_ |
| 2026-05-01 | fix | Bug #2 — removed fake "Google Reviews 4.6" badge from `Footer.tsx`; dropped unused `Star` import | `827cbc1` |
| 2026-05-01 | fix | Bug #1 verified resolved — origin selection step (Step 0) with `LocationAutocomplete` + Romanian airport chips, `totalSteps = 5`, no hardcoded OTP fallback | `(prev)` |
| 2026-05-01 | chore | Added `PROJECT_LOG.md` tracking system | `(prev)` |
| 2026-04-30 | feat | Hotels fallback offers, transfer route map, dynamic price breakdown | `b81c0a5` |
| 2026-04-30 | feat | Amadeus transfers/cars + hotels API and trip detail tabs | `44823ae` |
| 2026-04-29 | feat | Avatar menu, toaster, favorites components, profile rework | `72fb836` |
| 2026-04-29 | feat | Removed `/login` + `/register` URL routes; modal flow with `?auth=login` | `05a68aa` |
| 2026-04-28 | fix | Declare `email`, `public_profile` scopes for Facebook OAuth | `50b68b6` |
| 2026-04-28 | docs | Document `NEXT_PUBLIC_FACEBOOK_APP_ID` in `.env.example` | `8265441` |
| 2026-04-28 | feat | Re-enabled Google + Facebook OAuth buttons with prod callback URL | `2aefd49` |
| 2026-04-27 | feat | Auth modal with Google + Facebook OAuth replaces `/login` + `/register` pages | `33ad6d0` |
| 2026-04-26 | chore | Allow `.env.example` in repo for onboarding | `3f437f3` |
| 2026-04-26 | docs | Added README, `.env.example`, architecture diagrams | `c86fb32` |

### Change types
- **feat** — new feature
- **fix** — bug fix
- **refactor** — internal restructuring without behavior change
- **docs** — documentation only
- **chore** — tooling, build, deps
- **test** — tests only
- **perf** — performance
- **style** — formatting only
