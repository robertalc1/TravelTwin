# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project workflow rules

### Auto-push after every completed task
After each task — bug fix, refactor, or feature — run these four commands without asking:

1. `npx tsc --noEmit` — must pass with zero errors. Repo policy.
2. `git add -A`
3. `git commit -m "descriptive message in english"` (imperative, scope-prefixed where useful, e.g. `fix(favorites): ...`)
4. `git push origin main`

Skip only if the user explicitly asks to hold off.

### Code rules
- TypeScript strict mode — **never use `any`**. Prefer `unknown` + narrowing, or a `Record<string, unknown>` if shape is truly open.
- All UI **must support dark mode** (`dark:` variants on backgrounds, borders, text).
- All UI **must be responsive** (mobile-first; use `sm:`/`md:`/`lg:` breakpoints). Touch targets ≥44 px tall on mobile.
- In JSX, never use HTML entities like `&apos;` or `&quot;` — use curly braces (`{`'`}`) or plain text. The codebase enforces this convention.

## Common commands

```bash
npm run dev          # Next.js dev (Turbopack), localhost:3000
npm run build        # production build
npm run start        # serve a production build
npm run lint         # ESLint (Next.js config)
npx tsc --noEmit     # type check (run before every commit, see auto-push)
```

There is no test runner wired up yet — `package.json` has no `test` script. README mentions Vitest + Playwright as planned but not yet present.

## Architecture (non-obvious things to know)

### Travel data: Amadeus, with a dual-mode safety wrapper

There are two Amadeus modules and the difference matters:

- `src/lib/amadeus.ts` — wraps `new Amadeus({...})` in try/catch so the SDK can't crash module load when env vars are missing.
- `src/lib/amadeus-client.ts` — the **canonical** entry point. Has both SDK and raw REST fallback paths. **All API routes import from here**, not from `amadeus.ts` directly. If you find a route using `@/lib/amadeus` directly, that's a bug — route it through `@/lib/amadeus-client`.

Both routes degrade gracefully: if Amadeus credentials are bad, the user gets a friendly empty state, not a 500.

Hotels on the trip detail pages use **Tripadvisor (RapidAPI)** via `src/lib/tripadvisor-client.ts`, not Amadeus. That's why `/api/hotels/search` and `/api/hotels/live` are different routes.

### Cache layer (`api_cache` table in Supabase)

`src/lib/cache.ts` reads/writes a `api_cache` table keyed by string. Some quirks to remember:

- TTLs are in **minutes**, not seconds.
- Empty/negative results (e.g. `{hotels: []}`) are cached **for 1 hour only**, not the standard 24h. This prevents a transient upstream blip from sticking a city as "no results" for a full day — fix-pattern in `src/app/api/hotels/search/route.ts`. Apply the same `hotels.length > 0 ? 24h : 1h` shape to any new route that caches potentially-empty list results.
- The `tripadvisor-client.ts` geoId resolver does **NOT** cache `null` lookups (positive caching only). Don't "fix" that into negative caching without thinking — it was a deliberate choice.
- To purge poisoned cache rows by hand, see `supabase/migrations/20260522_purge_poisoned_cache.sql`.

### Supabase `favorites` table — DB-level CHECK constraint

The `favorites.item_type` column has a Postgres CHECK constraint. Allowed values:
`'city' | 'attraction' | 'hotel' | 'trip'`.

If you add a new item type at the application layer (`src/app/api/favorites/route.ts:ALLOWED_ITEM_TYPES`), **you must also update the DB constraint** via Supabase SQL Editor — otherwise inserts will fail with `new row for relation "favorites" violates check constraint "favorites_item_type_check"`. The pattern for the migration is in `supabase/migrations/20260522_favorites_allow_trip.sql`.

The heart UI **only lives on detail pages** (`TripDetailView`, `RoadTripDetailView`). Don't add a `FavoriteButton` to homepage cards or chat deal cards — the previous one was removed because it set `item_type='city'` and the favorites page couldn't reopen those (no `/explore` route exists).

### Trip data has TWO shapes in sessionStorage — handle both

Different writers stash trip data under `sessionStorage[trip_${id}]`:

- **Homepage cards + planner results** write a `TripPackage` (nested: `destination.iata`, `flight.price`, `hotel.name`).
- **Favorites page** writes the slim `TripDetail` (flat: `destinationCode`, `flightPrice`, `hotelName`, with `aiContent: null`).

Detail and map pages (`src/app/[locale]/(main)/plan/trip/[id]/page.tsx` + `.../map/page.tsx`) detect the shape via presence of the nested `destination` object before deciding whether to run `packageToTripDetail()`. Any new page that reads `trip_${id}` from sessionStorage must do the same — otherwise opening a saved favorite bounces to the homepage.

The road-trip side has the equivalent under `sessionStorage[roadTrip_${id}]` storing `RoadTripData`.

### AI routes — two models, two providers

- **`/api/ai/plan-trip`** (Anthropic) uses model `claude-sonnet-4-6` (current). If you see `claude-sonnet-4-20250514` anywhere, that's the old retired ID — update it. Each Anthropic fetch must be wrapped in an `AbortController` with a ~25s timeout so a hung request can't blow Vercel's `maxDuration = 60` budget.
- **`/api/chat`** (Groq) uses `llama-3.3-70b-versatile` with OpenAI-compatible tool calls. The system prompt at `BASE_SYSTEM_PROMPT` includes a "budget-fallback rule" — if you change the prompt, preserve that section (it stops the bot from replying with a flat "no offers" when the user asks for unrealistically cheap deals).

### Open-Meteo weather has a 16-day horizon

`src/lib/weatherService.ts` clamps `endDate` to `today + 16 days` and short-circuits when `startDate` is past that horizon. Trips that depart 17+ days out get an empty payload (the strip hides cleanly) instead of an upstream 400. Don't unwrap that — Open-Meteo's free tier doesn't go further.

### i18n: two parallel patterns

- Most strings live in `messages/ro.json` and `messages/en.json` and are read via `useTranslations('namespace')` from `next-intl`.
- **Some files** (e.g. `RoadTripDetailView.tsx`, `Footer.tsx`) use inline ternaries like `{isRo ? "Caută hoteluri" : "Search Hotels"}`. New strings should ideally go in the JSON files (the i18n pattern), but match the file's existing style when editing — don't half-convert a file.

Both files have a `nav` namespace with the menu labels (e.g. `nav.carRentals`). Add new menu items by extending that namespace in both files and using `t("key")`.

Locale-prefixed paths are built via `const lp = (path) => `/${locale}${path === "/" ? "" : path}` — common throughout `page.tsx` files.

### Next.js 16 middleware rename

This repo is on Next.js 16. Middleware was renamed: the file is `src/proxy.ts` and the export must be `export const proxy = ...`, NOT `middleware`. Same `matcher` config object.

### Romanian market quirks

- IATA codes: OTP (București), CLJ (Cluj), TSR (Timișoara), IAS (Iași), SBZ (Sibiu) all work via Amadeus IATA search.
- The homepage uses IP geolocation to surface deals from the user's nearest airport — `src/hooks/useUserLocation.ts` + `/api/deals/from/[iata]`.

## Where things live (only the non-obvious bits)

- `src/proxy.ts` — Next.js middleware (renamed from middleware.ts).
- `src/app/api/favorites/route.ts` — GET/POST/DELETE with the `ALLOWED_ITEM_TYPES` whitelist.
- `src/components/RouteMap/RouteMapView.tsx` — flight trip's "open route map" view. Accepts `?place=<name>` deep-link via the `initialFocusedPlace` prop; sidebar highlight matches `focusedPlace?.startsWith(name + ',')` so attraction tile clicks land on the right row.
- `src/components/RoadTripMap/RoadTripMapView.tsx` — road-trip equivalent with the same `?place=` deep-link contract.
- `src/components/AttractionPhotos.tsx` — shared tile grid for both trip detail pages. Click handler is a `onSelectPlace` callback; navigate to the map page from there.
- `supabase/migrations/*.sql` — repo-level docs only. Supabase Free does NOT auto-apply migrations; the user runs each file manually in the SQL Editor.

## Reference files in the repo

- `README.md` — public-facing pitch, full feature matrix, stack list.
- `docs/architecture.md` — full C4/ER diagrams (not always up to date with edits — verify against code).
- `.planning/` — work-in-progress planning artifacts (safe to ignore for code changes).
