# TravelTwin — Anatomia URL-urilor și Variabile Vercel

## 1. Cum citești URL-urile (anatomie completă)

### Structura generală a oricărui URL TravelTwin
```
https://travel-twin.vercel.app / [locale] / (grupul de rute) / segmente / [parametri-dinamici] ? query=value
```

- **Protocol + domeniu**: `https://travel-twin.vercel.app` (deploy Vercel)
- **`[locale]`**: limba activă (`en` sau `ro`) — segmentul cere `next-intl` și schimbă toate textele
- **Grup de rute**: `(main)` sau `(auth)` — folder cu paranteze în Next.js care **NU apare în URL**, doar grupează vizual
- **Segmente statice**: cuvinte fixe (`plan`, `trip`, `hotel`, `map`, `booking`, `simulate`)
- **`[id]` / `[hotelId]`**: segmente dinamice (orice text potrivit aici → ajunge ca param în pagină)
- **Query string** după `?`: parametri opționali, nu schimbă ruta

---

## 2. URL-ul de **trip detail**

```
/en/plan/trip/deal-CND-BUD-1779188607565-d0ti
```

| Segment | Înseamnă | Sursă în cod |
|---|---|---|
| `/en` | Locale Engleză (alternativa: `/ro` pentru Română) | folder `src/app/[locale]/` |
| `/plan` | Modulul AI Trip Planner (wizard + rezultate + detalii) | `src/app/[locale]/(main)/plan/` |
| `/trip` | Sub-modul: detalii pe un trip individual | `src/app/[locale]/(main)/plan/trip/` |
| `deal-CND-BUD-1779188607565-d0ti` | ID-ul tripului — segment dinamic `[id]` | `src/app/[locale]/(main)/plan/trip/[id]/page.tsx` |

### Decodificarea ID-ului `deal-CND-BUD-1779188607565-d0ti`

Construit în [src/app/api/deals/from/[iata]/route.ts:141](src/app/api/deals/from/[iata]/route.ts#L141) cu formatul:
```ts
id: `deal-${origin}-${toIata}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
```

| Bucată | Valoare | Semnificație |
|---|---|---|
| `deal-` | prefix fix | „Acest trip vine din endpoint-ul `/api/deals/from/[iata]`" (vs. ID-uri generate de AI Planner care au alt prefix) |
| `CND` | IATA cod | **Origine** — aeroportul Constanța, România (Mihail Kogălniceanu) |
| `BUD` | IATA cod | **Destinație** — aeroportul Budapesta, Ungaria (Ferenc Liszt) |
| `1779188607565` | Unix timestamp (ms) | Momentul când deal-ul a fost generat → `new Date(1779188607565).toISOString()` = **2026-05-13 ~17:43 UTC** |
| `d0ti` | 4 caractere random (base-36) | Coliziune-buster — dacă 2 utilizatori generează deal-uri în aceeași ms, sufixele random previn ID identic |

**De ce acest format?**
- E **deterministic** (parsabil înapoi) — știi imediat ruta și data
- E **stabil pe sesiune** — datele sunt salvate în `sessionStorage` sub `trip_${id}`
- E **URL-friendly** — fără spații, fără caractere speciale

---

## 3. URL-ul de **hotel detail** (cu query params)

```
/en/plan/trip/deal-CND-BUD-1779188607565-d0ti/hotel/15125043?cityCode=BUD&checkIn=2026-05-26&checkOut=2026-05-30&total=219&name=MEININGER+Budapest+Great+Market+Hall
```

### Segmente de cale (path)
| Segment | Valoare | Sursă în cod |
|---|---|---|
| `/en/plan/trip/deal-CND-BUD-...` | Identic cu trip-ul părinte | (același ca mai sus) |
| `/hotel` | Sub-route pentru detaliile unui hotel ales din tripul respectiv | `src/app/[locale]/(main)/plan/trip/[id]/hotel/[hotelId]/page.tsx` |
| `15125043` | **`hotelId`** — ID-ul intern Amadeus pentru hotelul concret | segment dinamic `[hotelId]` |

### Query params (după `?`)
Acestea sunt **redundante** intenționat — servesc ca „state portabil" ca să nu fie nevoie să citești sessionStorage:

| Param | Valoare | Rol |
|---|---|---|
| `cityCode=BUD` | IATA orașului | Pentru re-fetch-ul detaliilor de la Amadeus dacă userul face refresh |
| `checkIn=2026-05-26` | Data ISO check-in | Calculul nopților + afișare în UI |
| `checkOut=2026-05-30` | Data ISO check-out | Idem |
| `total=219` | Preț total în moneda activă | Afișat instant, fără să aștepți API |
| `name=MEININGER+Budapest+Great+Market+Hall` | Numele hotelului URL-encoded (`+` = spațiu) | Afișat în header chiar dacă API-ul Amadeus e lent |

**De ce și în query?** Permite partajarea link-ului — dacă trimiți URL-ul cuiva pe WhatsApp, primește toate datele să vadă hotelul fără să aibă acces la sessionStorage-ul tău.

---

## 4. URL-ul de **map view**

```
/en/plan/trip/deal-CND-BUD-1779188607565-d0ti/map
```

| Segment | Valoare | Sursă în cod |
|---|---|---|
| Toate de mai sus + | identic cu trip-ul | (același) |
| `/map` | Sub-route pentru harta multimodală | `src/app/[locale]/(main)/plan/trip/[id]/map/page.tsx` |

Această pagină afișează:
- Ruta vizuală **aeroport sosire → hotel** pe Leaflet
- Transit (metrou, tren, autobuz) din `/api/directions` (Google Routes)
- Iframe Google Maps embedded pentru navigare detaliată

---

## 5. URL-ul de **booking simulate**

```
https://travel-twin.vercel.app/en/booking/simulate
```

| Segment | Valoare | Sursă |
|---|---|---|
| `/en` | Locale | folder `[locale]` |
| `/booking` | Modulul booking (simulator de cumpărare) | `src/app/[locale]/(main)/booking/` |
| `/simulate` | Pagina concretă cu wizard-ul în 4 pași (Review → Traveler → Payment → Confirmed) | `src/app/[locale]/(main)/booking/simulate/page.tsx` |

**Notă:** Nu există `[id]` în URL — pagina **citește datele din `sessionStorage`** (cheile `bookingTrip` și `currentBookingMeta`) populate când userul a apăsat „Book Now" pe pagina detaliu trip.

Asta înseamnă că dacă cineva intră direct pe `/en/booking/simulate` fără să fi venit de la un trip, va vedea date goale (sau e redirectat la modal de login dacă nu e autentificat — vezi commit-ul anterior `639e361`).

---

## 6. Schema completă a tuturor rutelor în aplicație

```
src/app/
├── [locale]/                        ← /en sau /ro
│   ├── (auth)/                      ← grup invizibil în URL
│   │   ├── login/page.tsx           → /en/login
│   │   └── register/page.tsx        → /en/register
│   └── (main)/                      ← grup invizibil în URL
│       ├── page.tsx                 → /en (homepage)
│       ├── plan/
│       │   ├── page.tsx             → /en/plan (wizard AI)
│       │   ├── results/page.tsx     → /en/plan/results (3 pachete)
│       │   └── trip/
│       │       └── [id]/
│       │           ├── page.tsx     → /en/plan/trip/{ID}
│       │           ├── map/page.tsx → /en/plan/trip/{ID}/map
│       │           └── hotel/
│       │               └── [hotelId]/page.tsx → /en/plan/trip/{ID}/hotel/{HOTEL_ID}
│       ├── flights/
│       │   ├── page.tsx             → /en/flights
│       │   └── [id]/page.tsx        → /en/flights/{ID}
│       ├── hotels/
│       │   ├── page.tsx             → /en/hotels
│       │   └── search/page.tsx      → /en/hotels/search
│       ├── booking/
│       │   ├── simulate/page.tsx    → /en/booking/simulate
│       │   ├── confirmation/page.tsx
│       │   └── [id]/page.tsx
│       ├── trips/
│       │   ├── page.tsx             → /en/trips
│       │   ├── [id]/page.tsx        → /en/trips/{ID}
│       │   └── share/[ref]/page.tsx → /en/trips/share/{REF}
│       ├── cars/search/page.tsx     → /en/cars/search
│       ├── transfers/page.tsx       → /en/transfers
│       ├── profile/page.tsx         → /en/profile
│       └── favorites/page.tsx       → /en/favorites
└── api/                             ← 28 endpoint-uri REST (nu apar în UI)
```

---

## 7. Vercel Environment Variables (TOATE cheile pe care trebuie să le ai)

Toate aceste variabile sunt setate în **Vercel Dashboard → Project Settings → Environment Variables**. Pentru dezvoltare locală, le pui în `.env.local` (gitignored).

### A. **Supabase** (autentificare + bază de date)
| Variabilă | Tip | Folosită în |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (expusă în browser) | [src/lib/supabase/client.ts](src/lib/supabase/client.ts), [server.ts](src/lib/supabase/server.ts) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Idem |

Prefixul `NEXT_PUBLIC_` = expune variabila la browser. E sigur pentru ANON_KEY pentru că Supabase folosește RLS (Row Level Security) pe DB.

### B. **Anthropic Claude AI** (planificare + chat + viza)
| Variabilă | Tip | Folosită în |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Secret server-only** | [api/ai/plan-trip](src/app/api/ai/plan-trip/route.ts), [api/ai/visa-check](src/app/api/ai/visa-check/route.ts), [api/deals/from](src/app/api/deals/from/[iata]/route.ts) |

NU are prefix `NEXT_PUBLIC_` → nu ajunge niciodată în browser → securizat.

### C. **Amadeus GDS** (zboruri + hoteluri live)
| Variabilă | Tip | Folosită în |
|---|---|---|
| `AMADEUS_CLIENT_ID` | Secret server-only | `src/lib/amadeus-client.ts` |
| `AMADEUS_CLIENT_SECRET` | Secret server-only | Idem |

### D. **Google Maps / Routes** (hartă + directions)
| Variabilă | Tip | Folosită în |
|---|---|---|
| `GOOGLE_MAPS_SERVER_API_KEY` sau `GOOGLE_MAPS_API_KEY` | Secret server-only | [api/directions](src/app/api/directions/route.ts) (fallback chain) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public (restricționat la domeniu în Google Cloud Console) | [RouteMapView.tsx](src/components/RouteMap/RouteMapView.tsx), [RouteMapTeaser.tsx](src/components/RouteMap/RouteMapTeaser.tsx) |

### E. **RapidAPI** (TripAdvisor — POI, restaurante, atracții, mașini)
| Variabilă | Tip | Folosită în |
|---|---|---|
| `RAPIDAPI_KEY` | Secret server-only | [tripadvisor-client.ts](src/lib/tripadvisor-client.ts), [api/debug/rapidapi](src/app/api/debug/rapidapi/route.ts), [api/debug/cars](src/app/api/debug/cars/route.ts), [rateLimiter.ts](src/lib/rateLimiter.ts) |

### F. **Media providers**
| Variabilă | Tip | Folosită în |
|---|---|---|
| `UNSPLASH_ACCESS_KEY` | Secret server-only | [api/unsplash](src/app/api/unsplash/route.ts), [api/attractions/images](src/app/api/attractions/images/route.ts) |
| `PEXELS_API_KEY` | Secret server-only | [pexelsVideos.ts](src/lib/pexelsVideos.ts) (video-uri destinație) |

### G. **Gemini AI** (fallback pentru chat — dacă Claude e indisponibil)
| Variabilă | Tip | Folosită în |
|---|---|---|
| `GEMINI_API_KEY` | Secret server-only | [api/chat](src/app/api/chat/route.ts) |

### H. **Automat Vercel** (nu le setezi manual)
| Variabilă | Setată automat |
|---|---|
| `NODE_ENV` | Vercel o setează la `production` pentru prod, `development` pentru preview |
| `VERCEL_URL` | URL-ul curent al deploy-ului |
| `VERCEL_ENV` | `production` / `preview` / `development` |

---

## 8. Cum verifici că ai totul setat corect pe Vercel

1. **Vercel Dashboard** → `travel-twin` → **Settings** → **Environment Variables**
2. Asigură-te că pentru fiecare cheie ai bifate toate cele 3 medii: **Production**, **Preview**, **Development**
3. După adăugare → **Deployments** → click `...` pe ultimul deploy → **Redeploy** (env vars se aplică doar la build-uri noi)
4. Test rapid:
   - `/api/debug/rapidapi` → confirmă RAPIDAPI_KEY
   - `/api/debug/cars` → confirmă RapidAPI + Amadeus
   - `/api/debug/amadeus` (dacă există) → confirmă Amadeus credentials

---

## 9. Recapitulare — care variabile sunt **expuse** și care sunt **secrete**

| Categorie | Variabile |
|---|---|
| **Publice (în browser)** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| **Secrete (doar server)** | `ANTHROPIC_API_KEY`, `AMADEUS_CLIENT_ID/SECRET`, `RAPIDAPI_KEY`, `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY` |

**Regula generală Next.js:**
- `NEXT_PUBLIC_*` → injectată la build în bundle-ul JS → vizibilă în browser via DevTools → folosește DOAR pentru chei cu restricții stricte (Supabase anon, Maps cu restricție de domeniu)
- Orice altceva → strict server-side (în API routes) → nu trebuie să apară niciodată în browser
