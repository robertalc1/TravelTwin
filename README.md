# TravelTwin — Documentație Tehnică Completă

> Aplicație web AI de planificare călătorii dezvoltată ca lucrare de licență.
> Live demo: **[travel-twin.vercel.app](https://travel-twin.vercel.app)**
> Repository: github.com/robertalc1/TravelTwin

---

## 1. Descriere generală

**TravelTwin** este o platformă web full-stack care automatizează planificarea unei călătorii complete — zbor, cazare, mașină de închiriat, itinerar zi-cu-zi, hărți, vreme — într-un singur flux integrat. Utilizatorul răspunde la câteva întrebări simple (destinație, buget, număr de zile, stil de călătorie) și primește **trei pachete inteligente** (Economic / Balansat / Premium) gata de rezervat, fiecare cu prețuri live și plan detaliat generat de inteligență artificială.

### Problema rezolvată

Planificarea unei vacanțe astăzi este un proces fragmentat: utilizatorul mediu deschide **8 sau mai multe aplicații** (Skyscanner, Booking, Google Maps, TripAdvisor, ChatGPT, OpenWeather, Wise, Notion) și petrece **3-5 ore** comparând opțiuni. Nicio aplicație nu comunică cu cealaltă — datele se copiază manual.

### Soluția propusă

TravelTwin integrează **9 module funcționale** într-o singură interfață, conectează surse de date live (TripAdvisor prin RapidAPI pentru zboruri și hoteluri, Google Routes pentru hărți) și folosește un **motor AI hibrid** (algoritmi clasici + LLM-uri) pentru a genera itinerarii contextuale, personalizate pe baza preferințelor utilizatorului.

### Audiență țintă

Călători digitali din România și Europa care vor să-și planifice rapid o vacanță fără să jongleze între zeci de site-uri. Aplicația include suport nativ pentru piața românească (IATA OTP/CLJ/TSR/IAS/SBZ, lei românești, română completă).

---

## 2. Stack tehnologic

### 2.1 Frontend

| Tehnologie | Versiune | Rol |
|---|---|---|
| **Next.js** | 16.1.6 | Framework React (App Router, Turbopack, SSR) |
| **React** | 19.2.3 | UI library cu Concurrent Features |
| **TypeScript** | 5.x | Type safety strict, fără `any` |
| **Tailwind CSS** | 4.x | Utility-first styling, dark mode |
| **Framer Motion** | 12.34 | Animații fluide, micro-interacțiuni |
| **Zustand** | 5.0.11 | State management global lightweight |
| **next-intl** | 4.11 | Internaționalizare RO/EN |
| **next-themes** | 0.4.6 | Comutare dark/light cu persistență |
| **Lucide React** | 0.564 | Sistem de iconițe SVG |
| **Leaflet + React-Leaflet** | 1.9 / 5.0 | Hărți interactive cu OpenStreetMap |
| **clsx + tailwind-merge** | — | Compunere clase Tailwind |

### 2.2 Backend

| Tehnologie | Rol |
|---|---|
| **Next.js API Routes** | 24 endpoint-uri REST server-side |
| **Supabase** | Autentificare, bază de date, RLS |
| **PostgreSQL** | Bază de date relațională |
| **Row Level Security (RLS)** | Izolare date per utilizator la nivel DB |
| **JWT (httpOnly cookies)** | Sesiuni securizate |
| **Rate Limiting** | Protecție anti-abuz per IP |

### 2.3 Inteligență artificială

| Serviciu | Model | Utilizare |
|---|---|---|
| **Groq Llama 3.3** | llama-3.3-70b-versatile | Toate apelurile AI: itinerarii, verificare viză, conținut destinații, chat live cu tool calling |

### 2.4 Surse de date externe

| API | Funcție | Caching |
|---|---|---|
| **TripAdvisor (RapidAPI)** | Zboruri live, hoteluri reale cu prețuri și recenzii, locații | 30 min – 24h (1h pentru rezultate goale) |
| **Google Routes API** | Rute driving / walking / transit / cycling | 6h |
| **Open-Meteo** | Prognoză meteo (16 zile) | 3h |
| **open.er-api.com** | Curs valutar multi-monedă | 24h |
| **Unsplash + Pexels** | Imagini și video destinații | persistent |
| **OpenStreetMap (Nominatim)** | Geocoding și POI | persistent |
| **IP Geolocation** | Detecție automată oraș utilizator | per sesiune |

### 2.5 Infrastructură

| Serviciu | Rol |
|---|---|
| **Vercel** | Hosting, deploy automat din `main`, Edge Functions |
| **Supabase Cloud** | DB Postgres + Auth + Realtime |
| **GitHub** | Versionare, deploy hook |

---

## 3. Arhitectură

### 3.1 Diagrama de flux

```
┌──────────────────────────────────────────────────────────┐
│                CLIENT · Browser                          │
│   Next.js 16 · React 19 · Tailwind · Dark Mode · RO/EN  │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌──────────────────────────────────────────────────────────┐
│         API LAYER · Next.js API Routes (server-side)     │
│  • 24 endpoint-uri REST                                  │
│  • validare input · rate limiting                        │
│  • cache DB (15-30 min TTL adaptiv)                      │
│  • strategie fallback multi-source                       │
└─────────────────────┬────────────────────────────────────┘
                      │ REST · OAuth2 · SSR
                      ▼
┌──────────────────────────────────────────────────────────┐
│                  SERVICII EXTERNE                        │
│  TripAdvisor · Groq (Llama 3.3) · Google Routes          │
│  Open-Meteo · Supabase Postgres · Unsplash               │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Pattern arhitectural

Aplicația folosește **3 straturi separate**:

1. **Stratul de prezentare (client)** — React în browser, doar UI și state local.
2. **Stratul de servicii (server)** — Next.js API Routes care orchestrează apelurile către serviciile externe, aplică validare, cache și fallback-uri.
3. **Stratul de date (external)** — API-uri terțe + Supabase pentru date persistente.

**Important**: clientul **nu comunică niciodată direct** cu API-urile externe. Toate apelurile trec prin layer-ul intern Next.js, ceea ce:
- protejează cheile API (nu sunt expuse în browser)
- permite cache și deduplicare cereri
- aplică rate limiting per IP
- oferă fallback când un serviciu pică

### 3.3 Motor de planificare (pipeline cu 7 etape)

```
[1] Input (preferințe user)
       ↓
[2] Selector Destinații (algoritm clasic, NU AI)
       ↓
[3] Surse Live (TripAdvisor — zboruri + hoteluri)
       ↓
[4] Cache DB (Supabase, TTL adaptiv)
       ↓
[5] Filtru & Rank (preț + scor combinat)
       ↓
[6] Generator Itinerar (Groq Llama 3.3 70B pe top 6)
       ↓
[7] Pachete (până la 18 oferte sortate)
```

**Decizie arhitecturală cheie**: pasul 2 (filtrarea destinațiilor) folosește un **algoritm clasic determinist**, nu AI. Motive:
- **Reproductibilitate**: același input → același output, fără halucinații
- **Cost zero per cerere**: algoritmii clasici nu consumă tokeni
- **Viteză**: răspunsuri instant, fără latență de model

AI-ul este folosit **doar la pasul 6**, unde aduce valoare reală: generarea de conținut creativ contextual (itinerarii, atracții, restaurante).

---

## 4. Funcționalități principale

### 4.1 Module utilizator (9 module)

#### Planificator inteligent (`/plan`)
Wizard în 6 pași: destinație → date → buget → călători → stil → priorități. Generează trei pachete (Economic / Balansat „Best Match" / Premium) cu zbor + hotel + itinerar AI.

#### Căutare independentă zboruri (`/flights`)
Pagină dedicată cu filtre avansate (preț, durată, escală, oră) și prețuri live de la TripAdvisor.

#### Căutare independentă hoteluri (`/hotels`)
Filtre după check-in, check-out, rating, preț, amenities. Imagini, descrieri, recenzii de la TripAdvisor.

#### Căutare mașini de închiriat (`/cars`)
Filtre după categorie (economic, SUV, premium), buget, transmisie. Link-uri către agregatori reali.

#### Hărți interactive (`/plan/trip/[id]/map`)
Hartă completă per călătorie cu Google Routes (driving / walking / transit / cycling) și OpenStreetMap pentru POI. Suport pentru deep-link `?place=<nume>` care focusează direct pe o atracție.

#### Asistent AI Live (chat)
Buton flotant care deschide un chat conversational. Powered by **Groq + Llama 3.3 70B** pentru latență sub o secundă. Are tool-calling — poate apela API-urile interne pentru date live (preț, disponibilitate). Detectează automat limba și răspunde în limba activă.

#### Dashboard personal (`/profile`, `/trips`, `/favorites`)
- **Trips**: călătorii salvate (status: planning / booked / completed)
- **Favorites**: hoteluri, atracții, orașe, călătorii marcate
- **Reviews**: recenzii lăsate de utilizator
- **Stats**: istoric activitate

#### Trip Sharing
Pentru fiecare călătorie generează un **link public unic** (cu hash anti-coliziune base-36) care poate fi distribuit pe WhatsApp sau printat.

#### Modul de vreme
Prognoză 16 zile prin Open-Meteo (limita planului free). Strip vizual cu temperatură, condiții, precipitații pe fiecare zi a călătoriei.

### 4.2 Modul Road Trip (bonus separat)

Pentru călătorii pe roți: utilizatorul specifică origine-destinație, iar aplicația calculează **același traseu cu 3 mijloace** — mașină, autobuz, tren. Calculează:
- Distanța reală
- Durata și costul exact
- **Opriri peste noapte** pe drumuri lungi (cu hotel + restaurant + vremea la fiecare oprire)
- Feribot calculat automat când se traversează apă

Exemplu real verificabil: **București → Istanbul** (5-11 iunie 2026, 2 călători):
- 🚗 Mașină: 639 km · 8h 52m · 104 €
- 🚌 Autobuz: 599 km · 18h 30m · ~60 €
- 🚆 Tren: 639 km · 5h 49m · 154 €

Funcționează doar în Europa (limita Google Routes pentru transit).

### 4.3 Detalii UX

#### Multi-limbă (RO + EN)
Implementat cu `next-intl`. URL-uri separate `/ro` și `/en`. Switch în header schimbă instant. Detectie automată la prima vizită bazată pe `Accept-Language` din browser.

#### Detecție automată locație
La prima vizită, hook-ul `useUserLocation` identifică orașul după IP, schimbă moneda (RON/EUR/USD) și afișează pe homepage **deal-uri din aeroportul cel mai apropiat**. Pentru un utilizator din București, vede automat zboruri din Otopeni (OTP).

#### Dark Mode
Toate componentele suportă tema întunecată prin clase Tailwind `dark:*`. Preferința e salvată via `next-themes` în localStorage.

#### Responsive design
Mobile-first, breakpoint-uri `sm:` / `md:` / `lg:`. Touch target-uri ≥44px pe mobil. Layout-uri specifice pentru telefon (cards verticale, sticky CTAs).

---

## 5. API Routes (Backend)

24 endpoint-uri REST grupate logic:

### 5.1 Inteligență artificială (`/api/ai/`)
- `plan-trip` — generează pachete cu Groq (Llama 3.3) + TripAdvisor
- `trip-content` — completează detalii itinerar pe destinație
- `visa-check` — verifică cerințe viză (Groq Llama 3.3, cache 24h)
- `/api/chat` — chat conversational live (Groq + tool calling)

### 5.2 Date călătorie
- `/api/flights/live` — TripAdvisor flight search (cache 15 min)
- `/api/flights/inspiration` — cele mai ieftine destinații din origine
- `/api/hotels/live` — TripAdvisor hotel search
- `/api/hotels/search` — TripAdvisor hotel search (cu detalii și amenities)
- `/api/hotels/[id]` — detalii hotel cu poze + amenities
- `/api/cars` — mașini de închiriat
- `/api/transfers` — transfer aeroport-hotel

### 5.3 Locație & rute
- `/api/locations/search` — autocomplete IATA bazat pe `iataMapping.ts` + `commonRoutes.ts`
- `/api/geolocation` — detecție IP → oraș
- `/api/directions` — Google Routes (driving/walking/transit/cycling)
- `/api/road-trip` — calcul rute multimodale road-trip

### 5.4 Conținut & POI
- `/api/attractions` — atracții turistice per destinație
- `/api/restaurants` — restaurante recomandate
- `/api/poi` — puncte de interes generice
- `/api/destinations` — date despre orașe (zone, descrieri)
- `/api/recommendations` — recomandări personalizate

### 5.5 Conținut media
- `/api/unsplash` — fotografii destinații
- `/api/videos` — video-uri Pexels pentru hero secțiuni

### 5.6 User-facing
- `/api/favorites` — GET/POST/DELETE cu whitelist `item_type`
- `/api/trips` — saved trips per utilizator
- `/api/searches` — istoric căutări
- `/api/deals/from/[iata]` — oferte din aeroport (homepage geo)
- `/api/popular-trips` — destinații trending
- `/api/weather` — proxy Open-Meteo

---

## 6. Bază de date (Supabase + PostgreSQL)

### 6.1 Tabele principale

| Tabel | Scop | RLS |
|---|---|---|
| `profiles` | Date utilizator (nume, naționalitate, stil) | ✅ owner-only |
| `saved_trips` | Călătorii salvate (status: planning/booked/completed) | ✅ owner-only |
| `favorites` | Hoteluri/atracții/orașe/călătorii favorite | ✅ owner-only |
| `searches` | Istoric căutări utilizator | ✅ owner-only |
| `reviews` | Recenzii lăsate de utilizator | ✅ owner read-all, write-own |
| `api_cache` | Cache central pentru răspunsuri API (TTL în minute) | ❌ server-only |

### 6.2 Relații (relațional, nu NoSQL)

```
profiles (1) ──< (N) saved_trips
profiles (1) ──< (N) favorites
profiles (1) ──< (N) searches
profiles (1) ──< (N) reviews
```

Toate relațiile sunt **one-to-many** prin foreign key `user_id` care referențiază `auth.users.id`. Nu există relații many-to-many deocamdată (planificat: feature de follow între utilizatori).

### 6.3 Constrângeri CHECK la nivel DB

- `favorites.item_type` ∈ `{'city', 'attraction', 'hotel', 'trip'}`
- `saved_trips.status` ∈ `{'planning', 'booked', 'completed'}`

Aceste constrângeri sunt **aplicate la nivel de bază de date** (nu doar în cod), garantând consistența datelor chiar dacă un bug ajunge în producție.

### 6.4 Row Level Security (RLS)

Toate tabelele user au politici RLS care garantează că **fiecare utilizator vede doar propriile date**, indiferent de bug-uri în cod:

```sql
CREATE POLICY "saved_trips_owner_select"
  ON public.saved_trips
  FOR SELECT
  USING (auth.uid() = user_id);
```

### 6.5 Cache layer (api_cache)

Tabel central pentru caching cu TTL adaptiv:
- Flights live: 15 minute
- Hotels live: 30 minute
- Locations IATA: 24 ore
- Weather: 3 ore
- Empty results: **1 oră** (nu 24h, ca să nu „blocăm" un oraș)

---

## 7. Securitate

### 7.1 Autentificare
- **Supabase Auth** cu Google OAuth, Facebook OAuth, email + parolă
- **JWT cu cookie httpOnly** — protecție XSS
- **Refresh tokens** automate
- Modal-based login (fără pagini dedicate `/login`)

### 7.2 Autorizare
- **Row Level Security** pe toate tabelele user
- Server-side validation prin `authGuard.ts`
- Verificare `auth.uid()` la fiecare query

### 7.3 Protecție abuz
- **Rate limiting** per IP (configurabil per endpoint)
- **Validare input** strictă (Zod-style schemas)
- **Sanitizare** la inserare DB

### 7.4 Protecție chei API
- Toate cheile (RapidAPI/TripAdvisor, Groq, Google) sunt **server-only**
- Niciun apel direct din browser către servicii terțe
- Variabile `NEXT_PUBLIC_*` sunt limitate la URL-uri publice (Supabase)

---

## 8. Internaționalizare (i18n)

### 8.1 Strategie
- **next-intl** ca bibliotecă principală
- Două locale: `ro` (default) și `en`
- URL-uri segregate: `/ro/...` și `/en/...`
- Middleware proxy redirectează `/` → `/ro` sau `/en` în funcție de browser

### 8.2 Fișiere de traduceri
- `messages/ro.json` — română (sursă primară)
- `messages/en.json` — engleză (paralel)
- Structurate pe namespace-uri: `nav`, `home`, `plan`, `trip`, etc.

### 8.3 Conținut dinamic
Itinerariile generate de Groq Llama 3.3 sunt produse direct în limba activă (prompt-ul include `language: 'ro'|'en'`).

---

## 9. Optimizări de performanță

### 9.1 Caching multi-strat
- **Memory cache** în client (React state + Zustand)
- **DB cache** (api_cache table, TTL adaptiv)
- **Vercel CDN** pentru asset-uri statice

### 9.2 Code splitting
- Next.js App Router cu route-level code splitting automat
- `LazyMount.tsx` pentru componente non-critice (sub-fold)

### 9.3 Image optimization
- `next/image` cu format `avif` / `webp` automat
- Lazy loading pentru imagini sub fold
- Sizes responsive cu `sizes` prop

### 9.4 Fallback strategies
Fiecare API extern are fallback:
- Dacă TripAdvisor pică → date din cache sau template content
- Dacă TripAdvisor returnează 0 hoteluri → seed cu hotel din pachet
- Dacă Groq timeout → fallback content static

### 9.5 SessionTimeoutModal
Tab-urile inactive sunt forțate să refresh-uiască după 10 minute, ca să nu consume quota API cu prețuri vechi.

---

## 10. Design URL-uri

URL-urile sunt **auto-explicative și deterministe**. Exemplu:

```
/en/plan/trip/deal-CND-BUD-1779188607565-d0ti/hotel/15125043
```

Fiecare segment are sens:
- `/en` — locale activ
- `/plan/trip/` — modulul AI Planner
- `deal-` — prefix endpoint
- `CND` — IATA Origine (Constanța)
- `BUD` — IATA Destinație (Budapesta)
- `1779188607565` — Unix timestamp generare
- `d0ti` — Hash random base-36 (anti-coliziune)
- `/hotel/15125043` — Sub-rută + ID hotel TripAdvisor

Dacă utilizatorul dă acest link altcuiva, deschide **exact aceeași ofertă** — fără session storage, fără cookies, fără context implicit.

---

## 11. Analiză SWOT

### Puncte tari
- ✅ Pachete complete (zbor + hotel + mașină + itinerar) într-un singur flux
- ✅ Date live reale din surse autoritate (TripAdvisor prin RapidAPI)
- ✅ Agent AI conversational integrat
- ✅ Suport complet RO/EN + geolocation IP automat
- ✅ TypeScript strict, dark mode, mobile responsive
- ✅ Arhitectură server-side cu protecție chei API

### Puncte slabe
- ❌ Rezervarea este **simulată** (test card 4242 4242 4242 4242) — fără plată reală încă
- ❌ Dependență de API-uri externe (cost per request)
- ❌ Fără aplicație mobilă nativă (doar web responsive)
- ❌ Bază de utilizatori limitată (proiect de licență)

### Oportunități
- 🚀 Integrare plăți reale (Stripe / PayPal) → monetizare directă
- 🚀 Parteneriate cu agenții de turism din România
- 🚀 Extindere AI: personalizare ML pe istoric utilizator
- 🚀 Aplicație mobilă (React Native)

### Amenințări
- ⚠️ Competitori cu bugete uriașe (Booking, Google Travel, Tryp.com)
- ⚠️ Schimbări de preț / limite la API-urile externe
- ⚠️ Conformitate GDPR la scalare

---

## 12. Comparație cu competitorii

| Funcționalitate | Booking / Airbnb | Wanderlog / Roadtrippers | ChatGPT / Layla AI | **TravelTwin** |
|---|:---:|:---:|:---:|:---:|
| Zboruri live | Doar parțial | ❌ | ❌ | ✅ TripAdvisor |
| Hoteluri cu prețuri live | ✅ | ❌ | ❌ | ✅ TripAdvisor |
| Itinerar personalizat | ❌ | Manual | Doar text | ✅ Structurat zi-cu-zi |
| Pachete complete (zbor+hotel+plan) | ❌ | ❌ | ❌ | ✅ 3 variante |
| Hărți cu rute reale | ✅ | ✅ | ❌ | ✅ Google Routes |
| Dashboard personal | ❌ | Parțial | ❌ | ✅ Istoric complet |
| Asistent conversational | ❌ | ❌ | Fără date live | ✅ Cu date live |
| Geolocation IP automat | Parțial | ❌ | ❌ | ✅ Oraș + monedă + oferte |
| Trip Sharing public | Parțial | ✅ | ❌ | ✅ Link unic + print |
| Suport RO + orașe RO | Parțial | Engleză | Generic | ✅ Complet localizat |

**Diferențiator principal**: TravelTwin este **singura platformă** care combină date live + itinerar structurat + pachete complete într-un singur flux integrat.

---

## 13. Decizii arhitecturale documentate

### 13.1 De ce algoritm clasic, nu AI, la filtrarea destinațiilor?
**Răspuns**: rezultate consistente, costuri zero per cerere, viteză. AI-ul e folosit doar unde aduce valoare reală (generare conținut).

### 13.2 De ce Groq Llama 3.3 70B pentru toate apelurile AI?
**Răspuns**: cost zero (tier free Groq, 30 RPM), latență sub o secundă, JSON output garantat prin parametrul `response_format`. Llama 3.3 70B e suficient de capabil pentru itinerare structurate; pentru cazurile rare de output corupt există fallback content cu template-uri locale per oraș (`src/lib/fallbackContent.ts`).

### 13.3 De ce relational (PostgreSQL), nu NoSQL?
**Răspuns**: datele au relații clare (user → trips → favorites). Relațional e perfect pentru asta. NoSQL ar fi fost mai bun pentru date nestructurate (loguri).

### 13.4 De ce server-side only pentru API-uri externe?
**Răspuns**: protecție chei API, cache centralizat, rate limiting, fallback-uri. Clientul nu trebuie să știe de TripAdvisor sau alte servicii terțe.

### 13.5 De ce TTL adaptiv pe cache (1h pentru empty, 24h pentru hit)?
**Răspuns**: previne ca o pană temporară de upstream să „blocheze" un oraș pe „no results" o zi întreagă.

---

## 14. Instalare și rulare locală

### 14.1 Cerințe
- Node.js 20+
- npm sau pnpm
- Cont Supabase (free tier ok)
- Chei API: RapidAPI (TripAdvisor), Groq, Google Maps

### 14.2 Pași
```bash
git clone https://github.com/robertalc1/TravelTwin
cd TravelTwin
npm install
cp .env.example .env.local   # completează cheile
npm run dev
```

Deschide `http://localhost:3000`.

### 14.3 Comenzi disponibile
```bash
npm run dev          # dezvoltare (Turbopack, port 3000)
npm run build        # build producție
npm run start        # rulează build-ul de producție
npm run lint         # ESLint
npx tsc --noEmit     # verificare tipuri (obligatoriu înainte de commit)
```

### 14.4 Variabile de mediu obligatorii
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RAPIDAPI_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_SERVER_API_KEY=
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=   # opțional
```

---

## 15. Deployment

### 15.1 Vercel (producție)
- Deploy automat la fiecare `git push origin main`
- Variabile de mediu configurate în Vercel Dashboard
- Edge Functions pentru latență minimă în Europa
- Domain: `travel-twin.vercel.app`

### 15.2 Supabase
- Free tier (500 MB DB, 50K MAU)
- Migrațiile SQL se aplică **manual** prin Dashboard → SQL Editor
- Fișierele migrațiilor sunt în `supabase/migrations/*.sql` (doar ca documentație)

---

## 16. Structură proiect

```
traveltwin/
├── src/
│   ├── app/
│   │   ├── [locale]/         # rute internaționalizate
│   │   │   ├── (auth)/       # callback OAuth
│   │   │   └── (main)/       # home, plan, hotels, trips, profile, etc.
│   │   └── api/              # 24 endpoint-uri REST
│   │       ├── ai/           # plan-trip, visa-check, trip-content
│   │       ├── chat/         # Groq chat endpoint
│   │       ├── flights/      # TripAdvisor
│   │       ├── hotels/       # TripAdvisor
│   │       ├── road-trip/    # mașină/autobuz/tren
│   │       ├── favorites/    # CRUD favorite
│   │       └── ...
│   ├── components/           # componente React reutilizabile
│   │   ├── TripDetailView.tsx
│   │   ├── RoadTripDetailView.tsx
│   │   ├── RouteMap/         # hartă pentru zboruri
│   │   ├── RoadTripMap/      # hartă pentru road-trip
│   │   ├── chat/             # agent live
│   │   ├── Hotels/, Cars/    # carduri specializate
│   │   └── ui/               # primitive (Button, Modal, Toast)
│   ├── lib/                  # logică business pură
│   │   ├── tripadvisor-client.ts  # client unic pentru flights + hotels live
│   │   ├── cache.ts          # interfață api_cache
│   │   ├── weatherService.ts # Open-Meteo wrapper
│   │   └── ...
│   ├── stores/               # Zustand stores
│   │   ├── authModalStore.ts
│   │   ├── chatStore.ts
│   │   ├── currencyStore.ts
│   │   ├── tripPricingStore.ts  # pricing breakdown
│   │   └── toastStore.ts
│   ├── hooks/                # custom React hooks
│   └── proxy.ts              # Next.js middleware (rename pentru v16)
├── messages/
│   ├── ro.json               # traduceri română
│   └── en.json               # traduceri engleză
├── supabase/
│   └── migrations/*.sql      # documentație SQL
├── public/                   # asset-uri statice
├── docs/                     # diagrame arhitectură
└── .planning/                # artefacte planning (intern)
```

---

## 17. Limitări cunoscute & roadmap

### Limitări actuale
- Open-Meteo: prognoza maxim 16 zile
- TripAdvisor RapidAPI: limită 500 cereri/lună pe planul free
- TripAdvisor RapidAPI: 500 cereri/lună pe free
- Road Trip: doar Europa (Google Routes transit)
- Rezervare: simulată (fără plată reală)

### Roadmap
- 🚧 Integrare Stripe pentru plăți reale
- 🚧 PWA cu offline support
- 🚧 Aplicație React Native (iOS + Android)
- 🚧 Collaborative editing pe itinerar (Yjs CRDT)
- 🚧 Price drop alerts (Web Push)
- 🚧 Affiliate booking real (Booking.com Affiliate)

---

## 18. Autor & licență

- **Autor**: Alcaziu Robert Constantin
- **Lucrare de licență**: ESTIC 2026
- **Tehnologii folosite**: open-source (MIT / Apache 2.0)
- **Licență cod**: MIT

---

*Document generat automat din analiza codului sursă. Live demo: [travel-twin.vercel.app](https://travel-twin.vercel.app)*
