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

### Travel data: Tripadvisor (RapidAPI) for everything live

`src/lib/tripadvisor-client.ts` is the **canonical** entry point. All live-data API routes import from here:

- `searchFlights()` — used by `/api/flights/live` and `/api/flights/inspiration`
- `searchHotels()` / `getHotelDetails()` — used by `/api/hotels/search` and `/api/hotels/[id]`
- Locations / IATA resolution: handled locally by `src/lib/iataMapping.ts` + `src/lib/commonRoutes.ts` (no upstream call needed for the well-known routes).

Amadeus was the previous primary source but was **fully replaced** during the Tripadvisor migration. The `src/lib/amadeus.ts` and `src/lib/amadeus-client.ts` files have been **deleted**; the `amadeus` npm package is no longer a dependency; `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` env vars are unused. If you see "Amadeus" in source code, it's only in a **comment describing the migration history** (e.g. `src/lib/tripadvisor-client.ts:2`, `src/lib/pricing.ts:2`, `src/components/TripDetailView.tsx:686`) — not active code. Don't try to import from `@/lib/amadeus*`; the path doesn't exist.

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

### Supabase `saved_trips` table — RLS + status CHECK

Same pattern as `favorites`, but two layers gate the insert from `/booking/simulate`:

- **RLS policies** must allow `auth.uid() = user_id` for INSERT/SELECT/UPDATE/DELETE.
- **`status` CHECK constraint** must include the three values the app uses: `'planning' | 'booked' | 'completed'`.

If either is missing, the booking simulator silently fails its `supabase.from('saved_trips').insert(...)` call. The fix-pattern (idempotent — safe to re-run) is `supabase/migrations/20260522_saved_trips_allow_user_inserts.sql`. The insert path at `src/app/[locale]/(main)/booking/simulate/page.tsx` surfaces the Supabase error via toast — don't swallow it back into a silent `catch` block.

### `tripPricingStore` has TWO hotel-seed actions

`src/stores/tripPricingStore.ts`:

- `seedHotel(label, price)` — sets only the breakdown label. **HotelsTab doesn't render from this** — it reads `selectedHotel`.
- `seedHotelAsSelected({...})` — constructs a synthetic `HotelOfferData` and stores it as `selectedHotel`. **This is what HotelsTab actually renders.**

The `TripDetailView` auto-pick effect falls back to `seedHotelAsSelected` when `/api/hotels/search` returns 0 hotels — otherwise the user sees "Add accommodation" empty state even when the package has a hotel name. Both seeds respect a user pick (early-return if `selectedHotel` already set).

### `SessionTimeoutModal` — 10-min hard reload on trip detail pages

`src/components/SessionTimeoutModal.tsx` is mounted by `TripDetailView` and fires a fixed `setTimeout` of 10 minutes from mount, then renders a blocking modal whose only action wipes the `trip_*`/`booking_*`/`flightView_*` keys from `sessionStorage` and hard-redirects to `/${locale}`. The displayed `00:00:00` countdown is **static decoration**, not a live ticker — don't try to "fix" it.

It exists to prevent idle tabs from burning Tripadvisor RapidAPI quota on stale prices when a user returns hours later. Bumping the timeout is fine; making it idle-aware (reset on activity) would be a real improvement.

### Trip data has TWO shapes in sessionStorage — handle both

Different writers stash trip data under `sessionStorage[trip_${id}]`:

- **Homepage cards + planner results** write a `TripPackage` (nested: `destination.iata`, `flight.price`, `hotel.name`).
- **Favorites page** writes the slim `TripDetail` (flat: `destinationCode`, `flightPrice`, `hotelName`, with `aiContent: null`).

Detail and map pages (`src/app/[locale]/(main)/plan/trip/[id]/page.tsx` + `.../map/page.tsx`) detect the shape via presence of the nested `destination` object before deciding whether to run `packageToTripDetail()`. Any new page that reads `trip_${id}` from sessionStorage must do the same — otherwise opening a saved favorite bounces to the homepage.

The road-trip side has the equivalent under `sessionStorage[roadTrip_${id}]` storing `RoadTripData`.

### AI routes — single provider (Groq), single model (Llama 3.3 70B Versatile)

All 5 AI endpoints call Groq's OpenAI-compatible Chat Completions API
(`https://api.groq.com/openai/v1/chat/completions`) with model
`llama-3.3-70b-versatile`. They share one env var: `GROQ_API_KEY`. Anthropic
was the previous provider; it's been fully removed.

Pattern conventions across all 5 routes:
- Headers: `Authorization: \`Bearer ${apiKey}\`` (no `x-api-key`, no provider-specific version header)
- Body: `{ model, max_tokens, temperature, response_format: { type: 'json_object' }, messages }` — the `response_format` is critical for JSON output endpoints (everything except `/api/chat` which uses tool calling)
- Response: `data.choices?.[0]?.message?.content` (NOT `data.content[0].text` — that was Anthropic's shape)
- `temperature`: 0.7 for creative endpoints (plan-trip, deals, road-trip), 0.3 for factual (visa-check)

Per-route notes:
- **`/api/ai/plan-trip`** generates 6 itineraries in parallel (`Promise.all`). Each fetch is wrapped in a 25s `AbortController` so a single hung request can't blow Vercel's `maxDuration = 60` budget.
- **`/api/chat`** is the only endpoint with tool calling (3 functions: `searchFlights`, `searchHotels`, `getCurrentDeals`). Multi-turn loop capped at 3 iterations. The system prompt at `BASE_SYSTEM_PROMPT` includes a "budget-fallback rule" — if you change the prompt, preserve that section (it stops the bot from replying with a flat "no offers" when the user asks for unrealistically cheap deals).
- **`/api/ai/visa-check`** caches results 24h in `api_cache` (per `nationality:country` key).
- **`/api/road-trip/plan`** uses the longest output (`max_tokens: 3500`) with tolerant JSON parsing via `parseRoadTripAiJson` (regex extraction of the first `{...}` block — handles occasional malformed Llama output).

If a route returns an error or Groq is unreachable, every endpoint falls back gracefully to template content from `src/lib/fallbackContent.ts` (no 500 errors, no broken UI).

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

- IATA codes: OTP (București), CLJ (Cluj), TSR (Timișoara), IAS (Iași), SBZ (Sibiu) are all handled via `src/lib/iataMapping.ts` (local lookup, no upstream call).
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
