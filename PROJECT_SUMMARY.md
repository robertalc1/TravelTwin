# TravelTwin — Platformă AI de Planificare Călătorii

## 1. DESCRIERE GENERALĂ

**TravelTwin** este o aplicație web full-stack de tip SaaS pentru planificarea inteligentă a călătoriilor, construită cu Next.js 16, React 19 și TypeScript. Aplicația combină date în timp real despre zboruri și hoteluri din API-ul Amadeus (utilizat de peste 1.000 de companii aeriene globale) cu un motor AI bazat pe Claude (Anthropic) pentru generarea de itinerare personalizate zi-cu-zi, complete cu activități, restaurante și estimări de buget.

Platforma se adresează călătorilor moderni care doresc să planifice o vacanță completă (zbor + hotel + itinerar) dintr-un singur loc, fără să navigheze între zeci de site-uri. Utilizatorul introduce origine, destinație, număr de nopți și buget — iar TravelTwin returnează pachete complete de călătorie cu prețuri reale, imagini și un plan detaliat pe zile generat de AI.

**Problema rezolvată:** Planificarea unei călătorii necesită compararea zborurilor pe Skyscanner, hoteluri pe Booking.com, activități pe TripAdvisor și construirea manuală a unui itinerar. TravelTwin automatizează întregul proces, de la căutare până la itinerar detaliat, într-o singură experiență coezivă.

**Impact:** Reduce de la ore la minute timpul necesar planificării unei vacanțe complete, oferind utilizatorilor recomandări personalizate bazate pe localizare și preferințe de buget.

---

## 2. STACK TEHNOLOGIC

### Frontend
| Tehnologie | Versiune | Rol |
|---|---|---|
| **Next.js** | 16.1.6 | Framework principal (App Router, SSR, API Routes) |
| **React** | 19.2.3 | UI library cu Concurrent Features |
| **TypeScript** | ^5 | Type safety complet |
| **Tailwind CSS** | ^4 | Utility-first styling |
| **Framer Motion** | ^12.34.0 | Animații și tranziții |
| **Zustand** | ^5.0.11 | State management global (lightweight) |
| **Lucide React** | ^0.564.0 | Icon library |
| **React Leaflet** | ^5.0.0 | Hărți interactive (OpenStreetMap) |
| **Leaflet** | ^1.9.4 | Mapping engine |
| **next-themes** | ^0.4.6 | Dark mode / light mode |
| **clsx** | ^2.1.1 | Conditional class names |
| **tailwind-merge** | ^3.4.1 | Merge Tailwind classes fără conflicte |

### Backend (Next.js API Routes)
| Tehnologie | Versiune | Rol |
|---|---|---|
| **Next.js API Routes** | 16.1.6 | REST API server-side |
| **Amadeus SDK** | ^11.0.0 | Zboruri, hoteluri, locații live |
| **@supabase/supabase-js** | ^2.95.3 | Database, auth, caching |
| **@supabase/ssr** | ^0.8.0 | Server-side Supabase client |

### AI & Integrări Externe
| Serviciu | Utilizare |
|---|---|
| **Anthropic Claude** (claude-sonnet) | Generare itinerar personalizat AI |
| **Amadeus API** | Zboruri live, hoteluri, IATA autocomplete, inspirație |
| **AviationStack API** | Date zboruri fallback |
| **Unsplash API** | Imagini destinații HD |
| **Supabase** | PostgreSQL, Auth, caching API responses |
| **OpenStreetMap / Leaflet** | Hărți interactive destinații |

### Baza de date (Supabase / PostgreSQL)
- **PostgreSQL** (managed prin Supabase)
- **phpMyAdmin** nu se aplică — administrare prin Supabase Dashboard
- **Tabele principale:**
  - `profiles` — profiluri utilizatori (extins din Supabase Auth)
  - `saved_trips` — călătorii salvate/planificate
  - `favorites` — destinații favorite
  - `api_cache` — caching răspunsuri API externe (TTL: 15–30 min)
  - `user_searches` — istoric căutări
  - `reviews` — recenzii destinații
  - `countries`, `cities`, `attractions` — date geografice de referință
  - `daily_costs` — date estimare costuri per destinație
- **Soft delete** cu `deleted_at` pe tabele sensibile
- **Audit trail** cu `created_at` / `updated_at` pe toate entitățile
- **Indexuri optimizate** pe câmpuri de căutare frecventă (IATA, user_id, expires_at)

### DevOps & Tooling
| Tehnologie | Rol |
|---|---|
| **TypeScript strict mode** | Type safety complet |
| **ESLint + eslint-config-next** | Code quality |
| **Turbopack** (Next.js 16) | Build tool ultra-rapid în development |
| **Environment variables** | `.env.local` pentru toate secretele API |

---

## 3. FUNCȚIONALITĂȚI PRINCIPALE

### Planificare Călătorie cu AI (`/plan`)
- Wizard multi-step: origine → destinație → date → buget → preferințe
- Motor AI (Claude Sonnet) generează itinerar complet zi-cu-zi
- Fiecare zi include: activități dimineață/amiază/seară, restaurante recomandate, estimare buget
- Fallback la template content dacă `ANTHROPIC_API_KEY` lipsește (graceful degradation)
- Rezultatele se salvează în `sessionStorage` și pot fi redistribuite via link unic

### Căutare Zboruri Live (`/flights`)
- Integrare directă Amadeus Flight Offers Search API
- Fallback la AviationStack dacă Amadeus rate-limit depășit
- Pre-filtrare URL params (`?from=OTP&to=LHR`) pentru deep-linking
- Afișare: preț, durată formatată, aeroport origine/destinație, logo companie aeriană
- Surse de date etichetate vizual: **Live** (verde), **Cached** (galben), **Error** (roșu)

### Căutare Hoteluri Live (`/hotels`)
- Amadeus Hotel Search API cu imagini Unsplash pe baza ratingului stele
- Filtrare după check-in/check-out, număr camere, buget
- `getHotelImage(name, city, stars)` — mapare automată imagini HD
- Formatare prețuri cu `formatPrice(amount, currency)`

### Sistem de Caching Multi-nivel
- Cache în baza de date (`api_cache`) cu TTL configurabil per tip:
  - Zboruri: **15 minute**
  - Hoteluri: **30 minute**
  - Locații IATA: **24 ore**
  - Inspirație destinații: **15 minute**
- Cache miss → apel API extern → salvare în DB → răspuns utilizator
- Cache hit → răspuns instant fără apel extern

### Geolocation & Destinații Populare
- Detectare automată locație utilizator via `navigator.geolocation`
- Mapping locație → cel mai apropiat aeroport IATA (`iataMapping.ts`)
- Secțiune "Popular Trips" cu prețuri reale Amadeus din locația utilizatorului
- Inspirație destinații: cele mai ieftine zboruri disponibile din origine

### Autentificare & Profil Utilizator
- **Supabase Auth** cu OAuth (Google, GitHub) și email/parolă
- Sesiuni persistente cu JWT managed de Supabase
- Protected routes — redirecționare automată la login dacă neautentificat
- Profil utilizator cu statistici de călătorie

### Funcționalități Utilizator Autentificat
- **Favorite** — salvare/ștergere destinații preferate (POST/DELETE `/api/favorites`)
- **Trips** — salvare pachete de călătorie planificate
- **Reviews** — acordare rating și recenzii destinații
- **Stats** — dashboard statistici personale (destinații vizitate, zboruri, cheltuieli estimate)
- **Trip Sharing** — fiecare itinerar are un link de share unic (`/trips/share/[ref]`)

### Simulator Rezervare (`/booking/simulate`)
- Flow multi-step: Review → Date călător → Plată → Confirmare
- Simulare completă UX de booking (fără procesare plată reală)
- Util pentru demonstrarea UX în portofoliu / prezentări

### Pagina Explore (`/explore`)
- Grid cu 16 destinații mondiale inclusiv Bucharest (OTP)
- Secțiune inspirație cu cele mai ieftine zboruri disponibile
- Suport orașe românești: București (OTP), Cluj (CLJ), Timișoara (TSR), Iași (IAS), Sibiu (SBZ)

### Hartă Interactivă
- Leaflet + React Leaflet pentru vizualizare destinații pe hartă
- Markers interactive cu informații destinație
- Tile layer OpenStreetMap (fără costuri API)

---

## 4. ARHITECTURĂ

### Structură Frontend
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/login, register   # Autentificare
│   ├── (main)/                  # Aplicația principală
│   │   ├── flights/             # Căutare & detalii zboruri
│   │   ├── hotels/              # Căutare & detalii hoteluri
│   │   ├── explore/             # Descoperire destinații
│   │   ├── plan/                # Planificare AI + rezultate
│   │   ├── trips/               # Gestionare călătorii salvate
│   │   ├── booking/             # Simulator rezervare
│   │   ├── favorites/           # Destinații favorite
│   │   ├── reviews/             # Recenzii
│   │   ├── stats/               # Statistici personale
│   │   └── profile/             # Profil utilizator
│   └── api/                     # REST API (server-side)
├── components/
│   ├── layout/                  # Header, Footer, Navigation
│   ├── ui/                      # Componente primitive reutilizabile
│   ├── features/                # Componente domeniu (Flights, Hotels)
│   └── shared/                  # Componente partajate
├── lib/                         # Utilities, API clients, helpers
├── stores/                      # Zustand stores
├── providers/                   # Context providers (Auth, Theme)
├── hooks/                       # Custom React hooks
└── types/                       # TypeScript definitions
```

### API REST — Endpoint-uri Complete

| Endpoint | Metodă | Descriere |
|---|---|---|
| `/api/ai/plan-trip` | POST | Generare itinerar AI complet |
| `/api/ai/trip-content` | POST | Generare conținut trip specific |
| `/api/itinerary/generate` | POST | Generator itinerar alternativ |
| `/api/flights/live` | GET | Căutare zboruri Amadeus live |
| `/api/flights/inspiration` | GET | Destinații ieftine din origine |
| `/api/flights/aviationstack` | GET | Zboruri via AviationStack |
| `/api/deals/from/[iata]` | GET | Deal-uri din aeroport specific |
| `/api/hotels/live` | GET | Căutare hoteluri Amadeus live |
| `/api/locations/search` | GET | Autocomplete IATA + orașe |
| `/api/poi` | GET | Points of interest |
| `/api/popular-trips` | GET | Pachete populare |
| `/api/trips` | POST | Salvare călătorie |
| `/api/favorites` | POST | Adăugare favorit |
| `/api/favorites` | DELETE | Ștergere favorit |
| `/api/searches` | POST | Log căutare |
| `/api/recommendations` | POST | Recomandări personalizate |
| `/api/attractions/images` | GET | Imagini atracții |
| `/api/unsplash` | GET | Imagini Unsplash |
| `/api/debug/amadeus` | GET | Diagnostic credențiale Amadeus |
| `/auth/callback` | GET | OAuth callback |
| `/auth/logout` | POST | Logout |

### Pattern-uri Arhitecturale
- **SSR + CSR hybrid** — paginile critice SSR, interactivitate CSR
- **API Proxy Pattern** — frontend apelează exclusiv `/api/*` intern
- **Multi-source fallback** — Amadeus → AviationStack → date statice
- **Database caching** — răspunsuri API salvate în Supabase cu TTL
- **Rate limiting** — quotas per sursă API (`rateLimiter.ts`)
- **Context + Zustand** — Auth/Theme în Context, search state în Zustand
- **Protected Routes** — middleware verificare sesiune pentru pagini private

---

## 5. SECURITATE IMPLEMENTATĂ

### Autentificare
- **Supabase Auth** — JWT managed de Supabase, cookie httpOnly
- OAuth securizat (Google, GitHub) — fără stocare parole
- Session management automat cu refresh tokens
- Protected routes cu redirect la login

### Validare & Sanitizare
- TypeScript strict mode — elimină erori de tip la compile time
- Validare input pe server (API Routes) înainte de query-uri externe
- IATA codes validate împotriva listei cunoscute
- Parametri paginare și filtrare validați numeric

### Environment Variables
- Toate secretele API în `.env.local` (nu în cod)
- `ANTHROPIC_API_KEY`, `AMADEUS_CLIENT_SECRET`, `SUPABASE_KEY` — niciodată expuse pe client
- Next.js separă automat variabilele server (`process.env`) de client (`NEXT_PUBLIC_`)

### Rate Limiting
- `rateLimiter.ts` — quotas per API extern (Amadeus, AviationStack, Unsplash)
- Prevenire depășire limite API și costuri unexpected
- Cache reduce automat numărul de apeluri externe

### Securitate Date
- Supabase Row Level Security (RLS) — utilizatorul vede doar propriile date
- Soft delete — datele nu sunt șterse definitiv, permit audit trail
- Imagini externe via Unsplash CDN (niciun upload direct de fișiere)

---

## 6. INTEGRĂRI EXTERNE

### Amadeus for Developers
- **Flight Offers Search** — prețuri live pentru orice rută
- **Hotel Search** — disponibilitate și prețuri hoteluri
- **Location Search** — IATA autocomplete cu fallback românesc
- **Flight Inspirations** — cele mai ieftine destinații din origine
- Client dual-mode: SDK oficial + REST fallback (`amadeus-client.ts`)
- Fallback REST când SDK-ul are probleme de inițializare

### Anthropic Claude AI
- Model: `claude-sonnet-4-20250514`
- Generare itinerar complet zi-cu-zi bazat pe destinație, buget, preferințe
- Text dinamic cu restaurante, activități, estimări costuri
- Graceful degradation — template content când API key lipsește

### AviationStack
- Fallback pentru date zboruri când Amadeus indisponibil
- 379 LOC de integrare în `aviationstack.ts`
- Normalizare date în format intern `NormalizedFlight`

### Unsplash
- Imagini HD pentru destinații, hoteluri, atracții
- API key pentru rate limits extinse
- Fallback la imagini statice când API indisponibil

### Supabase
- PostgreSQL gestionat (fără server propriu)
- Autentificare OAuth built-in
- Realtime subscriptions (disponibil pentru features viitoare)
- Storage pentru fișiere (disponibil pentru viitor)

---

## 7. CARACTERISTICI TEHNICE AVANSATE

- **Next.js 16 App Router** cu Server Components și Client Components separate
- **React 19** — Concurrent Features, Suspense, optimistic updates
- **Turbopack** — build incremental ultra-rapid în development
- **Framer Motion** — animații spring physics, page transitions
- **Zustand v5** — state management minimal fără boilerplate Redux
- **Budget Allocator** (`budgetAllocator.ts`) — algoritm de distribuție buget per categorie
- **Pricing Engine** (`pricing.ts`) — estimare prețuri realiste bazată pe distanță și destinație
- **IATA Database** (`iataMapping.ts`) — 311 LOC cu mapare aeroport → coordonate → distanță
- **City Fallback Database** (`cityFallbackData.ts`) — date offline masive pentru funcționare fără API
- **Destination Intelligence** (`destinations.ts`) — scorer pentru matching destinații la preferințe
- **Dark Mode** — sistem complet light/dark via next-themes + Tailwind
- **Responsive Design** — mobile-first cu breakpoints pentru toate screen sizes
- **TypeScript strict** — tipuri complete pentru toate entitățile, fără `any`

---

## 8. METRICI APLICAȚIE

| Metrică | Valoare |
|---|---|
| **Total linii de cod** | ~16,375 LOC |
| **Componente React** | 23 componente |
| **Pagini / Routes** | 25 pagini |
| **Endpoint-uri API** | 21 endpoint-uri |
| **Fișiere utilitare (lib/)** | 21 fișiere |
| **Tabele DB** | 10+ tabele |
| **Integrări API externe** | 5 servicii (Amadeus, Claude, AviationStack, Unsplash, Supabase) |
| **Funcționalități majore** | 12 module principale |
| **TypeScript types** | 20+ interfețe și tipuri |
| **Custom hooks** | 2 hooks |
| **Zustand stores** | 1 store global (135 LOC) |

---

## 9. SKILLS FOLOSITE ÎN DEZVOLTARE

- **Claude Code** cu skill-ul `ui-ux-pro-max` — design UI/UX de calitate production
- **Claude Code** cu skill-ul `frontend-design` — componente React distinctive și profesionale
- **Claude Code** cu skill-ul `adapt` — responsive design mobile-first
- **Claude Code** cu skill-ul `animate` — micro-interacțiuni Framer Motion
- Dezvoltare iterativă prin prompting avansat (prompt engineering)
- Arhitectură full-stack definită și rafinată prin dialog continuu cu AI

---

## 10. BULLET POINTS PENTRU CV

### Română — Profil Software Developer

- Dezvoltat platformă full-stack de planificare călătorii cu **Next.js 16, React 19, TypeScript** și **Supabase**
- Integrat **Amadeus API** (industrie aeriană globală) pentru zboruri și hoteluri live cu sistem de cache DB multi-nivel (TTL 15–30 min)
- Implementat motor AI de generare itinerare cu **Claude Sonnet (Anthropic)** — planuri zi-cu-zi cu activități, restaurante și estimări buget
- Arhitecturat sistem **multi-source data** cu fallback automat: Amadeus → AviationStack → date statice
- Construit **21 endpoint-uri REST** în Next.js API Routes cu rate limiting, validare input și error handling graceful
- Implementat **autentificare OAuth** via Supabase (Google, GitHub) cu JWT și Row Level Security pe toate tabelele
- Creat **interfață responsive** cu Tailwind CSS, Framer Motion animations și dark mode complet
- Integrat **hărți interactive** cu React Leaflet + OpenStreetMap fără costuri API
- Stack complet: **React 19, Next.js 16, TypeScript, Tailwind CSS, Zustand, Supabase, Amadeus SDK, Framer Motion**

### English — Software Developer Profile

- Built a full-stack AI travel planning platform using **Next.js 16, React 19, TypeScript** and **Supabase**
- Integrated **Amadeus API** (global airline industry standard) for live flights and hotels, with a database-backed multi-level cache (15–30 min TTL) to minimize API costs
- Implemented AI itinerary generation engine using **Claude Sonnet (Anthropic)** — day-by-day plans with activities, restaurants and budget estimates
- Architected a **multi-source data strategy** with automatic fallback: Amadeus → AviationStack → static dataset
- Built **21 REST API endpoints** in Next.js API Routes with rate limiting, input validation and graceful error handling
- Implemented **OAuth authentication** via Supabase (Google, GitHub) with JWT and Row Level Security across all database tables
- Developed **fully responsive UI** with Tailwind CSS v4, Framer Motion spring animations and complete dark mode support
- Integrated **interactive maps** with React Leaflet and OpenStreetMap at zero API cost
- Stack: **React 19, Next.js 16, TypeScript, Tailwind CSS, Zustand, Supabase, Amadeus SDK, Claude AI, Framer Motion**

---

## 11. PENTRU PORTOFOLIU — DEMO POINTS

**Ce să demonstrezi în interviu sau portofoliu:**

1. **AI Trip Planner** (`/plan`) — cel mai impresionant feature, demonstrează integrarea AI
2. **Live Flight Search** (`/flights`) — date reale, surse badge-uri, caching vizibil
3. **Popular Trips pe homepage** — geolocation + Amadeus prices automate
4. **Dark Mode** — toggle instant cu animații
5. **Responsive design** — deschide pe mobil
6. **Trip Sharing** — link unic per itinerar
7. **Booking Simulator** — UX flow complet multi-step

**Întrebări tehnice la care ești pregătit:**
- *"Cum ai gestionat rate limiting-ul pe multiple API-uri externe?"* → `rateLimiter.ts` + caching DB
- *"Cum funcționează generarea AI a itinerarului?"* → Claude API cu context structurat (destinație, buget, preferințe) → JSON itinerar → render React
- *"Cum ai rezolvat cazul când un API e down?"* → multi-source fallback strategy (Amadeus → AviationStack → static data)
- *"De ce Zustand și nu Redux?"* → aplicație medie ca dimensiune, Zustand e mai simplu și mai rapid
- *"Cum protejezi secretele API?"* → env vars server-only, Next.js API Routes ca proxy, niciun secret pe client

---

*Generat automat prin analiza codului sursă — toate versiunile, endpoint-urile și metricile sunt extrase din fișierele reale ale proiectului.*
