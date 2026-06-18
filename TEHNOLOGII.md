# TravelTwin — Inventar tehnologic exhaustiv

> Document generat din analiza directă a `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.example`, `supabase/migrations/`, și a întregului `src/`. Fiecare element este verificat la sursă cu calea fișierului. Fără limbaj de marketing. Cod orfan marcat explicit ca **DEAD CODE**.
>
> Data verificare: 2026-06-11. Branch: `main`. Commit curent: `545c56d`.

---

## 0. Verificare independentă

Comenzi pentru reproducere:
```bash
grep -rn "claude-\|llama-\|gpt-\|gemini-" src/
grep -rhoE "\.from\(['\"][a-z_]+['\"]" src/ | sort -u
grep -rln "MAPBOX_TOKEN\|RESEND_API_KEY\|SENTRY_DSN" src/
find src/app/api -name "route.ts" | wc -l
```

---

## 1. Fișiere de configurare la rădăcină

| Fișier | Prezent | Conținut esențial |
|---|:---:|---|
| `package.json` | ✅ | 15 deps runtime + 8 dev; scripts: dev / build / start / lint |
| `package-lock.json` | ✅ | npm lockfile prezent |
| `tsconfig.json` | ✅ | strict, target ES2017, moduleResolution `bundler`, path `@/* → ./src/*` |
| `next.config.ts` | ✅ | doar plugin `next-intl`, fără rewrites/redirects/experimental |
| `eslint.config.mjs` | ✅ | flat config v9 cu `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` |
| `postcss.config.mjs` | ✅ | un singur plugin: `@tailwindcss/postcss` |
| `.env.example` | ✅ | 22 variabile documentate (8 active, 14 dead/rezervate) |
| `.env.local` | ✅ | local doar; nu e versionat |
| `next-env.d.ts` | ✅ | auto-generat de Next.js |
| `tsconfig.tsbuildinfo` | ✅ | cache incremental TypeScript |
| `vercel.json` | ❌ | **NU există** — deployment-ul folosește setări default Vercel |
| `Dockerfile` | ❌ | **NU există** |
| `.dockerignore` | ❌ | **NU există** |
| `.github/workflows/` | ❌ | **NU există** — fără GitHub Actions |
| `.husky/` | ❌ | **NU există** — fără pre-commit hooks |
| `lint-staged` config | ❌ | absent din `package.json` |
| `.prettierrc*` | ❌ | absent — fără formatare automată dedicată |
| `jest.config.*`, `vitest.config.*`, `playwright.config.*` | ❌ | absente — niciun test runner |

---

## 2. Runtime & limbaj

### 2.1 Node.js
- **Versiune cerută**: NU este declarată `engines.node` în `package.json`.
- Implicit: Vercel folosește Node 20 LTS la build și runtime pe serverless functions.
- Cod referitor: `@types/node: ^20` (deci dezvoltarea presupune Node 20.x).
- **Folosit pentru**: build (`next build`), dev server (`next dev`), runtime al API Routes pe Vercel Serverless Functions.

### 2.2 TypeScript
- **Versiune**: `^5` (din `package.json:devDependencies`).
- **Config** (`tsconfig.json`):
  - `target: "ES2017"`
  - `module: "esnext"`, `moduleResolution: "bundler"`
  - `strict: true`, `noEmit: true`, `isolatedModules: true`
  - `jsx: "react-jsx"`
  - `paths: { "@/*": ["./src/*"] }`
- **Lib**: `dom`, `dom.iterable`, `esnext`.
- **Plugin**: `next` (validare types Next.js).
- **Politică**: zero `any` în cod (regulă din `.claude/CLAUDE.md`).

### 2.3 npm
- Pachet manager: **npm** (prezența `package-lock.json` confirmă; nu există `pnpm-lock.yaml` sau `yarn.lock`).
- Scripts disponibile:
  - `dev` → `next dev`
  - `build` → `next build`
  - `start` → `next start`
  - `lint` → `eslint`

---

## 3. Framework principal

### 3.1 Next.js
- **Versiune**: `16.1.6` (pin, fără `^`).
- **Features folosite confirmate prin grep**:
  - **App Router** — `src/app/[locale]/...`, route groups `(auth)` și `(main)`
  - **Server Components** — randare server-side pe paginile fără `"use client"`
  - **Route Handlers** — 33 fișiere `route.ts` în `src/app/api/`
  - **Middleware** — `src/proxy.ts` (export `proxy`, NU `middleware` — rename obligatoriu pentru Next.js 16)
  - **Image Optimization** — `next/image`
  - **Font Optimization** — `next/font/google` în `src/app/layout.tsx:2`
  - **Dynamic imports cu `ssr: false`** — folosit pentru EuropeMapPicker
  - **`force-dynamic`** — declarat pe `/api/flights/live/route.ts:26`
- **Features NEFOLOSITE explicit**:
  - Niciun `rewrites`/`redirects` în `next.config.ts`
  - Niciun `images.remotePatterns` declarat
  - Niciun `export const runtime = 'edge'` în API Routes (deci toate sunt Node Functions)

### 3.2 React
- **Versiune**: `19.2.3` (pin, fără `^`)
- **react-dom**: `19.2.3`
- **Features folosite**:
  - Hooks standard (`useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`)
  - **React Context** — folosit într-un singur loc: `src/providers/AuthProvider.tsx:3` (`createContext`)
  - Server Components (default, fără directivă)
  - Client Components (`"use client"`)

---

## 4. UI Layer

### 4.1 Tailwind CSS
- **Versiune**: `^4` (`tailwindcss`)
- **PostCSS plugin**: `@tailwindcss/postcss ^4`
- **Custom config file**: NU există `tailwind.config.*` — tema este customizată via CSS variables în `src/app/globals.css` (`--primary-*`, `--secondary-*`, `--accent-*`, `--neutral-*`, `--font-*`).
- **Dark mode**: clase `dark:` peste tot, controlat de `next-themes`.

### 4.2 CSS-in-JS
- ❌ **styled-components**: NU instalat
- ❌ **@emotion/***: NU instalat
- ❌ **vanilla-extract**: NU instalat
- Styling = exclusiv Tailwind + CSS variables în `globals.css`.

### 4.3 Iconițe
- `lucide-react ^0.564.0` — sistem unic de iconițe SVG, importat în zeci de componente.

### 4.4 Biblioteci de componente UI
- ❌ **shadcn/ui**: NU folosit (verificat: zero `@/components/ui/button` shadcn-style; primitive proprii)
- ❌ **Radix UI**: NU instalat
- ❌ **Material UI**, **Chakra**, **Mantine**, **Ant Design**: NU instalate
- Componente custom proprii în `src/components/ui/`:
  - `Button.tsx`, `Input.tsx`, `Skeleton.tsx`, `Badge.tsx`, `RatingStars.tsx`, `FlagIcon.tsx`, `LocationAutocomplete.tsx`, `SourceBadge.tsx`, `Toaster.tsx`

### 4.5 Utilități CSS
- `clsx ^2.1.1` — compunere condițională de clase
- `tailwind-merge ^3.4.1` — rezolvare conflicte între clase Tailwind compuse

### 4.6 Fonturi
Încărcate via `next/font/google` în `src/app/layout.tsx:2`:
- **Inter** — `--font-display` (weights 400/500/600/700), `--font-body` (400/500/600), display `swap`
- **JetBrains Mono** — `--font-mono` (400/500), display `swap`

---

## 5. State management

### 5.1 Zustand
- **Versiune**: `^5.0.11`
- **Stores în `src/stores/` (7 fișiere)**:

| Fișier | Rol verificat |
|---|---|
| `authModalStore.ts` | Vizibilitatea modalului login/register + `redirectUri` |
| `chatStore.ts` | Toggle pentru panoul de chat AI |
| `currencyStore.ts` | Moneda activă (RON/EUR/USD) + rate FX, persist în localStorage |
| `filtersStore.ts` | Filtre căutare (preț, durată, escală, stil) |
| `searchStore.ts` | Stare căutare itinerar (origine, destinație, date, rezultate) |
| `toastStore.ts` | Coadă toast-uri cu auto-dismiss 2.5s |
| `tripPricingStore.ts` | Breakdown preț (flight + hotel + transfer + extras), 2 acțiuni de hotel-seed |

### 5.2 Alte mecanisme de state
- **React Context API** — un singur context: `AuthContext` în `src/providers/AuthProvider.tsx:16`
- **React Query / SWR / TanStack Query**: ❌ NU instalate
- **Redux / Redux Toolkit**: ❌ NU instalate
- **Jotai / Recoil / Valtio**: ❌ NU instalate
- **MobX**: ❌ NU instalat

---

## 6. Forme & validare

- ❌ **react-hook-form**: NU instalat
- ❌ **Formik**: NU instalat
- ❌ **Zod**: NU instalat
- ❌ **Yup**: NU instalat
- ❌ **Joi**: NU instalat
- ❌ **Valibot**, **Arktype**: NU instalate
- **Cum se gestionează formele**: state local cu `useState` + handler-i `onChange` manuali; validare ad-hoc per câmp (ex: `AuthModal.tsx`, wizard `/plan`).

---

## 7. Animații

### 7.1 Framer Motion
- **Versiune**: `^12.34.0`
- **Folosit în 25 fișiere** (verificat prin `grep -rln "from 'framer-motion'" src/ | wc -l`)
- Tipuri folosite: `motion.div`, `motion.button`, `AnimatePresence`

### 7.2 CSS animations custom
Definite în `src/app/globals.css`:
- `fade-in-up`, `fade-in`, `pulse-soft`, `slide-in-bottom`, `shimmer-sweep`

### 7.3 Alte biblioteci de animație
- ❌ **GSAP**: NU instalat
- ❌ **react-spring**: NU instalat
- ❌ **Lottie**: NU instalat

---

## 8. Hărți

### 8.1 Leaflet
- **`leaflet`**: `^1.9.4`
- **`react-leaflet`**: `^5.0.0`
- **`@types/leaflet`**: `^1.9.21`
- **Folosit într-un singur fișier**: `src/components/EuropeMapPicker.tsx:4-6`
  - Imports: `MapContainer, TileLayer, Marker, Tooltip, useMap` (react-leaflet), `L` (leaflet)
  - CSS: `import 'leaflet/dist/leaflet.css'` în componenta însăși (NU în `globals.css`)
- **Pagina finală**: `/ro/road-trip` și `/en/road-trip` (modal de selecție origin/destination), încărcat cu `dynamic({ ssr: false })` la `src/app/[locale]/(main)/road-trip/page.tsx:28`.

### 8.2 Google Maps Platform

Verificat prin `grep -rn "maps.googleapis.com\|google.com/maps" src/`:

| API Google | Status | Locație |
|---|:---:|---|
| **Maps JavaScript API** (loader client) | ❌ NEFOLOSIT | nicio referință `@react-google-maps`, `@googlemaps/js-api-loader` |
| **Maps Embed API** (iframe) | ✅ ACTIV | `src/components/RouteMap/buildEmbedUrl.ts:38,45`; randat de `RouteMapView.tsx`, `RoadTripMapView.tsx` |
| **Directions API** (server) | ✅ ACTIV | `src/app/api/directions/route.ts:168` |
| **Distance Matrix API** | ✅ ACTIV | `src/lib/google-maps-client.ts:214` (mod `transit` în road-trip) |
| **Geocoding API** (forward + reverse) | ✅ ACTIV | `src/lib/google-maps-client.ts:54` (forward), `:269` (reverse) |
| **Places API (Nearby Search)** | ✅ ACTIV | `src/lib/google-maps-client.ts:320` |
| **Static Maps API** | ✅ ACTIV | `src/components/RouteMap/buildEmbedUrl.ts:77,107` |
| **Routes API v2** | ❌ NEFOLOSIT | folosit doar Directions v1 |
| **Time Zone API**, **Elevation API** | ❌ NEFOLOSIT | — |

### 8.3 Alți furnizori de hărți
- ❌ **Mapbox**: `MAPBOX_TOKEN` declarat în `.env.example` dar **0 referințe în src/** → **DEAD KEY** (vezi §27)
- ❌ **OpenStreetMap direct (fără Leaflet)**: niciun apel custom
- ❌ **Here Maps**, **TomTom**, **MapTiler**: NU folosite

---

## 9. Internaționalizare

- **`next-intl ^4.11.2`**
- **Locale-uri**: `['en', 'ro']` (definite în `src/i18n/routing.ts`)
- **Locale default**: `en`
- **localePrefix**: `'always'` — toate rutele au `/en` sau `/ro`
- **Fișiere mesaje**: `messages/en.json`, `messages/ro.json`
- **Plugin Next.js**: `createNextIntlPlugin("./src/i18n/request.ts")` în `next.config.ts:4`
- **Server-side messages loader**: `src/i18n/request.ts`
- **Client-side hook**: `useTranslations('namespace')`
- **Switcher UI**: `src/components/LanguageSelector.tsx`

---

## 10. Routing

### 10.1 Structura App Router

```
src/app/
├── auth/callback/route.ts          ← OAuth code-exchange
├── api/                            ← 33 fișiere route.ts
└── [locale]/
    ├── (auth)/                     ← route group autentificare (callback localizat)
    └── (main)/
        ├── page.tsx                ← home
        ├── plan/                   ← wizard + results + trip detail + map
        ├── flights/
        ├── hotels/
        ├── cars/
        ├── road-trip/
        ├── trips/
        ├── favorites/
        ├── profile/
        ├── booking/simulate/
        ├── stats/
        ├── transfers/
        ├── reviews/
        └── explore/
```

### 10.2 Middleware (`src/proxy.ts`)

- Export numit `proxy` (rename obligatoriu Next.js 16; vechiul `middleware` nu mai funcționează).
- Conține: rutare `next-intl` + gate auth pe `/trips`, `/profile`, `/favorites`.
- La cookie lipsă → bounce către `/?auth=login&next=<path>` (modal-based, fără pagini `/login`).

### 10.3 Dynamic segments folosite
- `[locale]`, `[id]`, `[hotelId]`, `[city]`, `[iata]`

---

## 11. Bază de date

### 11.1 Client + adapter
- **`@supabase/supabase-js ^2.95.3`**
- **`@supabase/ssr ^0.8.0`** — adapter SSR pentru Next.js cu cookies
- Wrapper-i: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`

### 11.2 Motor DB
- **PostgreSQL** prin Supabase Cloud
- Niciun **ORM** (Prisma, Drizzle, TypeORM, Sequelize, Kysely): ❌ NU instalate
- Acces direct prin client Supabase

### 11.3 Tabele folosite în cod (verificat prin grep `.from('...')`)

| Tabel | Apare în |
|---|---|
| `api_cache` | `src/lib/cache.ts` (toate 4 operațiunile CRUD) |
| `favorites` | `src/app/api/favorites/route.ts`, pagina `/favorites` |
| `profiles` | `src/providers/AuthProvider.tsx`, `src/hooks/useUser.ts`, profile page |
| `saved_trips` | `src/app/api/trips/route.ts`, booking simulate, profile, trips page |

> Notă: tabelele `flights`, `hotels` și `user_searches` (seed brazilian din template-ul original) au fost eliminate — nu mai existau consumatori în UI. Datele live vin din Tripadvisor și se cache-uiesc în `api_cache`.

### 11.4 Migrații în `supabase/migrations/`

| Fișier | Rol |
|---|---|
| `20260522_favorites_allow_trip.sql` | Adaugă `'trip'` în CHECK constraint pe `favorites.item_type` |
| `20260522_purge_poisoned_cache.sql` | Șterge rânduri poisoned din `api_cache` |
| `20260522_saved_trips_allow_user_inserts.sql` | RLS + status CHECK pentru `saved_trips` |

- **Aplicare**: manuală prin Supabase Dashboard → SQL Editor (Supabase Free nu aplică automat).
- **Extensii PostgreSQL custom**: NU sunt declarate `CREATE EXTENSION` în migrații.

### 11.5 Row Level Security
- Activat pe `favorites`, `saved_trips` (vezi migrația de mai sus)
- Politici tip `auth.uid() = user_id` pentru SELECT/INSERT/UPDATE/DELETE

---

## 12. Autentificare

### 12.1 Furnizor
- **Supabase Auth** prin `@supabase/ssr`

### 12.2 Provideri OAuth declarați în cod
Verificat în `src/components/auth/SocialButtons.tsx:7`:
```ts
type Provider = "google" | "facebook";
```
Apelate prin `supabase.auth.signInWithOAuth({ provider, ... })` (`SocialButtons.tsx:34`).

### 12.3 Login email + parolă
- `supabase.auth.signInWithPassword({ email, password })` în `src/components/auth/AuthModal.tsx:79,96`

### 12.4 Sesiune
- **JWT** stocat în cookies `httpOnly` cu prefix `sb-*-auth-token` (gestionat automat de `@supabase/ssr`)
- Detectat în `src/proxy.ts:21` prin filtrare cookies
- NU se folosește `localStorage` pentru token-uri

### 12.5 Callback OAuth
- Rută: `src/app/auth/callback/route.ts`
- Schimbă code OAuth pe sesiune și redirectează la `?next=...`

### 12.6 UI
- Modal-based: `src/components/auth/AuthModal.tsx`
- NU există pagini dedicate `/login` sau `/register`

---

## 13. Caching

### 13.1 Strat custom DB (`src/lib/cache.ts`)
- Backed by `api_cache` table în Supabase
- Funcții: `getCached(key)`, `setCache(key, data, ttlMinutes)`, `clearExpired()`
- Mecanism: row cu `expires_at`, ștergere asincronă la read pentru rândurile expirate, `hit_count` incrementat
- **Unitatea TTL: minute** (regulă din `.claude/CLAUDE.md`)

### 13.2 TTL-uri declarate (verificat în cod)
- `DRIVE_CACHE_TTL_MIN = 60 * 24` (24h) — Google Distance Matrix
- `GEOCODE_CACHE_TTL_MIN = 60 * 24 * 30` (30 zile) — Google Geocoding
- Empty results: 1h (per convenție în `/api/hotels/search`)

### 13.3 Alte straturi
- **Browser localStorage** — `currencyStore` (rate FX cu TTL 1h)
- **sessionStorage** — `trip_*`, `booking_*`, `flightView_*`, `planResults_v2`, `homepage_destinations`
- ❌ **Redis activ**: `UPSTASH_REDIS_REST_URL` și `UPSTASH_REDIS_REST_TOKEN` declarate în `.env.example` dar **0 referințe în src/** → **DEAD KEYS**
- ❌ **React Query / SWR cache**: NU instalate
- ❌ Edge cache custom: niciun `revalidate` global setat

---

## 14. Rate limiting

`src/lib/rateLimiter.ts` (cod custom):
- Strategie: **sliding window in-memory**, per-proces (NU distribuit)
- Vizează doar TripAdvisor RapidAPI
- Limită: **500 cereri / 24h** (cap de siguranță, nu cotă comercială — tier Pro permite ~10k/lună)
- Funcții: `canMakeRapidApiCall()`, `recordRapidApiCall()`
- **Per IP**: ❌ NU
- **Per user**: ❌ NU
- Biblioteci dedicate (`@upstash/ratelimit`, `express-rate-limit`): ❌ NU instalate

---

## 15. AI / LLM

### 15.1 Model AI unic — Groq Llama 3.3 70B Versatile

Verificat prin `grep -rn "llama-\|model: " src/app/api/`:

| Endpoint | Model | Linia | Scop |
|---|---|---|---|
| `/api/ai/plan-trip` (discovery) | `llama-3.3-70b-versatile` | 498 | Itinerar zi-cu-zi pentru top 6 pachete |
| `/api/ai/plan-trip` (variant) | `llama-3.3-70b-versatile` | 772 | Itinerar pentru variantele Economic/Balanced/Premium |
| `/api/ai/visa-check` | `llama-3.3-70b-versatile` | 75 | Cerințe viză (cached 24h) |
| `/api/deals/from/[iata]` | `llama-3.3-70b-versatile` | 419 | Descrieri oferte homepage (top 3) |
| `/api/road-trip/plan` | `llama-3.3-70b-versatile` | 428 | Plan road-trip cu opriri |
| `/api/chat` | `llama-3.3-70b-versatile` | 335 | Chat live conversational cu tool calling |
| `/api/debug/chat-key` | `llama-3.3-70b-versatile` | 24, 46 | Diagnostic chei |

> Toate cele 7 apeluri AI folosesc consistent **un singur model**, **un singur provider**, **o singură cheie** (`GROQ_API_KEY`).

### 15.2 Configurație Groq

- **Endpoint**: `https://api.groq.com/openai/v1/chat/completions` (API OpenAI-compatibil)
- **Headers**: `Authorization: Bearer ${GROQ_API_KEY}`
- **Body**: `{ model, max_tokens, temperature, response_format?, messages, tools? }`
- **JSON output**: garantat prin `response_format: { type: 'json_object' }` la cele 4 endpoint-uri care produc itinerare/JSON structurat
- **Tool calling**: doar `/api/chat` are `tools` array — 3 funcții: `searchFlights`, `searchHotels`, `getCurrentDeals`
- **Temperature**:
  - `0.7` pentru creativitate (plan-trip, deals, road-trip, chat)
  - `0.3` pentru factual (visa-check)
- **max_tokens per endpoint**:
  - `plan-trip`, `deals`: 2500
  - `chat`: 1024
  - `visa-check`: 800
  - `road-trip/plan`: 3500
- **Timeout**: 25s pentru plan-trip, 45s pentru road-trip (via `AbortController`)
- **Free tier Groq**: 30 cereri/minut — suficient pentru un proiect de licență

### 15.3 Alte LLM-uri — verificat prin grep

- ❌ **Anthropic Claude**: zero referințe `claude-` sau `anthropic.com` în cod (migrat la Groq în această sesiune)
- ❌ **OpenAI** (GPT-3.5, GPT-4, GPT-4o): zero referințe `gpt-`
- ❌ **Google Gemini**: zero referințe `gemini-`
- ❌ **Mistral**, **DeepSeek**, **Cohere**: zero referințe

### 15.4 SDK-uri
- ❌ **`groq-sdk`**: NU instalat (apelurile sunt `fetch` direct)
- ❌ **`@anthropic-ai/sdk`**: NU instalat
- ❌ **`@ai-sdk/*`**, **Vercel AI SDK**: NU instalate
- ❌ **`openai`**: NU instalat

### 15.5 De ce Groq Llama 3.3 pentru toate apelurile AI? (decizie arhitecturală)

**Motive concrete:**

1. **Cost zero** — Groq free tier (30 req/min) acoperă confortabil traficul unui proiect de licență
2. **Latență sub o secundă** — față de 2-25s la modele frontier proprietare, ceea ce face UI-ul fluid
3. **JSON output garantat** — parametrul `response_format: { type: 'json_object' }` din API-ul Groq forțează răspuns JSON valid, eliminând riscul de „spargere format"
4. **Tool calling robust** — necesar pentru agentul live (3 funcții callable)
5. **Open-source** — model Llama 3.3 dezvoltat de Meta, generație curentă (decembrie 2024)
6. **Un singur provider** — simplifică gestionarea cheilor (o singură variabilă de mediu: `GROQ_API_KEY`)

**Mitigare risc calitate**: pentru cazurile rare în care Llama 3.3 returnează JSON corupt sau conținut irelevant, există un sistem complet de fallback content cu template-uri locale per oraș (`src/lib/fallbackContent.ts` — ~30 destinații populare cu atracții, restaurante și descrieri scrise manual). Utilizatorul niciodată nu vede o pagină goală sau o eroare 500 — în cel mai rău caz, primește un itinerar mai generic.

**Pentru prezentare la licență**: ai un argument tehnic clar — „am ales un singur model AI de generație curentă, eficient ca cost și latență, cu garanție JSON, și am construit un sistem de fallback determinist ca plasă de siguranță". Demonstrează decizii inginerești, nu „am pus AI peste tot ce s-a putut".

---

## 16. API-uri externe (date)

### 16.1 TripAdvisor (prin RapidAPI)
- **Fișier client**: `src/lib/tripadvisor-client.ts`
- **Base URL**: `https://tripadvisor16.p.rapidapi.com`
- **Cheie**: `RAPIDAPI_KEY` (server-only, folosit în 7 fișiere)
- **Funcții exportate**: `searchFlights`, `getFlightFilters`, `searchHotelsByCity`, `searchHotelsByGeoId`, `getHotelDetails`, `searchCars`, `searchRestaurants`, `searchAttractions`, `getGeoIdByQuery`, `getGeoIdForCity`, `searchLocations`, `searchFlightInspirations`

### 16.2 Google Maps Platform
- **Fișier client**: `src/lib/google-maps-client.ts`
- **Builder URL embed**: `src/components/RouteMap/buildEmbedUrl.ts`
- **Chei**: `GOOGLE_MAPS_SERVER_API_KEY` (3 fișiere), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (4 fișiere), `GOOGLE_MAPS_API_KEY` (5 fișiere, fallback legacy)
- Sub-API-uri active: vezi §8.2

### 16.3 Open-Meteo
- **Fișier client**: `src/lib/weatherService.ts`
- Fără cheie API (gratuit)
- Orizont max: 16 zile (clamp explicit pe `endDate`)

### 16.4 open.er-api.com (curs valutar)
- **Fișier client**: `src/lib/currencyService.ts`
- Endpoint: `https://open.er-api.com/v6/latest/EUR`
- Cache localStorage 1h
- Perechi: EUR, USD, RON
- Fallback snapshot hard-coded

### 16.5 Pexels (video destinații)
- **Fișier client**: `src/lib/pexelsVideos.ts`
- Base URL: `https://api.pexels.com/videos`
- **Cheie**: `PEXELS_API_KEY` (folosit în 1 fișier)
- ⚠️ **`PEXELS_API_KEY` NU este declarat în `.env.example`** — lipsește documentația

### 16.6 Unsplash (imagini destinații)
- **Fișiere**: `src/lib/cityImages.ts`, `src/lib/hotelImages.ts`, `/api/unsplash`, `/api/attractions/images`
- **Cheie**: `UNSPLASH_ACCESS_KEY` (folosit în 2 fișiere)
- Folosește și ID-uri publice directe (nu necesită cheie pentru cazul de bază)

### 16.7 Furnizori NEFOLOSIȚI (verificat prin grep imports + URL-uri)
- ❌ **Skyscanner API**
- ❌ **Booking.com API**
- ❌ **Expedia / Hotels.com API**
- ❌ **Kiwi.com Tequila API**
- ❌ **Amadeus** (eliminat în migrarea recentă, vezi commit `cf2632f`)
- ❌ **OpenWeather** (înlocuit cu Open-Meteo)
- ❌ **WeatherAPI**, **AccuWeather**

---

## 17. Hosting & infrastructură

- **Hosting aplicație**: Vercel (`travel-twin.vercel.app`)
- **Hosting DB**: Supabase Cloud (Free tier)
- **CDN**: Vercel Edge Network (default, automat)
- **Tip funcții**: **Serverless** (Node 20 LTS) — nicio rută API nu declară `export const runtime = 'edge'`
- **`vercel.json`**: ❌ absent — totul pe default
- **`maxDuration` override**: NU este declarat în nicio rută API (limita default 60s pe planul Hobby)
- **Region**: default Vercel (auto-routed)

---

## 18. Build tooling

| Unealtă | Versiune | Status |
|---|---|---|
| **Turbopack** | inclus în Next.js 16.1.6 | ✅ ACTIV (default în Next.js 16) |
| **Webpack** | nu se folosește explicit | ❌ INACTIV (înlocuit de Turbopack) |
| **SWC** | inclus în Next.js | ✅ ACTIV (compiler) |
| **PostCSS** | prin `@tailwindcss/postcss ^4` | ✅ ACTIV |
| **ESLint** | `^9` (flat config) | ✅ ACTIV |
| **eslint-config-next** | `16.1.6` | ✅ ACTIV (core-web-vitals + typescript rulesets) |
| **Prettier** | NU instalat | ❌ ABSENT |
| **Stylelint** | NU instalat | ❌ ABSENT |
| **Babel** | nu e configurat manual (SWC îl înlocuiește) | — |

---

## 19. Testing

| Framework | Status |
|---|:---:|
| Jest | ❌ NU instalat |
| Vitest | ❌ NU instalat |
| Playwright | ❌ NU instalat |
| Cypress | ❌ NU instalat |
| @testing-library/react | ❌ NU instalat |
| MSW (Mock Service Worker) | ❌ NU instalat |

- **Fișiere `*.test.*` sau `*.spec.*`**: 0 găsite
- **Director `__tests__`**: 0
- **Acoperire de cod**: 0%

---

## 20. CI / CD

| Element | Status |
|---|:---:|
| `.github/workflows/` (GitHub Actions) | ❌ NU există |
| `Dockerfile` | ❌ NU există |
| `.gitlab-ci.yml`, `circleci`, `bitbucket-pipelines.yml` | ❌ NU există |
| Vercel auto-deploy din `main` | ✅ ACTIV (la fiecare `git push`) |
| Husky pre-commit hooks | ❌ NU instalat |
| `lint-staged` | ❌ NU instalat |
| Commitlint | ❌ NU instalat |

**Disciplină manuală** documentată în `.claude/CLAUDE.md`: `npx tsc --noEmit` înainte de fiecare commit (regulă auto-push).

---

## 21. Securitate

### 21.1 Implementări active
- **Cookies httpOnly** (JWT Supabase managed) — protejează față de XSS
- **Row Level Security** PostgreSQL pe tabelele user (`profiles`, `favorites`, `saved_trips`)
- **CHECK constraints** la nivel DB (`favorites.item_type`, `saved_trips.status`)
- **Server-only secrets** — toate cheile API (Groq, RapidAPI, Google server, Pexels, Unsplash) sunt server-only, accesate doar din `src/app/api/*` și `src/lib/*`
- **Rate limiting** (vezi §14)
- **Anti-flash dark mode script** inline în `<head>` — previne flicker la load

### 21.2 NU sunt configurate
- **CSP (Content Security Policy)**: niciun header `Content-Security-Policy` setat (default Next.js)
- **Helmet** sau echivalent: ❌ NU instalat
- **CORS custom**: ❌ nesetat (default same-origin)
- **HSTS** explicit: ❌ nesetat în cod (Vercel îl adaugă automat)
- **Input sanitization**: validare manuală per route, fără bibliotecă (`dompurify`, `validator.js` etc.) instalată

---

## 22. Observability

| Tool | Status |
|---|:---:|
| **Sentry** (`@sentry/nextjs`) | ❌ NU instalat. `SENTRY_DSN` și `SENTRY_AUTH_TOKEN` declarate în `.env.example` dar **0 referințe în src/** → **DEAD KEYS** |
| **LogRocket** | ❌ NU instalat |
| **Datadog**, **New Relic** | ❌ NU instalate |
| **OpenTelemetry** | ❌ NU instalat |
| **Vercel Analytics** | ❌ NU instalat (`@vercel/analytics`) |
| **Vercel Speed Insights** | ❌ NU instalat |
| **Logger custom** (Pino, Winston) | ❌ NU instalat |
| **`console.*`** | folosit în 33 fișiere (logging brut) |

---

## 23. Email

| Furnizor | Status |
|---|:---:|
| **Resend** | ❌ `resend` NU instalat. `RESEND_API_KEY` în `.env.example` dar **0 referințe în src/** → **DEAD KEY** |
| **SendGrid** | ❌ NU instalat |
| **Nodemailer** | ❌ NU instalat |
| **Mailgun**, **Postmark** | ❌ NU instalate |
| **AWS SES** | ❌ NU instalat |

**Concluzie**: aplicația NU trimite email-uri în prezent.

---

## 24. Plăți

| Furnizor | Status |
|---|:---:|
| **Stripe** | ❌ `stripe` și `@stripe/stripe-js` NU instalate |
| **PayPal** | ❌ NU instalat |
| **Lemon Squeezy**, **Paddle** | ❌ NU instalate |
| **Mollie**, **Adyen** | ❌ NU instalate |

**Implementare actuală**: simulare de checkout la `src/app/[locale]/(main)/booking/simulate/page.tsx` — validare card test `4242 4242 4242 4242`, fără apel real către un PSP.

---

## 25. Push notifications

| Element | Status |
|---|:---:|
| **Web Push** (`web-push` npm) | ❌ NU instalat |
| **Service Worker** (`public/sw.js`) | ❌ NU există |
| **Firebase Cloud Messaging** | ❌ NU instalat |
| **OneSignal** | ❌ NU instalat |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ❌ Declarate în `.env.example`, **0 referințe în src/** → **DEAD KEYS** |

---

## 26. Variabile de mediu — analiza completă

### 26.1 Active (cu referințe în `src/`)

| Variabilă | Referințe | Categorie | Status în `.env.example` |
|---|:---:|---|---|
| `RAPIDAPI_KEY` | 7 fișiere | server-secret | ✅ documentat |
| `GROQ_API_KEY` | 7 fișiere (TOATE apelurile AI) | server-secret | ✅ documentat |
| `GOOGLE_MAPS_API_KEY` | 5 fișiere | server-secret (fallback legacy) | ❌ NU în `.env.example` (suficient `GOOGLE_MAPS_SERVER_API_KEY`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 4 fișiere | public | ✅ documentat |
| `GOOGLE_MAPS_SERVER_API_KEY` | 3 fișiere | server-secret | ✅ documentat |
| `NEXT_PUBLIC_SUPABASE_URL` | 2 fișiere | public | ✅ documentat |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 2 fișiere | public | ✅ documentat |
| `UNSPLASH_ACCESS_KEY` | 2 fișiere | server-secret | ✅ documentat |
| `PEXELS_API_KEY` | 1 fișier | server-secret | ✅ documentat (adăugat în această curățare) |

### 26.2 DEAD KEYS — ȘTERSE complet din `.env.example`

În urma curățării de pe `2026-06-11`, următoarele **13 variabile** au fost eliminate din `.env.example` (toate aveau **0 referințe** în întreg repository-ul — `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.sql`):

| Variabilă | Motiv ștergere |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 0 referințe; reactivabilă oricând din Supabase Dashboard dacă apar cron jobs sau scripts admin |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth gestionat exclusiv de Supabase Dashboard, nu de cod |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook OAuth gestionat exclusiv de Supabase Dashboard, nu de cod |
| `MAPBOX_TOKEN` | Mapbox neinstalat (pachet `mapbox-gl` lipsește) |
| `CRON_SECRET` | Nicio rută `/api/cron/*` implementată |
| `RESEND_API_KEY` | Pachet `resend` neinstalat — email neimplementat |
| `SENTRY_DSN` | Pachet `@sentry/nextjs` neinstalat |
| `SENTRY_AUTH_TOKEN` | Idem |
| `VAPID_PUBLIC_KEY` | Web Push neimplementat (pachet `web-push` absent, fără `public/sw.js`) |
| `VAPID_PRIVATE_KEY` | Idem |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Idem |
| `UPSTASH_REDIS_REST_URL` | Pachet `@upstash/redis` neinstalat — rate-limiting-ul actual e in-memory |
| `UPSTASH_REDIS_REST_TOKEN` | Idem |

> **Reversibilitate**: dacă vreuna dintre aceste capabilități se va implementa în viitor, cheile pot fi reintroduse în `.env.example` în câteva secunde. Documentația despre cum se obține fiecare a rămas în istoricul git (commit anterior).

---

## 27. DEAD CODE — sumar global

### 27.1 Variabile de mediu moarte (vezi §26.2)
**13 variabile** declarate în `.env.example`, neutilizate în `src/`.

### 27.2 Pachete npm fără import-uri în cod
Toate cele 15 deps runtime și 8 dev din `package.json` au fost verificate cu grep — **toate sunt importate cel puțin o dată**. Niciun unused package.

### 27.3 Funcții exportate fără apelatori
Verificat în această sesiune și șters la commit `545c56d`:
- ✅ **`midpoint()`** din `src/lib/google-maps-client.ts` — ȘTERS

### 27.4 Cod „rezervat pentru viitor" comentat
- `src/app/[locale]/(main)/booking/simulate/page.tsx` — flux de plată simulat (lipsă integrare reală cu Stripe/PayPal)
- `/api/cron/*` — neimplementat (CRON_SECRET dead key îl reflectă)

---

## 28. Anexă — `package.json` complet (versiuni exacte)

### Runtime (`dependencies`, 15 pachete)

| Pachet | Versiune declarată |
|---|---|
| `@supabase/ssr` | `^0.8.0` |
| `@supabase/supabase-js` | `^2.95.3` |
| `@types/leaflet` | `^1.9.21` |
| `clsx` | `^2.1.1` |
| `framer-motion` | `^12.34.0` |
| `leaflet` | `^1.9.4` |
| `lucide-react` | `^0.564.0` |
| `next` | `16.1.6` |
| `next-intl` | `^4.11.2` |
| `next-themes` | `^0.4.6` |
| `react` | `19.2.3` |
| `react-dom` | `19.2.3` |
| `react-leaflet` | `^5.0.0` |
| `tailwind-merge` | `^3.4.1` |
| `zustand` | `^5.0.11` |

### Dev (`devDependencies`, 8 pachete)

| Pachet | Versiune declarată |
|---|---|
| `@tailwindcss/postcss` | `^4` |
| `@types/node` | `^20` |
| `@types/react` | `^19` |
| `@types/react-dom` | `^19` |
| `eslint` | `^9` |
| `eslint-config-next` | `16.1.6` |
| `tailwindcss` | `^4` |
| `typescript` | `^5` |

**Total**: 23 pachete declarate.

---

## 29. Recomandări de curățare

### Aplicate deja (în această sesiune)
1. ✅ **Șterse cele 13 DEAD KEYS** din `.env.example` (vezi §26.2)
2. ✅ **Adăugată `PEXELS_API_KEY`** în `.env.example` (era folosită în cod dar nedocumentată)
3. ✅ **Eliminată funcția moartă `midpoint()`** din `src/lib/google-maps-client.ts` (commit `545c56d`)

### Aplicate deja (continuare)
4. ✅ **Migrat toate cele 4 endpoint-uri Claude la Groq Llama 3.3 70B**:
   - `src/app/api/ai/plan-trip/route.ts` (2 apeluri)
   - `src/app/api/ai/visa-check/route.ts`
   - `src/app/api/deals/from/[iata]/route.ts`
   - `src/app/api/road-trip/plan/route.ts`

   Acum există un singur model AI (`llama-3.3-70b-versatile`), un singur provider (Groq) și o singură cheie (`GROQ_API_KEY`). Eliminat complet `ANTHROPIC_API_KEY` din `.env.example` și documentație. Costul AI = zero (Groq free tier).

### Rămase pentru utilizator (opțional)
5. **Curăță `ANTHROPIC_API_KEY` de pe Vercel Dashboard** — dacă a fost setată anterior, șterge-o (n-are efect funcțional, doar ocupă spațiu).
6. **Curăță variabilele DEAD KEYS de pe Vercel Dashboard** — dacă oricare dintre cele 13 chei DEAD din §26.2 sunt setate, șterge-le și de acolo.

---

*Document generat din analiză directă a codului sursă pe commit-ul `545c56d`. Fiecare claim este verificabil cu o singură comandă `grep` sau `cat`. Fără limbaj de marketing. Fără presupuneri.*
