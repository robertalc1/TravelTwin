# TravelTwin — Architecture Reference

> All diagrams use [Mermaid](https://mermaid.js.org). GitHub renders them inline.

## C4 — System Context

```mermaid
graph TB
    User[End User]
    Admin[Admin / Thesis Author]

    subgraph TT["TravelTwin Platform"]
        Web[Next.js 16 Web App]
    end

    subgraph EXT["External Systems"]
        Amadeus[Amadeus GDS<br/>flights + hotels]
        Claude[Anthropic Claude API<br/>itinerary + chat + visa]
        Supabase[Supabase<br/>Postgres + Auth + Realtime]
        Mapbox[Mapbox / Nominatim<br/>geocoding]
        OpenMeteo[Open-Meteo<br/>weather forecast]
        ERAPI[open.er-api.com<br/>FX rates]
        Unsplash[Unsplash<br/>destination photos]
    end

    User -->|HTTPS| Web
    Admin -->|Dashboard| Supabase
    Web -->|REST OAuth2| Amadeus
    Web -->|Messages API| Claude
    Web -->|SSR + Realtime| Supabase
    Web -->|Geocoding| Mapbox
    Web -->|Forecast| OpenMeteo
    Web -->|Daily rates| ERAPI
    Web -->|Hero photos| Unsplash
```

## C4 — Container Diagram

```mermaid
graph TB
    Browser[Browser / PWA]

    subgraph Vercel["Vercel Edge"]
        Next[Next.js 16<br/>App Router]
        APIRoutes[API Routes<br/>/api/*]
    end

    subgraph SupabaseCloud["Supabase Cloud"]
        Auth[Supabase Auth]
        DB[(PostgreSQL<br/>+ api_cache)]
        Realtime[Realtime Channels]
    end

    subgraph ExternalAPIs["External APIs"]
        AmadeusGDS[Amadeus GDS]
        ClaudeAPI[Claude Sonnet 4]
        MapboxAPI[Mapbox / Nominatim]
        OpenMeteoAPI[Open-Meteo]
    end

    Browser -->|SSR + CSR| Next
    Browser -->|Direct| Auth
    Next --> APIRoutes
    APIRoutes --> AmadeusGDS
    APIRoutes --> ClaudeAPI
    APIRoutes --> MapboxAPI
    APIRoutes --> OpenMeteoAPI
    APIRoutes --> DB
    Auth --> DB
    Realtime --> DB
```

## ER Diagram — Supabase

```mermaid
erDiagram
    profiles ||--o{ saved_trips : owns
    profiles ||--o{ user_searches : performs
    profiles ||--o{ reviews : writes
    profiles ||--o{ favorites : marks

    profiles {
        uuid id PK
        text full_name
        text email
        text nationality
        text travel_style
        text avatar_url
        timestamptz created_at
    }

    saved_trips {
        uuid id PK
        uuid user_id FK
        text destination
        text origin
        jsonb outbound_flight
        jsonb hotel
        numeric total_cost
        numeric budget
        int days
        text status
        timestamptz created_at
    }

    api_cache {
        text cache_key PK
        jsonb data
        text source
        timestamptz expires_at
        int hit_count
    }

    user_searches {
        uuid id PK
        uuid user_id FK
        text from_city
        numeric budget
        int days
        timestamptz created_at
    }

    favorites {
        uuid id PK
        uuid user_id FK
        text city_name
        jsonb city_data
    }

    reviews {
        uuid id PK
        uuid user_id FK
        text city_name
        int rating
        text body
    }
```

## Sequence — User plans a trip

```mermaid
sequenceDiagram
    actor U as User
    participant W as Browser
    participant API as /api/ai/plan-trip
    participant D as Destinations Matcher
    participant A as Amadeus Client
    participant Cache as api_cache
    participant C as Claude API

    U->>W: Complete 5-step wizard
    W->>API: POST { origin, budget, dates, styles, priorities }
    API->>D: matchDestinations()
    D-->>API: top 20 candidates

    loop For each top destination
        API->>Cache: getCached(cacheKey)
        alt Cache hit
            Cache-->>API: flights/hotels
        else Cache miss
            API->>A: searchFlights / searchHotels
            A-->>API: live data
            API->>Cache: setCache(15-30 min)
        end
    end

    API->>API: rank packages by score
    API->>C: Generate AI itinerary (top 6)
    C-->>API: dayByDay + attractions + restaurants
    API-->>W: { packages[] }
    W->>W: sessionStorage.setItem('planResults', ...)
    W->>U: Render PackageCards
```

## Sequence — User books (simulated)

```mermaid
sequenceDiagram
    actor U as User
    participant W as Browser
    participant B as /booking/simulate
    participant SS as sessionStorage
    participant Sh as /trips/share/[ref]

    U->>W: Click "View Full Itinerary"
    W->>SS: setItem(trip_id, pkg)
    W->>B: navigate /booking/simulate
    B->>U: Step 1 — Review (DemoBanner shown)
    U->>B: Next
    B->>U: Step 2 — Traveler info
    U->>B: Submit
    B->>U: Step 3 — Payment (test card 4242…)
    U->>B: Pay
    B->>B: validate test card → 3s simulation
    B->>SS: setItem(booking_TW-XXXX, trip+traveler)
    B->>U: Step 4 — Confirmation + share link
    U->>Sh: Open /trips/share/TW-XXXX
    Sh->>SS: getItem(booking_TW-XXXX)
    Sh->>U: Render printable itinerary
```

## Sequence — AI Chat (existing ChatPanel)

```mermaid
sequenceDiagram
    actor U as User
    participant CP as ChatPanel
    participant API as /api/ai/chat
    participant C as Claude API

    U->>CP: Type "1500€, 5 days at the beach in July"
    CP->>API: POST { messages[] }
    API->>C: messages + tools=[plan_trip]
    C-->>API: text + optional tool_use
    alt Tool call
        API->>API: invoke plan-trip internally
        API-->>CP: stream text + cards
    else Text only
        API-->>CP: stream text
    end
    CP->>U: Render markdown + interactive cards
```

## Sequence — Visa check

```mermaid
sequenceDiagram
    actor U as User
    participant V as VisaRequirementsCard
    participant API as /api/ai/visa-check
    participant Cache as api_cache (24h)
    participant C as Claude API

    U->>V: Mount with { nationality, country }
    V->>API: POST { nationality, country, nights }
    API->>Cache: getCached(visa:RO:France)
    alt Cache hit
        Cache-->>API: VisaInfo
    else Cache miss
        API->>C: structured visa prompt
        C-->>API: JSON VisaInfo
        API->>Cache: setCache(24h)
    end
    API-->>V: { visaRequired, docs, notes, ... }
    V->>U: Render structured card
```

## Caching strategy

| Layer | Where | TTL | Purpose |
|-------|-------|-----|---------|
| Browser | localStorage | 1h | FX rates |
| Browser | sessionStorage | session | Plan results, current trip |
| API | `api_cache` table | 15min | Flights (Amadeus) |
| API | `api_cache` table | 30min | Hotels (Amadeus) |
| API | `api_cache` table | 24h | Locations (IATA autocomplete) |
| API | `api_cache` table | 24h | Visa check (Claude) |
| API | `api_cache` table | 3h | Weather (Open-Meteo) |
| Edge | Vercel CDN | revalidate=10800 | Open-Meteo fetch |
| In-memory | `geocodeCache` Map | per session | Nominatim results |

## Error handling philosophy

- Amadeus errors → 4xx surface as "no results, try different dates"; 5xx surface as "try again later".
- Claude errors → fall back to deterministic template content (no broken UI).
- Open-Meteo / FX errors → use static fallback snapshot (lib has hard-coded values).
- Cache write failures → silently ignored (cache is best-effort).
