# TravelTwin ✈️

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> AI-powered travel planning platform built as a bachelor's thesis project. Compares head-to-head with [Tryp.com](https://www.tryp.com/en) and adds features the competition lacks: collaborative trip editing, carbon awareness, multi-currency, native Romanian market support.

## 🚀 Live demo

**[travel-twin.vercel.app](https://travel-twin.vercel.app)**

## ✨ Features

| Feature | Status | Tech |
|---------|:---:|------|
| AI itinerary generator (day-by-day) | ✅ | Claude Sonnet 4 |
| Live flight search | ✅ | Amadeus GDS |
| Live hotel search | ✅ | Amadeus GDS |
| Interactive maps | ✅ | React-Leaflet + Nominatim |
| Carbon footprint tracker | ✅ | DEFRA 2024 + ICAO RFI |
| Multi-currency (EUR/USD/RON/GBP/CHF/SEK) | ✅ | open.er-api.com |
| Weather forecast (7-16 days) | ✅ | Open-Meteo |
| Visa & entry requirements (AI) | ✅ | Claude Sonnet 4 |
| Conversational AI chat panel | ✅ | Claude Sonnet 4 |
| AI Trip Planner wizard (5 steps) | ✅ | Claude + Amadeus |
| Public shareable itineraries | ✅ | Supabase + URL refs |
| Demo booking simulator | ✅ | Test card `4242 4242 4242 4242` only |
| Geo-aware homepage deals | ✅ | IP geolocation + Amadeus |
| PWA + offline support | 🚧 | Roadmap |
| Collaborative editing (CRDT) | 🚧 | Roadmap (Yjs) |
| Price drop alerts (WebPush) | 🚧 | Roadmap |
| Real booking (affiliate) | 🚧 | Roadmap |

## 🛠 Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19
- **Language**: TypeScript 5 (strict, no `any`)
- **Styling**: Tailwind CSS 4
- **Auth + DB**: Supabase (Postgres + RLS)
- **Travel data**: Amadeus Self-Service GDS
- **AI**: Anthropic Claude (Sonnet 4)
- **Weather**: Open-Meteo (free, no key)
- **FX rates**: open.er-api.com (free, no key)
- **State**: Zustand 5 (with persist middleware)
- **Maps**: React-Leaflet 5 + OpenStreetMap tiles
- **Animation**: Framer Motion 12

## 🏃 Run locally

```bash
git clone https://github.com/robertalc1/TravelTwin
cd TravelTwin
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open <http://localhost:3000>.

## 📋 Environment variables

See [`.env.example`](./.env.example) for the full list. Minimum required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AMADEUS_CLIENT_ID=                 # optional — falls back to template content
AMADEUS_CLIENT_SECRET=
ANTHROPIC_API_KEY=                 # optional — falls back to template content
```

## 📐 Architecture

See [`docs/architecture.md`](./docs/architecture.md) for full Mermaid diagrams (C4 model, ER schema, request sequences).

Quick overview:

```
Browser ──► Next.js (Vercel Edge)
              ├──► /api/ai/plan-trip       → Claude + Amadeus
              ├──► /api/ai/visa-check      → Claude (24h cache)
              ├──► /api/flights/live       → Amadeus (15 min cache)
              ├──► /api/hotels/live        → Amadeus (30 min cache)
              ├──► /api/weather            → Open-Meteo (3h cache)
              └──► /api/deals/from/[iata]  → Amadeus (homepage geo)
                              │
                              └──► Supabase (Postgres + Auth + Realtime)
```

## 📊 Comparison vs Tryp.com

Full breakdown in [`RESEARCH_REPORT.md`](./RESEARCH_REPORT.md). Highlights:

- TravelTwin **wins**: Romanian localization (RON, OTP/CLJ/TSR/IAS/SBZ), day-by-day visualization, public shareable URLs, transparent pricing, modern stack.
- Tryp **wins**: real booking (licensed agency in Lisbon), virtual interlining, multi-modal (trains + buses + ferries), native iOS/Android apps, automatic check-in.

## 🧪 Testing

> Test infrastructure planned but not yet wired in (Vitest + Playwright + GitHub Actions). See `RESEARCH_REPORT.md` § "Phase 12 — Testing + CI/CD".

```bash
npx tsc --noEmit   # type check (passes with zero errors)
npm run lint       # ESLint (Next.js config)
npm run build      # production build
```

## 📂 Project structure

```
src/
├── app/
│   ├── (auth)/             login, register
│   ├── (main)/             home, plan, flights, hotels, trips, profile
│   └── api/
│       ├── ai/             plan-trip, visa-check, chat
│       ├── flights/live    Amadeus flights
│       ├── hotels/live     Amadeus hotels
│       ├── deals/from/     geo-aware deals
│       └── weather/        Open-Meteo proxy
├── components/
│   ├── CarbonTracker/      eco footprint
│   ├── Weather/            forecast cards
│   ├── VisaChecker/        AI visa requirements
│   ├── chat/               conversational assistant
│   ├── itinerary/          day-by-day timeline
│   └── ui/                 shared primitives
├── hooks/                  useCurrency, useUser, useUserLocation
├── lib/                    amadeus, carbon, weatherService, currencyService, cache
└── stores/                 Zustand: filters, search, currency
```

## 🤝 Contributing

This is a thesis project — contributions welcome but reviewed slowly. Open an issue first.

## 📝 License

MIT — see [LICENSE](LICENSE) (add file before publishing).

---

Built with ❤️ in Romania for [Universitatea Politehnica](https://upb.ro) bachelor's thesis 2026.
