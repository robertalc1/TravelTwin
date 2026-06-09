# TravelTwin — Rezumat Aplicație Licență

## 1. Descriere generală

**TravelTwin** este o platformă web modernă de planificare și rezervare a călătoriilor, dezvoltată ca lucrare de licență, care combină date reale de la furnizori globali (TripAdvisor prin RapidAPI pentru zboruri și hoteluri, Google Routes pentru hărți) cu inteligență artificială generativă (Claude Sonnet 4.6 de la Anthropic + Llama 3.3 prin Groq) pentru a oferi utilizatorului o experiență completă de tip „digital twin" al călătoriei sale — de la inspirație până la rezervare.

Aplicația funcționează ca un **asistent personal de călătorie**: utilizatorul introduce un buget sau o destinație, iar sistemul construiește automat pachete complete (zbor + cazare + transferuri + itinerar zi-cu-zi) folosind prețuri live, recomandări AI și hărți interactive.

---

## 2. Stack tehnologic

### Frontend
- **Next.js 16.1.6** (App Router + Turbopack) — framework React modern, server-side rendering pentru SEO și performanță
- **React 19** + **TypeScript** (strict, fără `any`) — type safety end-to-end
- **Tailwind CSS 4** — design system consistent, dark mode complet
- **Framer Motion** — animații fluide, micro-interacțiuni
- **next-intl** — internaționalizare (română + engleză)
- **next-themes** — comutare temă deschisă/întunecată cu persistență
- **Zustand** — state management ușor
- **Leaflet + React-Leaflet** — hărți interactive cu rute multimodale

### Backend & integrări
- **Supabase** — autentificare (email + OAuth Google), bază de date PostgreSQL pentru utilizatori, favorite, istoric căutări
- **TripAdvisor API (prin RapidAPI)** — date live pentru zboruri, hoteluri, locații, restaurante, atracții turistice și POI (sursă unică pentru toate datele live de călătorie)
- **Anthropic Claude AI** (`claude-sonnet-4-6`) — generare itinerarii personalizate, chat AI multilingv, verificări viză
- **Groq + Llama 3.3 70B** — asistent live conversational (latență sub o secundă)
- **Google Routes API** — rute pietonal/auto/transport public între puncte
- **Open-Meteo** — prognoză meteo (16 zile)
- **Unsplash + Pexels** — imagini și video de înaltă calitate pentru destinații

### Infrastructură
- Caching multi-strat (memorie + DB Supabase `api_cache`): zboruri 15min, hoteluri 30min, locații 24h, rezultate goale 1h
- Rate limiting per IP/user
- Strategie de fallback multi-source — dacă TripAdvisor pică, se servesc date din cache
- Deployment pe Vercel (edge functions)

---

## 3. Funcționalități cheie

### 3.1 Căutare clasică
- **Zboruri live** cu filtre: escale, durată, ora plecării, companie aeriană, preț
- **Hoteluri live** cu fotografii reale categorisate pe stele, hartă, recenzii
- **Mașini de închiriat** și **transferuri aeroport** (cu link partener Rentalcars)
- **Autocomplete IATA** pentru aeroporturi (sugestii inteligente: Otopeni OTP, Cluj CLJ, Timișoara TSR, Iași IAS, Sibiu SBZ + global)

### 3.2 AI Trip Planner (funcționalitate flagship)
- Wizard în 3 pași: origine → preferințe → buget
- Generează **3 pachete personalizate** complete (economic, balansat, premium)
- Pentru fiecare: zbor real + hotel real + itinerar zi-cu-zi AI + estimare buget
- Pagină detaliu trip cu tab-uri: Itinerar / Hoteluri / Mașini / Extras / Hartă

### 3.3 Hartă multimodală
- Vizualizare rută plecare → destinație
- Detalii transit (metrou, tren, autobuz) din aeroport spre hotel
- Coordonate geografice pentru toate aeroporturile principale
- Iframe Google Maps embedded pentru ghidare

### 3.4 Chat AI integrat
- Chatbot Claude în partea dreaptă a aplicației
- Răspunde în **limba locale-ului** (română dacă utilizatorul e pe `/ro`)
- Generează cards interactive de zboruri/hoteluri/deal-uri direct în conversație
- Context persistent pe sesiune

### 3.5 Inspirație & Explorare
- 16 destinații worldwide cu fotografii premium
- „Cele mai ieftine destinații din OTP" — TripAdvisor flight search + rute comune (`commonRoutes.ts`)
- Destinații similare (recomandare AI bazată pe locația aleasă)
- Video-uri destinație (Pexels) pe pagina hero

### 3.6 Funcționalități utilitare
- **Visa Checker AI** — verifică automat necesarul de viză pentru cetățenii români
- **Weather Forecast Card** — prognoza meteo a destinației
- **Favorite** — salvare pachete favorite în cont Supabase
- **Booking Simulator** — flux complet de checkout (Review → Călător → Plată → Confirmare)
- **Trip Sharing** — link public partajabil al itinerarului, cu suport printare
- **Currency Auto-Detect** — moneda detectată automat în funcție de locale
- **Session Timeout Modal** — siguranță UX pentru utilizatori autentificați

### 3.7 Internaționalizare completă
- Rute `[locale]` în App Router (`/ro/...`, `/en/...`)
- Toate textele traduse prin `next-intl`
- Selector limbă cu icoane SVG steaguri
- Claude AI răspunde în limba activă

---

## 4. Arhitectură & structură cod

```
src/
├── app/[locale]/
│   ├── (auth)/login, register          # autentificare Supabase
│   └── (main)/
│       ├── page.tsx                    # homepage cu search live
│       ├── flights, hotels, cars       # căutare clasică
│       ├── plan/                       # AI Trip Planner
│       │   ├── page.tsx                # wizard
│       │   ├── results/                # 3 pachete generate
│       │   └── trip/[id]/              # detaliu + hartă + extras
│       ├── booking/                    # flux rezervare
│       ├── trips/                      # istoric + partajare
│       ├── favorites, profile          # cont user
│       └── transfers
├── app/api/                            # 28 endpoint-uri REST
│   ├── flights/{live,inspiration}      # TripAdvisor
│   ├── hotels/{live,search,[id]}       # TripAdvisor
│   ├── ai/{plan-trip,trip-content,visa-check}  # Claude
│   ├── chat, weather, geolocation
│   ├── cars, restaurants, poi, directions
│   └── recommendations, popular-trips, deals
├── components/
│   ├── ui/                             # design system (Button, Input, Badge…)
│   ├── features/{flights,hotels}       # carduri rezultate
│   ├── itinerary/                      # timeline, transport, rute
│   ├── chat/                           # ChatPanel + carduri inline
│   ├── RouteMap/                       # Leaflet + transit
│   ├── TripDetail/                     # tabs detaliu trip
│   └── Weather, Cars, VisaChecker, Hotels
└── lib/                                # 26 module utilitare
    ├── tripadvisor-client.ts           # client unic pentru flights + hotels + locations
    ├── destinations.ts                 # scorer destinații
    ├── hotelImages, cityImages         # Unsplash mapping
    ├── cache, rateLimiter              # infrastructure
    └── currencyService, weatherService, geolocation
```

---

## 5. PUNCTE FORTE & DIFERENȚIATORI (esențial pentru prezentare)

### A. Diferențiatori tehnologici față de competiție (Booking, Skyscanner, Kiwi, Momondo)

1. **AI generativ end-to-end, nu doar filtre**
   - Booking/Skyscanner = motor de căutare cu filtre statice
   - TravelTwin = **planificator AI** care construiește pachete complete pornind de la buget și preferințe, cu itinerar zi-cu-zi scris de Claude

2. **Chat AI conversațional cu carduri interactive**
   - Concurența folosește chatbots scriptate (FAQ)
   - TravelTwin folosește **Claude Sonnet 4** care răspunde contextual și generează carduri de zboruri reale direct în chat

3. **Trei pachete personalizate, nu o listă infinită**
   - Competiția returnează sute de rezultate
   - TravelTwin filtrează inteligent în **3 pachete: Economic / Balansat / Premium** — reduce paradoxul alegerii

4. **Date 100% live de la TripAdvisor (prin RapidAPI)**
   - TripAdvisor este una dintre cele mai mari platforme de călătorii din lume cu peste 1 miliard de recenzii
   - Fără date mock / hardcoded — toate prețurile sunt live cu timestamp și badge „Live" / „Cached"

5. **Hartă multimodală integrată**
   - Vizualizare aeroport → hotel cu transport public real
   - Booking nu oferă acest nivel de detaliu nativ

6. **Multilingv real (RO + EN) cu AI în limba utilizatorului**
   - Chatbot-ul, itinerariile, verificările de viză — toate generate în română pentru utilizatorii români
   - Marile platforme traduc UI dar conținutul rămâne în engleză

### B. Diferențiatori UX/Design

1. **Dark mode complet** pe toate paginile (concurența: parțial sau lipsește)
2. **Responsive 100%** — telefon, tabletă, desktop, cu Bottom Navigation mobil
3. **Animații Framer Motion** — micro-interacțiuni la hover, scroll-reveals, transitions
4. **Skeleton loaders** pentru încărcări — nu spinneri generici
5. **Visa Checker integrat** — niciun competitor nu oferă această verificare automatizată cu AI
6. **Trip Sharing public** — link partajabil cu print stylesheet (Booking nu permite)
7. **Currency auto-detect** pe baza geolocației

### C. Diferențiatori arhitecturali

1. **Type safety strict** — TypeScript fără `any`, validare la build
2. **Caching multi-strat inteligent** — TTL diferit per tip de resursă (zboruri 15min, locații 24h)
3. **Strategie multi-source cu cache** — dacă TripAdvisor pică, sistemul servește din cache și nu lasă utilizatorul cu pagină goală
4. **Rate limiting per IP** — protecție anti-abuz
5. **Edge functions (Vercel)** — latență sub 100ms global
6. **Componente reutilizabile** — design system propriu (Button, Input, Badge, Card, RatingStars)

### D. Diferențiatori focusați pe România

1. **Toate aeroporturile românești** suportate (OTP, CLJ, TSR, IAS, SBZ)
2. **Rute populare predefinite** OTP→LHR, OTP→CDG
3. **Bucuresti în grila de destinații worldwide**
4. **Interfață și AI în limba română**
5. **Detectare automată că utilizatorul e din România** și ajustare valută (RON/EUR)

---

## 6. Concluzie pentru prezentare

> **TravelTwin = Booking + ChatGPT + Google Maps într-o singură aplicație, dar cu focus pe utilizatorul român și pe AI generativ real, nu doar cosmetică.**

Aplicația demonstrează:
- Integrare a **patru servicii externe majore** (TripAdvisor RapidAPI + Anthropic Claude + Groq Llama + Google Routes)
- **28 endpoint-uri REST** custom cu caching și rate limiting
- **23 pagini full-stack** organizate în route groups + i18n
- **60+ componente reutilizabile** cu design system propriu
- **Stack tehnologic la zi** (Next.js 16, React 19, TypeScript 5) — relevant pentru piața muncii din 2026
- Cod open source pe GitHub, deploy live pe Vercel

---

## 7. Recomandări pentru slide-urile PowerPoint

1. **Slide 1** — Titlu + screenshot homepage cu hero video
2. **Slide 2** — Problema (planificarea unei călătorii e fragmentată: Booking, Skyscanner, Maps, ChatGPT separate)
3. **Slide 3** — Soluția: TravelTwin (one-stop AI travel planner)
4. **Slide 4** — Stack tehnologic (cu logo-uri: Next.js, React, TypeScript, Tailwind, Supabase, TripAdvisor, Claude, Groq)
5. **Slide 5** — Diagrama arhitecturii (Client → Next.js API → TripAdvisor/Claude/Groq/Supabase)
6. **Slide 6** — Funcționalități clasice (zboruri/hoteluri/mașini) cu screenshot
7. **Slide 7** — **AI Trip Planner** (flagship) — wizard + 3 pachete + itinerar AI
8. **Slide 8** — Chat AI integrat + Visa Checker
9. **Slide 9** — Hartă multimodală + transit
10. **Slide 10** — Internaționalizare (RO/EN) + dark mode + responsive
11. **Slide 11** — **Diferențiatori vs Booking/Skyscanner** (tabel comparativ)
12. **Slide 12** — Securitate (auth Supabase, rate limiting, type safety)
13. **Slide 13** — Performanță (caching, edge, lighthouse score)
14. **Slide 14** — Demo live / scenariu utilizator
15. **Slide 15** — Concluzii + direcții viitoare (mobile app, plăți reale Stripe, integrare booking real)
