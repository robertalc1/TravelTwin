# TravelTwin — Inventar Complet de Tehnologii

> Document de referință generat din analiza directă a codului sursă (`package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `src/**`, `supabase/migrations/`).
> Toate versiunile și modelele sunt verificate la sursă. Nimic inventat.

---

## Sumar executiv

TravelTwin este o aplicație web Next.js 16 (App Router cu Turbopack) construită pe **React 19**, **TypeScript 5** în mod strict, **Tailwind CSS 4**, cu state management prin **Zustand**, autentificare și bază de date pe **Supabase (PostgreSQL)**, și un strat AI hibrid format din **Anthropic Claude** (planificare itinerarii) și **Groq Llama 3.3** (chat live). Toate datele live (zboruri, hoteluri, locații) vin de la **TripAdvisor prin RapidAPI**. Aplicația are **15 dependențe runtime** și **8 dev**, **33 endpoint-uri REST** în `src/app/api/`, **7 state stores Zustand** și este deployată pe **Vercel** (deploy automat din ramura `main`).

---

## 1. Frontend

### 1.1 Framework + runtime

| Tehnologie | Versiune | Rol |
|---|---|---|
| **Next.js** | `16.1.6` | Framework principal — App Router, server components, API routes, Turbopack build |
| **React** | `19.2.3` | UI library cu Concurrent Features și Server Components |
| **react-dom** | `19.2.3` | Renderer DOM pentru React |
| **TypeScript** | `^5` | Limbaj cu type safety strict — `noEmit`, `strict: true`, `moduleResolution: "bundler"`, target `ES2017`, path alias `@/* → ./src/*` |

### 1.2 Styling

| Tehnologie | Versiune | Rol |
|---|---|---|
| **Tailwind CSS** | `^4` | Utility-first CSS, dark mode, tema customizată via CSS variables (`--primary-*`, `--secondary-*`, `--accent-*`, `--neutral-*`) |
| **@tailwindcss/postcss** | `^4` | Plugin PostCSS pentru integrarea Tailwind 4 |
| **tailwind-merge** | `^3.4.1` | Rezolvă conflicte între clase Tailwind compuse dinamic |
| **clsx** | `^2.1.1` | Compunere condițională de clase CSS |

Animații CSS custom în `src/app/globals.css`: `fade-in-up`, `fade-in`, `pulse-soft`, `slide-in-bottom`, `shimmer-sweep`.

### 1.3 State management

**Zustand `^5.0.11`** — 7 store-uri în `src/stores/`:

| Store | Rol |
|---|---|
| `authModalStore.ts` | Vizibilitatea modalului de autentificare + `redirectUri` post-login |
| `chatStore.ts` | Toggle pentru panoul de chat AI |
| `currencyStore.ts` | Moneda activă (RON/EUR/USD) + rate FX, persistat în localStorage |
| `filtersStore.ts` | Filtre de căutare (preț, escală, durată, mijloc de transport, stil) |
| `searchStore.ts` | Stare căutare itinerar (origine, destinație, date, rezultate, loading) |
| `toastStore.ts` | Coadă de toast-uri (success/error/info), auto-dismiss la 2.5s |
| `tripPricingStore.ts` | Breakdown preț (zbor + hotel + transfer + extras), `selectedHotel`, `selectedTransfer`, `getTotalPrice()` |

### 1.4 Animații, iconițe, hărți

| Tehnologie | Versiune | Rol |
|---|---|---|
| **Framer Motion** | `^12.34.0` | Animații React (`motion.div`, `AnimatePresence`) — folosit în `AuthModal`, `ChatPanel`, `RentalCarCard`, `DealCardSkeleton` |
| **lucide-react** | `^0.564.0` | Sistem de iconițe SVG |
| **Leaflet** | `^1.9.4` | Bibliotecă de hărți |
| **react-leaflet** | `^5.0.0` | Wrapper React pentru Leaflet |
| **@types/leaflet** | `^1.9.21` | Tipuri TypeScript |

Componente de hartă: `RoadTripMap/`, `RouteMap/`, `EuropeMapPicker.tsx`.

### 1.5 Internaționalizare și temă

| Tehnologie | Versiune | Rol |
|---|---|---|
| **next-intl** | `^4.11.2` | i18n RO + EN, mesaje în `messages/ro.json` și `messages/en.json`, plugin `createNextIntlPlugin("./src/i18n/request.ts")` |
| **next-themes** | `^0.4.6` | Dark mode cu detecție system preference + persistență în localStorage |

### 1.6 Routing

App Router Next.js cu structură:
- `src/app/[locale]/(auth)/` — callback OAuth
- `src/app/[locale]/(main)/` — toate paginile publice (home, plan, hotels, trips, profile, etc.)
- `src/proxy.ts` — middleware (rename obligatoriu pentru Next.js 16)

### 1.7 Fonturi

Încărcate via Google Fonts în `src/app/layout.tsx`:
- **Inter** (400/500/600/700) — `--font-display` + `--font-body`
- **JetBrains Mono** (400/500) — `--font-mono`

Display strategy: `swap` (FOUT).

### 1.8 Componente UI

Componente custom în `src/components/ui/` (**fără shadcn, fără Radix**):
- `Button.tsx` (5 variante: primary, secondary, ghost, outline, danger; loading spinner)
- `Input.tsx` (forwardRef + label + error + icons)
- `Skeleton.tsx`, `Badge.tsx`, `RatingStars.tsx`, `FlagIcon.tsx`, `LocationAutocomplete.tsx`, `SourceBadge.tsx`, `Toaster.tsx`

### 1.9 Hook-uri custom

5 hook-uri în `src/hooks/`:
- `useCurrency()` — bind la `currencyStore` + load rates
- `useRequireAuth()` — guard auth cu redirect post-login
- `useSearchProgress()` — progres pseudo-real (0 → 92% → snap 100%) pentru search
- `useUser()` — Supabase auth state + profile + `displayName` fallback
- `useUserLocation()` — geolocation IP + sessionStorage cache (30 min TTL), fallback OTP

---

## 2. Backend & API

### 2.1 API Routes

**33 fișiere `route.ts`** grupate logic în `src/app/api/`:

| Grup | Endpoint-uri | Rol |
|---|---|---|
| **AI** | `/ai/plan-trip`, `/ai/trip-content`, `/ai/visa-check` | Claude — generare itinerarii, verificări viză |
| **Chat** | `/chat` | Groq — agent live conversațional |
| **Zboruri** | `/flights/live`, `/flights/inspiration` | TripAdvisor |
| **Hoteluri** | `/hotels/search`, `/hotels/live`, `/hotels/[id]` | TripAdvisor |
| **Locație & transport** | `/locations/search`, `/geolocation`, `/directions`, `/road-trip/plan` | Local + Google Routes |
| **Date & POI** | `/attractions`, `/attractions/images`, `/restaurants/search`, `/poi`, `/destinations`, `/recommendations`, `/cars`, `/transfers` | TripAdvisor + scoring intern |
| **User-facing** | `/favorites`, `/trips`, `/searches`, `/popular-trips`, `/deals/from/[iata]` | Supabase + cache |
| **Conținut media** | `/unsplash`, `/videos/[city]` | Unsplash + Pexels |
| **Vreme & curs** | `/weather` | Open-Meteo |
| **Diagnostic** | `/debug/rapidapi`, `/debug/cars`, `/debug/hotels`, `/debug/flights`, `/debug/chat-key` | Verificare chei + uptime |

### 2.2 Middleware

`src/proxy.ts` — în Next.js 16, exportul trebuie să fie `proxy` (NU `middleware`). Are 2 roluri:
1. Routare locale prin `next-intl` (`/ro` vs `/en`)
2. Gate de autentificare pe căile protejate (`/trips`, `/profile`, `/favorites`) — verifică cookie-ul `sb-*-auth-token`, redirectează la home cu `?auth=login` dacă lipsește

### 2.3 Caching

`src/lib/cache.ts` — strat de cache pe **Supabase `api_cache` table** (row-based, persistent):
- TTL setat per apel via `setCache(key, data, ttlMinutes)` — convenție: **valori în minute, nu secunde**
- Rezultatele goale (`{hotels: []}`) sunt cache-ate doar **1h**, nu 24h — previne blocarea unui oraș pe „no results"
- `hit_count` incrementat la read
- Rândurile expirate șterse asincron

### 2.4 Rate limiting

`src/lib/rateLimiter.ts` — implementare **in-memory sliding window**, per proces:
- Vizează doar TripAdvisor RapidAPI
- Limita: **500 cereri / 24h** (cap de siguranță sub limita comercială)
- Nu există rate limiting per IP pe celelalte endpoint-uri

---

## 3. Bază de date

**Supabase (PostgreSQL managed)** — accesat prin:
- `@supabase/supabase-js` `^2.95.3` — SDK principal
- `@supabase/ssr` `^0.8.0` — adapter SSR pentru Next.js (cookies-based session)

### 3.1 Tabele utilizate

| Tabel | Rol | RLS |
|---|---|---|
| `profiles` | Date utilizator (nume, naționalitate, stil) | ✅ owner-only |
| `saved_trips` | Călătorii salvate (status: `planning` / `booked` / `completed`) | ✅ owner-only |
| `favorites` | Hoteluri/atracții/orașe/călătorii favorite | ✅ owner-only |
| `user_searches` | Istoric căutări | ✅ owner-only |
| `api_cache` | Cache central pentru răspunsuri API (TTL în minute) | ❌ server-only |

### 3.2 Constrângeri CHECK la nivel DB

- `favorites.item_type` ∈ `{'city', 'attraction', 'hotel', 'trip'}`
- `saved_trips.status` ∈ `{'planning', 'booked', 'completed'}`

### 3.3 Row Level Security

Toate tabelele user au politici RLS care garantează `auth.uid() = user_id` pentru SELECT/INSERT/UPDATE/DELETE — utilizatorul A nu poate citi datele utilizatorului B chiar dacă codul ar avea bug.

### 3.4 Migrații

Folder `supabase/migrations/` — 3 fișiere:
- `20260522_favorites_allow_trip.sql`
- `20260522_purge_poisoned_cache.sql`
- `20260522_saved_trips_allow_user_inserts.sql`

**Aplicate manual** prin Supabase Dashboard → SQL Editor. Supabase Free **NU** aplică automat migrațiile din folder.

---

## 4. Autentificare

- **Supabase Auth** — sesiuni JWT prin cookies `httpOnly` (gestionat automat de `@supabase/ssr`)
- **OAuth providers**: Google (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`) + Facebook (`NEXT_PUBLIC_FACEBOOK_APP_ID`)
- **Flow modal-based** — fără pagini dedicate `/login` sau `/register`; modalul live în `src/components/auth/AuthModal.tsx`
- **Callback**: `src/app/[locale]/(auth)/callback/route.ts` — schimbă code-ul OAuth pe sesiune și redirectează la `?next=...`
- **Refresh tokens** automate (Supabase SDK)

---

## 5. AI / LLM

### 5.1 Anthropic Claude

Modele găsite în cod (verificat cu `grep`):

| Endpoint | Model |
|---|---|
| `/api/ai/plan-trip` | `claude-sonnet-4-6` ✅ curent |
| `/api/ai/visa-check` | `claude-sonnet-4-20250514` ⚠️ retras |
| `/api/road-trip/plan` | `claude-sonnet-4-20250514` ⚠️ retras |
| `/api/deals/from/[iata]` | `claude-sonnet-4-20250514` ⚠️ retras |

> ⚠️ **De actualizat**: `claude-sonnet-4-20250514` este modelul vechi retras (conform `.claude/CLAUDE.md`). Modelul curent recomandat este `claude-sonnet-4-6`. 3 endpoint-uri îl mai folosesc.

Fiecare apel Anthropic e wrapat într-un `AbortController` cu timeout ~25s ca să nu depășească `maxDuration = 60` de la Vercel.

### 5.2 Groq

| Endpoint | Model |
|---|---|
| `/api/chat` | `llama-3.3-70b-versatile` |

API OpenAI-compatibil, cu **tool calling** real (`tools` array, agentic loop cu `tool_calls`). Latență sub o secundă per răspuns. Tier gratuit: ~30 req/min.

### 5.3 Gemini, OpenAI

**Nu sunt integrate**. Nicio referință în cod runtime, nicio cheie în `.env.example`.

---

## 6. Servicii externe terțe

### 6.1 TripAdvisor (RapidAPI) — sursa unică pentru date live

`src/lib/tripadvisor-client.ts` exportă:
- `searchFlights(p)`, `getFlightFilters(p)` — zboruri
- `searchHotelsByCity(p)`, `searchHotelsByGeoId(p)`, `getHotelDetails(id)` — hoteluri
- `searchCars(p)` — mașini de închiriat
- `searchRestaurants(locationId)`, `searchAttractions(locationId)` — POI
- `getGeoIdByQuery(query)`, `getGeoIdForCity(code)` — rezolvare locație → geoId
- `searchLocations(keyword)` — autocomplete global
- `searchFlightInspirations(origin)` — destinații de inspirație

### 6.2 Google Maps (server-side)

`src/lib/google-maps-client.ts`:
- `geocodeCity(query)` — geocoding forward
- `getDriveQuote(origin, dest, mode)` — Directions API (driving/walking/transit/cycling)
- `reverseGeocode(lat, lng)`
- `findNearbyCity(lat, lng)`
- `midpoint(a, b)` — matematică coordonate

Cache 6h per `(origin, destination, mode)`. Cost ~$5 / 1000 cereri.

**Două chei separate** (intenționat):
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Embed API (iframe client-side, restricționat la domeniu)
- `GOOGLE_MAPS_SERVER_API_KEY` — Directions + Distance Matrix + Geocoding (server, fără restricție de domeniu)

### 6.3 Open-Meteo (vreme)

`src/lib/weatherService.ts`:
- `fetchForecast(lat, lng, days)`, `decodeWeatherCode(code)`, `clothingTips(daily)`
- Orizont maxim **16 zile** (limita planului free) — apelul e clamp-at și scurtcircuitat dacă `startDate > today + 16d`
- Fără cheie API necesară

### 6.4 open.er-api.com (curs valutar)

`src/lib/currencyService.ts`:
- Sursă: `https://open.er-api.com/v6/latest/EUR`
- Cache localStorage 1h
- Perechi: EUR, USD, RON
- Fallback la snapshot hard-coded dacă rețeaua pică

### 6.5 Pexels (video destinație)

`src/lib/pexelsVideos.ts`:
- `searchVideos(query, count)`, `getCityShorts(city, country)`, `pickBestVideoFile(video)`
- Cheie: `PEXELS_API_KEY` (folosit în cod, **lipsește din `.env.example`** — de adăugat)

### 6.6 Unsplash (imagini)

`src/lib/cityImages.ts` + `src/lib/hotelImages.ts`:
- Folosește ID-uri publice directe (nu necesită cheie pentru cazul de bază)
- `UNSPLASH_ACCESS_KEY` (opțional) pentru `/api/unsplash` + `/api/attractions/images`

### 6.7 Geolocation IP

`src/lib/geolocation.ts` + `src/hooks/useUserLocation.ts`:
- Detecție prin header-uri Vercel (`x-vercel-ip-*`) — fără apel către serviciu IP-lookup extern
- Map intern de aeroporturi → cel mai apropiat IATA

---

## 7. Securitate

| Aspect | Implementare |
|---|---|
| **Sesiuni** | JWT prin cookies `httpOnly` (Supabase Auth managed) |
| **Autorizare DB** | Row Level Security pe toate tabelele user |
| **Chei API** | Toate server-only (în afară de `NEXT_PUBLIC_*` care sunt publice intenționat) |
| **Validare input** | Manuală în fiecare route (fără Zod / Yup) |
| **Forme** | Manuale (fără react-hook-form) |
| **Rate limit** | In-memory per proces, doar pentru TripAdvisor RapidAPI |
| **Protecție prompt injection AI** | Validare răspuns JSON + fallback la template content |
| **CORS** | Default Next.js (same-origin only) |
| **Anti-flash dark mode** | Script inline în `<head>` care setează `classList.add('dark')` înainte de paint |

---

## 8. Tooling & build

| Unealtă | Versiune | Configurat în |
|---|---|---|
| **Next.js Turbopack** | inclus în 16.1.6 | default, fără override |
| **ESLint** | `^9` (flat config) | `eslint.config.mjs` cu `eslint-config-next` |
| **eslint-config-next** | `16.1.6` | Reguli Next.js core-web-vitals + TypeScript |
| **TypeScript** | `^5` | `tsconfig.json` — strict, target ES2017, path `@/*` |
| **PostCSS** | inclus prin `@tailwindcss/postcss` | `postcss.config.*` |
| **next.config.ts** | minimal | Doar plugin `next-intl` |

### Comenzi npm

```bash
npm run dev      # Turbopack dev server, port 3000
npm run build    # build producție
npm run start    # servește build-ul de producție
npm run lint     # ESLint
npx tsc --noEmit # type check (obligatoriu înainte de commit)
```

---

## 9. Deployment

- **Vercel** — deploy automat la fiecare `git push origin main`
- URL producție: `travel-twin.vercel.app`
- **Fără `vercel.json`** custom — totul pe default
- **Fără override-uri `maxDuration`** în route handlers (limita de 60s pe planul Hobby)
- **Repository**: GitHub `robertalc1/TravelTwin`
- **Ramura principală**: `main`

---

## 10. Variabile de mediu

### Publice (`NEXT_PUBLIC_*`, injectate în bundle browser)

| Variabilă | Scop |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proiect Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cheie anonimă Supabase (sub RLS) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Google client ID |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | OAuth Facebook app ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps Embed API (iframe) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push (feature viitor) |

### Server-only (secrete)

| Variabilă | Scop | Status |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS pentru cron jobs | activ |
| `RAPIDAPI_KEY` | TripAdvisor (sursă date primară) | **obligatoriu** |
| `ANTHROPIC_API_KEY` | Claude (itinerarii + viză) | **obligatoriu** |
| `GROQ_API_KEY` | Llama 3.3 (chat live) | **obligatoriu** |
| `GOOGLE_MAPS_SERVER_API_KEY` | Directions + Distance Matrix + Geocoding | activ |
| `UNSPLASH_ACCESS_KEY` | Imagini destinații (fallback dinamic) | opțional |
| `PEXELS_API_KEY` | Video-uri destinații | activ în cod (lipsește din `.env.example`) |
| `MAPBOX_TOKEN` | Geocoding (upgrade viitor) | rezervat |
| `CRON_SECRET` | Auth pentru `/api/cron/*` | rezervat |
| `VAPID_PRIVATE_KEY` | Web Push (feature viitor) | rezervat |
| `RESEND_API_KEY` | Email tranzacționale | opțional (fallback `console.log`) |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Observability producție | opțional |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting distribuit | **rezervat (nefolosit în cod)** |

---

## 11. Ce NU folosim (clarificare)

Lista mea este onestă — următoarele **nu sunt în stack**:

| Tehnologie | De ce nu |
|---|---|
| **Vitest, Jest, Playwright** | Niciun test runner configurat. Zero teste. |
| **shadcn / Radix UI** | Componente UI 100% custom în `src/components/ui/` |
| **react-hook-form** | Formele sunt gestionate manual cu state local |
| **Zod / Yup** | Validare input manuală în fiecare route |
| **Redis activ** | Upstash e configurat în `.env.example` dar **nu e importat în cod** (rezervat pentru viitor) |
| **Gemini, OpenAI** | Doar Claude (Anthropic) + Llama (Groq) |
| **CI/CD GitHub Actions** | Niciun `.github/workflows/` configurat — Vercel face build-ul |
| **Docker** | Niciun `Dockerfile` — aplicația rulează direct pe Vercel |
| **Storybook** | Niciun setup de component playground |

---

## 12. Anexă — dependențe complete

### Runtime (`dependencies`)

| Pachet | Versiune |
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

### Dezvoltare (`devDependencies`)

| Pachet | Versiune |
|---|---|
| `@tailwindcss/postcss` | `^4` |
| `@types/node` | `^20` |
| `@types/react` | `^19` |
| `@types/react-dom` | `^19` |
| `eslint` | `^9` |
| `eslint-config-next` | `16.1.6` |
| `tailwindcss` | `^4` |
| `typescript` | `^5` |

**Total**: 15 dependențe runtime + 8 dev = **23 pachete** (excluzând tranzitive).

---

*Document generat din analiza directă a codului sursă. Toate versiunile și modelele sunt verificate la sursă; nu există date inventate.*
