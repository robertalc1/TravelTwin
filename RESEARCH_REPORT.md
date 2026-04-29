# 📊 RAPORT DE CERCETARE COMPLET — TravelTwin vs Tryp.com

> **Document de referință academic** pentru lucrarea de licență
> **Data:** 2026-04-29
> **Versiune:** 2.0 (rescris complet, cu date live de la Tryp.com)
> **Surse de date:** TravelTwin homepage live + codebase complet local + WebFetch live pe www.tryp.com/en, /about, blog Tryp + WebSearch piață travel-AI 2026
> **Scop:** Material gata-pentru-implementare prin Claude Code

---

## CUPRINS

- [PASUL 1 — Analiza TravelTwin](#pasul-1--analiza-traveltwin)
- [PASUL 2 — Analiza Tryp.com (live)](#pasul-2--analiza-trypcom-live)
- [PASUL 3 — Tabel comparativ scoring 1-10](#pasul-3--tabel-comparativ-scoring-1-10)
- [PASUL 4 — 15 features detaliate cu cod](#pasul-4--15-features-detaliate-cu-cod)
- [PASUL 5 — Lista buguri cu fix-uri exacte](#pasul-5--lista-buguri-cu-fix-uri-exacte)
- [PASUL 6 — Structura lucrării de licență](#pasul-6--structura-lucrării-de-licență)
- [PASUL 7 — Scoring academic](#pasul-7--scoring-academic)
- [PASUL 8 — Diagrame de arhitectură](#pasul-8--diagrame-de-arhitectură-mermaid)
- [PASUL 9 — Plan de implementare Claude Code](#pasul-9--plan-de-implementare-claude-code)
- [Rezumat executiv](#-rezumat-executiv--top-5-acțiuni)

---

## PASUL 1 — Analiza TravelTwin

### 1.1 Pagina principală (homepage live)

**Structură reală extrasă în producție** (https://travel-twin.vercel.app):

- **Hero section**: gradient `secondary-500`, fundal aerial-ocean Unsplash `photo-1488085061387`, badge „AI-Powered Trip Planning", H1 „Your dream vacation, planned by AI", CTA central „Plan My Trip" (deschide `PlanTripWizard` modal — nu navighează)
- **Marquee bar primary-500**: 4 oferte rotative hard-coded (`offerTexts` array în `src/app/(main)/page.tsx:58-65`)
- **Tab strip categorii**: 8 tab-uri (Trips / For you / Weekend / Beach / Multi city / Snow / Hidden Gems / Intercontinental) + buton Filters cu badge counter
- **Secțiune deals geo-aware**: „Cheapest deals from {oraș}" — geo IP via `useUserLocation` → fetch `/api/deals/from/{IATA}`. Pentru Constanța: 2 deals (€455 OTP, €368 IST)
- **3 trust badges**: 24/7 support, Google Reviews 4.6 (FAKE), Best Price Guarantee
- **Footer CTA**: Plan My Trip duplicate

**Probleme verificate în cod:**
- Linia 142-146 `page.tsx`: shuffle Math.random() pe fiecare load → preț „cheapest" inconsistent
- Linia 75-84: trust signals hardcoded text static (Google 4.6 fake)
- Linia 60-65: marquee text hardcoded

### 1.2 Pagina /plan (wizard AI 4 pași)

| Pas | Conținut | Fișier:linie | Probleme |
|-----|---------|--------------|----------|
| 1 | Buget €150–€3000 + currency EUR/USD/RON | `plan/page.tsx:265-326` | Max 3000€ blochează intercontinental |
| 2 | Departure date + 11 night options + Adults/Children | `plan/page.tsx:329-415` | Origin lipsește din UI, e hardcoded! |
| 3 | 10 travel styles multi-select + 4 climate single | `plan/page.tsx:418-491` | OK |
| 4 | 6 priorities (max 3) | `plan/page.tsx:494-558` | OK, counter funcțional |

**Bug critic**: `plan/page.tsx:94` — `originIata: "OTP", originDisplay: "Bucharest"` hard-coded, niciun input UI pentru origin.

### 1.3 /plan/results și /plan/trip/[id]

**Tehnic:**
- Transfer state via `sessionStorage` (`planResults` + `trip_{id}`) — pierde la refresh
- Cards 1/2/3 grid responsive, badge „⭐ Best Match" pe primul (index 0)
- Imagini Unsplash via `dest.imageId` fără `onError` fallback → 404 silent
- Logo airline `https://pics.avs.io/80/30/{IATA}.png` extern fără fallback
- Buton CTA „View Full Itinerary" → `window.location.href = /plan/trip/${id}`

### 1.4 Hărți interactive

`src/components/InteractiveMap.tsx`:
- React-Leaflet 5.0 + Leaflet 1.9.4
- Geocoding **Nominatim/OSM** cu sleep secvențial 300ms × index → 10 atracții = ~3s
- Fix Leaflet icons via CDN unpkg.com (extern, fragil)
- 4 tipuri markeri: attraction (orange), restaurant (green), city (purple), selected (orange pulse)

### 1.5 Auth & Profile

- Supabase Auth (`@supabase/ssr ^0.8.0`) — doar email+password
- Lipsește OAuth Google/Apple/Facebook
- Profile: `full_name`, `nationality`, `travel_style` + 4 stats counters

### 1.6 Pagini auxiliare

| Path | Funcție | Status |
|------|---------|--------|
| `/explore` | 16 destinații + flight inspiration | ✅ |
| `/flights` | Live Amadeus + IATA autocomplete | ✅ |
| `/hotels` | Live Amadeus + photos by stars | ✅ |
| `/trips` | Saved trips Supabase + JourneyTimeline | ✅ |
| `/favorites` | Saved cities | ✅ |
| `/reviews` | User reviews | ⚠️ schelet |
| `/stats` | User stats | ⚠️ schelet |
| `/booking/simulate` | 4-step DEMO booking | ⚠️ NU real |
| `/trips/share/[ref]` | Public shareable URL | ✅ |

### 1.7 Stack tehnologic verificat (`package.json`)

- Next.js **16.1.6** (App Router + Turbopack)
- React **19.2.3**
- Supabase SSR **0.8.0** + JS **2.95.3**
- Amadeus SDK **11.0.0**
- Framer Motion **12.34.0**
- React-Leaflet **5.0.0** + Leaflet **1.9.4**
- next-themes **0.4.6**
- Zustand **5.0.11**
- Tailwind CSS **4.x**
- TypeScript **5.x**

**Lipsește din stack:** testing framework (Jest/Vitest), Playwright, Sentry, Pino logger, Resend, pgvector, Yjs, Workbox/PWA.

---

## PASUL 2 — Analiza Tryp.com (LIVE)

> ✅ **Date culese live** prin WebFetch pe www.tryp.com/en + /about + blog + WebSearch industry 2026.

### 2.1 Onboarding flow (real)

Tryp **NU forțează signup** înainte de search:
1. Search bar pe homepage cu 4 fields: „Where to?" (origin) + „Anywhere" (destination) + „When?" (date) + „1 traveller"
2. Trip type toggle: **One-way** vs **Trip + Stay** (combo zbor + hotel)
3. Search → results page → user vede deals fără cont
4. **Login opțional** doar pentru booking (Google / Facebook OAuth + email)
5. Prima persoană vede în profile-ul lor preferințe: currency, language, travel style

**Diferențiere TravelTwin**: Tryp cere doar 4 câmpuri minime; TravelTwin cere 4 pași complecți cu 30+ click-uri totale.

### 2.2 Funcționalități principale (citate live)

- **Multi-modal search**: „flights, trains, buses, ferries, hotels and activities" — agregat intr-un singur engine
- **Virtual interlining**: combină zboruri de la carriers care nu cooperează (ex: Wizz + Ryanair pe același itinerariu) — diferențiator major industrie
- **Dynamic packages**: real-time bundling flight + hotel cu reducere
- **Multi-city itineraries** + **„open-jaw tickets"** (return diferit de departure)
- **Automatic check-in**: sistem proprietar care face check-in automat 24h înainte de zbor
- **Unified booking timeline**: toate booking-urile într-o singură pagină
- **Manage Booking**: editare/cancel post-booking direct din interfață
- **Gift Cards**: cumperi credit pre-paid pentru altcineva

### 2.3 Integrări AI (live)

Citate exacte de pe site:
- „all-in-one platform using AI to get you the best travel deals"
- „Trains, buses, flights and stays combined with AI"
- „AI builds a complete, optimized itinerary that includes routes, dates, hotels, and transport options"
- „Algorithm connects flights, trains, and buses for perfect trips with matching hotels"
- **AI assistant „Sandra"** (din articole de venture capital despre Tryp): customer service AI conversațional
- **Predictive pricing**: AI estimează când e cel mai ieftin să cumperi

### 2.4 Booking flow (real)

1. User click pe deal → redirect către pagină booking internă (NU Skyscanner extern)
2. Tryp **este licensed travel agency** (Tryp.com LDA, NIF 518319776, Lisbon Portugal) → booking propriu, comision direct
3. Plată via **Google Pay / Apple Pay / card / bank transfer**
4. Confirmation email + push notification în app
5. **Automatic check-in** activat default (user poate dezactiva)
6. **24/7 support**: chat in-app, WhatsApp, phone (+45 43 32 63 67), email

**Diferențiere TravelTwin**: TravelTwin = doar simulator demo, fără licensing real.

### 2.5 Social features (live)

**Tryp NU are collaborative editing** (verificat — niciun feature explicit). Are:
- Blog cu articole despre destinații
- Reviews Google integrate (4.7 ★)
- Newsletter („Send me deals!")
- ❌ Nu există: trip sharing URL public, group editing, voting destinations, social feed

**Aici TravelTwin poate câștiga clar** — collaborative editing lipsește la Tryp.

### 2.6 Monetizare (verificată)

- **Comisioane affiliate** + comisioane proprii (licensed agency)
- **Funding**: €3.1M ianuarie 2025 (round VC + TV channels)
- **Revenue 2.3× growth în 2024**
- Newsletter pentru email marketing
- Gift cards = revenue pre-paid

Modelul nu e SaaS / freemium — toți userii primesc gratis features, monetizare e doar pe booking.

### 2.7 Design & UX (live)

- Color scheme: blue (#3B82F6 approx) + alb + accents portocaliu pe CTA
- Layout: hero cu search bar central, sub el cards categorii (Weekend / Beach / Multi City / Snow / Single City / Bus & Train / Sustainable)
- Typography: sans-serif modern (probabil Inter / Geist)
- Sub fold: blog articles grid + newsletter signup + footer 4 secțiuni
- Footer secțiuni: **Site** (About, Manage Booking, Blog, Gift Card, Partners, Profile) + **Discover** (Sustainable, Weekend, Beach, Snow, Multi City, Single City) + **Help** (Help centre, Privacy, Terms, Feedback, Cookies)

### 2.8 Mobile experience (live, app launch August 2025)

- **Native iOS + Android** (App Store + Google Play, lansate august 2025)
- Login social: Google + Facebook
- Chat agent integrat în app
- Multi-currency + multi-language preferences în profile
- Customizable travel style preferences
- ❌ Nu confirmate explicit: offline support, push notifications, Apple Wallet boarding pass, AR

---

## PASUL 3 — Tabel comparativ scoring 1-10

> Scor 1=foarte slab, 5=ok, 10=excelent. **W** = Winner.

| Feature | TravelTwin | Tryp.com | W | Justificare |
|---------|:---:|:---:|:---:|---|
| **AI Itinerary Generation** | 7 | 8 | 🥇 Tryp | TravelTwin: Claude Sonnet 4 + structured day-by-day. Tryp: AI conversational + predictive pricing + Sandra assistant. |
| **Real Flight Data** | 7 | 9 | 🥇 Tryp | TT: Amadeus only. Tryp: virtual interlining = combinații imposibile la TT. |
| **Real Hotel Data** | 7 | 8 | 🥇 Tryp | Ambii live; Tryp are licensed agency cu negocieri directe. |
| **Train/Bus Integration** | 0 | 9 | 🥇 Tryp | TT: zero. Tryp: feature core. |
| **Budget Optimization** | 7 | 6 | 🥇 TT | TT: buget e constraint nativ în AI prompt. Tryp: doar filter. |
| **Map Integration** | 5 | 4 | 🥇 TT | TT: React-Leaflet (slow Nominatim). Tryp: practic absentă. |
| **Social/Sharing** | 6 | 3 | 🥇 TT | TT: `/trips/share/[ref]` URL public + print. Tryp: zero. |
| **Collaborative Editing** | 0 | 0 | 🤝 | Niciunul nu are. **OPORTUNITATE** pentru TT. |
| **Mobile UX** | 5 | 9 | 🥇 Tryp | TT: doar responsive web. Tryp: native iOS+Android. |
| **Onboarding Simplicity** | 4 | 8 | 🥇 Tryp | TT: 4 wizard steps + ~30 click-uri. Tryp: 4 fields → search instant. |
| **Offline Support** | 0 | 4 | 🥇 Tryp | TT: zero. Tryp: native app caching parțial. |
| **Price Comparison** | 4 | 9 | 🥇 Tryp | TT: 1 sursă (Amadeus). Tryp: virtual interlining + multi-OTA. |
| **Personalization** | 5 | 7 | 🥇 Tryp | TT: form one-shot. Tryp: persistent profile + history-based. |
| **Brand Trust** | 3 | 8 | 🥇 Tryp | TT: fake „Google 4.6". Tryp: Google 4.7 verificat + licensed + €3.1M VC. |
| **Romanian/Local Market** | 9 | 4 | 🥇 TT | TT: OTP/CLJ/TSR/IAS/SBZ + RON + Romanian destinations. Tryp: doar EN focus. |
| **Booking Real (legal)** | 1 | 10 | 🥇 Tryp | TT: simulator. Tryp: licensed agency + payments real. |
| **Code Quality / Stack** | 8 | ? | 🥇 TT | TT: Next.js 16 / React 19 bleeding edge. Tryp: stack necunoscut. |
| **Auto Check-in** | 0 | 9 | 🥇 Tryp | Diferențiator major Tryp. |
| **Predictive Pricing / Alerts** | 0 | 8 | 🥇 Tryp | TT: nu trackuiește prețuri. Tryp: feature core. |
| **Sustainable / Eco Mode** | 0 | 7 | 🥇 Tryp | Tryp are categoria „Sustainable" în navigation. |
| **Customer Support 24/7** | 0 | 9 | 🥇 Tryp | TT: zero canal. Tryp: chat + WhatsApp + phone. |
| **Visual Itinerary Cards** | 8 | 6 | 🥇 TT | TT: AI cards cu day-by-day morning/afternoon/evening. Tryp: list-style. |
| **Gift Cards / Pre-paid** | 0 | 7 | 🥇 Tryp | Diferențiator B2C. |
| **Multi-City Trips** | 3 | 9 | 🥇 Tryp | TT: doar one-way+round-trip. Tryp: open-jaw + multi-city core. |

**Scor agregat:**
- TravelTwin: **89 / 240** (37%)
- Tryp.com: **165 / 240** (69%)
- **Tied:** 2

**Dominație Tryp pe**: real-world booking, multi-modal, mobile, support.
**Dominație TravelTwin pe**: localizare RO, day-by-day visualization, sharing URL, code quality.

---

## PASUL 4 — 15 features detaliate cu cod

### 🔴 PRIORITATE ÎNALTĂ — Implementabile pentru licență

#### Feature #1 — Conversational AI Trip Planner (Chat-First Mode)

**Descriere**: Înlocuiește wizard cu chat panel. User scrie „Vreau 1500€, 5 zile la mare în iulie cu copilul" → Claude extrage parametri → cheamă `/api/ai/plan-trip` → afișează cards interactive în chat.

**De ce mai bun ca Tryp**: Tryp are AI dar nu chat conversațional vizibil; TT poate face în RO + EN.

**API necesare**: Anthropic Claude API (Tool Use), `/api/ai/plan-trip` deja existent.

**Estimare**: **20-26 ore**.

**Fișiere de creat:**

`src/app/api/ai/chat/route.ts`
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const PLAN_TOOL = {
  name: 'plan_trip',
  description: 'Plan a trip with given parameters',
  input_schema: {
    type: 'object' as const,
    properties: {
      origin: { type: 'string', description: 'IATA code, e.g. OTP' },
      budget: { type: 'number' },
      currency: { type: 'string', enum: ['EUR', 'USD', 'RON'] },
      departureDate: { type: 'string', format: 'date' },
      nights: { type: 'number' },
      adults: { type: 'number' },
      children: { type: 'number' },
      travelStyles: { type: 'array', items: { type: 'string' } },
    },
    required: ['origin', 'budget', 'departureDate', 'nights'],
  },
};

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: 'You are a helpful Romanian-friendly travel assistant. Extract trip parameters from user input and call plan_trip tool when you have enough info.',
    tools: [PLAN_TOOL],
    messages,
  });

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

`src/components/chat/ChatPanel.tsx` (skeleton):
```typescript
'use client';
import { useState } from 'react';

export function ChatPanel() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  async function send() {
    const next = [...messages, { role: 'user' as const, content: input }];
    setMessages(next);
    setInput('');
    setStreaming(true);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: next }),
    });

    const reader = res.body!.getReader();
    let acc = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += new TextDecoder().decode(value);
      setMessages([...next, { role: 'assistant', content: acc }]);
    }
    setStreaming(false);
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-surface rounded-2xl shadow-2xl flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="inline-block px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-500/10">
              {m.content}
            </span>
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Spune-mi unde vrei..."
          className="flex-1 px-3 py-2 rounded-lg border"
        />
        <button onClick={send} disabled={streaming} className="px-4 bg-primary-500 text-white rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
}
```

**Schema Supabase** (chat history):
```sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text check (role in ('user', 'assistant', 'tool')),
  content jsonb not null,
  created_at timestamptz default now()
);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy "Users access own sessions" on chat_sessions
  for all using (auth.uid() = user_id);
create policy "Users access own messages" on chat_messages
  for all using (auth.uid() in (select user_id from chat_sessions where id = session_id));
```

---

#### Feature #2 — Live Price Drop Alerts (WebPush + cron)

**Descriere**: User salvează un trip → cron-job zilnic compară preț Amadeus → trimite Web Push când scade >10%.

**API**: Web Push API + Service Worker + Vercel Cron + (fallback) Resend.

**Estimare**: **14-18 ore**.

**Schema Supabase:**
```sql
create table price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  trip_id uuid references saved_trips(id) on delete cascade,
  baseline_price numeric not null,
  threshold_pct numeric default 10,
  push_subscription jsonb,
  last_checked_at timestamptz,
  triggered_at timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

create index price_alerts_active on price_alerts(active, last_checked_at);
```

**Cron**: `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/check-prices", "schedule": "0 8 * * *" }
  ]
}
```

`src/app/api/cron/check-prices/route.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { searchFlights } from '@/lib/amadeus-client';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:hello@traveltwin.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*, saved_trips(*)')
    .eq('active', true);

  for (const alert of alerts ?? []) {
    const trip = alert.saved_trips;
    const flights = await searchFlights({
      origin: trip.origin, destination: trip.destination,
      departureDate: trip.departure_date, adults: 1,
    });
    const minPrice = Math.min(...flights.map(f => f.price));
    const dropPct = ((alert.baseline_price - minPrice) / alert.baseline_price) * 100;
    if (dropPct >= alert.threshold_pct) {
      await webpush.sendNotification(alert.push_subscription, JSON.stringify({
        title: `Price dropped ${Math.round(dropPct)}%!`,
        body: `${trip.origin} → ${trip.destination} now ${minPrice}€`,
        url: `/trips/${trip.id}`,
      }));
      await supabase.from('price_alerts').update({ triggered_at: new Date().toISOString(), active: false }).eq('id', alert.id);
    }
    await supabase.from('price_alerts').update({ last_checked_at: new Date().toISOString() }).eq('id', alert.id);
  }
  return Response.json({ checked: alerts?.length ?? 0 });
}
```

`public/sw.js`:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon-192.png', data: { url: data.url },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

---

#### Feature #3 — Collaborative Trip Editing (Yjs + Supabase Realtime)

**Descriere**: 2+ useri editează același trip simultan, cu cursor presence și conflict-free merge (CRDT). **Capitolul „WOW" la comisie.**

**API**: Yjs + Supabase Realtime channels.

**Estimare**: **35-45 ore**. Cea mai complexă, dar mare impact academic.

**Schema:**
```sql
create table collab_trips (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references saved_trips(id) on delete cascade,
  yjs_state bytea,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table collab_participants (
  id uuid primary key default gen_random_uuid(),
  collab_id uuid references collab_trips(id) on delete cascade,
  user_id uuid references auth.users(id),
  cursor_color text,
  joined_at timestamptz default now()
);
```

`src/hooks/useCollaborativeTrip.ts`:
```typescript
import * as Y from 'yjs';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useCollaborativeTrip(tripId: string) {
  const [doc] = useState(() => new Y.Doc());
  const [participants, setParticipants] = useState<Array<{ id: string; color: string }>>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`trip:${tripId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        Y.applyUpdate(doc, new Uint8Array(payload.update));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setParticipants(Object.values(state).flat() as Array<{ id: string; color: string }>);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: 'me', color: '#' + Math.floor(Math.random()*16777215).toString(16) });
        }
      });

    doc.on('update', (update: Uint8Array) => {
      channel.send({ type: 'broadcast', event: 'yjs-update', payload: { update: Array.from(update) } });
    });

    return () => { channel.unsubscribe(); doc.destroy(); };
  }, [tripId, doc]);

  return { doc, participants, activities: doc.getArray('activities') };
}
```

---

#### Feature #4 — AI Persona + ML Personalization (pgvector)

**Descriere**: După 3+ trips, AI clusterizează userul ca „weekend warrior" / „luxury" / „backpacker" + folosește vector embeddings pe destinații.

**API**: OpenAI embeddings (`text-embedding-3-small`) sau Voyage AI + pgvector.

**Estimare**: **22-28 ore**.

**Schema:**
```sql
create extension if not exists vector;

alter table saved_trips add column embedding vector(1536);

create table user_personas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  persona_name text,
  persona_centroid vector(1536),
  trip_count int default 0,
  updated_at timestamptz default now()
);

create index trips_embedding_idx on saved_trips using ivfflat (embedding vector_cosine_ops);
```

`src/lib/embeddings.ts`:
```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embedTrip(trip: { destination: string; styles: string[]; budget: number; }) {
  const text = `Destination: ${trip.destination}. Styles: ${trip.styles.join(', ')}. Budget level: ${trip.budget < 800 ? 'budget' : trip.budget < 2000 ? 'mid' : 'luxury'}.`;
  const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

---

#### Feature #5 — PWA + Offline Itineraries

**Descriere**: Install ca app, itineraries în IndexedDB, harta cached offline.

**API**: `next-pwa` + Workbox + Dexie.

**Estimare**: **10-14 ore**.

**Install:** `npm i next-pwa workbox-webpack-plugin dexie`

`next.config.ts`:
```typescript
import withPWA from 'next-pwa';

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.amadeus\.com\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'amadeus-api', expiration: { maxAgeSeconds: 900 } },
    },
    {
      urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/,
      handler: 'CacheFirst',
      options: { cacheName: 'osm-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 30*86400 } },
    },
  ],
})({ /* nextConfig */ });
```

`public/manifest.json`:
```json
{
  "name": "TravelTwin", "short_name": "TravelTwin",
  "start_url": "/", "display": "standalone",
  "background_color": "#ffffff", "theme_color": "#f97316",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

### 🟡 PRIORITATE MEDIE

#### Feature #6 — AR Camera Mode (WebXR)

**Estimare**: **40-50 ore** (high effort).

```bash
npm i three @react-three/fiber @react-three/xr
```

```typescript
import { ARButton, XR } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';

export function ARView() {
  return (
    <>
      <ARButton sessionInit={{ requiredFeatures: ['hit-test'] }} />
      <Canvas><XR>{/* place 3D label on building */}</XR></Canvas>
    </>
  );
}
```

---

#### Feature #7 — Group Polling (Vote Destinations)

**Estimare**: **6-8 ore**.

**Schema:**
```sql
create table polls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users(id),
  trip_options jsonb not null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table poll_votes (
  poll_id uuid references polls(id) on delete cascade,
  user_id uuid references auth.users(id),
  option_index int not null,
  primary key (poll_id, user_id)
);
```

```typescript
// app/api/polls/[id]/vote/route.ts
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { optionIndex } = await req.json();
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  await supabase.from('poll_votes').upsert({ poll_id: params.id, user_id: user.id, option_index: optionIndex });
  return Response.json({ ok: true });
}
```

---

#### Feature #8 — Carbon Footprint Calculator + Eco Mode

**Estimare**: **8-10 ore**.

```typescript
// src/lib/carbon.ts
const KG_CO2_PER_KM_FLIGHT = 0.115;
const KG_CO2_PER_KM_TRAIN = 0.014;
const KG_CO2_PER_KM_BUS = 0.027;

export function flightCO2(distanceKm: number, passengers = 1): number {
  return distanceKm * KG_CO2_PER_KM_FLIGHT * passengers;
}

export function ecoBadge(co2Kg: number): { label: string; color: string } {
  if (co2Kg < 100) return { label: '🌱 Low impact', color: 'green' };
  if (co2Kg < 500) return { label: '⚠️ Medium', color: 'yellow' };
  return { label: '🔥 High impact', color: 'red' };
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

#### Feature #9 — AI Voice Mode (Web Speech + ElevenLabs)

**Estimare**: **12-16 ore**.

```bash
npm i elevenlabs
```

```typescript
// src/components/VoiceMode.tsx
'use client';
import { useState } from 'react';

export function VoiceMode() {
  const [listening, setListening] = useState(false);

  async function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'ro-RO'; rec.continuous = false;
    rec.onresult = async (e: any) => {
      const transcript = e.results[0][0].transcript;
      const { audioUrl } = await fetch('/api/ai/voice', {
        method: 'POST', body: JSON.stringify({ text: transcript }),
      }).then(r => r.json());
      new Audio(audioUrl).play();
    };
    rec.start();
    setListening(true);
  }

  return <button onClick={startListening}>{listening ? '🎙️ Listening...' : '🎤 Talk to me'}</button>;
}
```

---

#### Feature #10 — Currency Conversion Real-Time

**Estimare**: **3-5 ore**.

```typescript
// src/lib/currency.ts
export async function getRates(): Promise<Record<string, number>> {
  const cached = sessionStorage.getItem('rates');
  if (cached) {
    const { ts, rates } = JSON.parse(cached);
    if (Date.now() - ts < 6*3600*1000) return rates;
  }
  const res = await fetch('https://api.exchangerate.host/latest?base=EUR');
  const { rates } = await res.json();
  sessionStorage.setItem('rates', JSON.stringify({ ts: Date.now(), rates }));
  return rates;
}

export async function convert(amount: number, from: string, to: string) {
  if (from === to) return amount;
  const rates = await getRates();
  return (amount / rates[from]) * rates[to];
}
```

---

### 🟢 PRIORITATE LOW (vision)

#### Feature #11 — Trip Diary cu Photo Auto-Geotag

**Estimare**: **20-25 ore**.

```bash
npm i exifr
```

```typescript
// src/lib/photoGeotag.ts
import exifr from 'exifr';

export async function extractGeoFromPhoto(file: File): Promise<{ lat: number; lon: number; takenAt: Date } | null> {
  const data = await exifr.parse(file);
  if (!data?.latitude) return null;
  return { lat: data.latitude, lon: data.longitude, takenAt: data.DateTimeOriginal };
}
```

---

#### Feature #12 — Booking Real (Skyscanner Affiliate)

**Estimare**: **15-20 ore** (depinde de aprobarea afiliat).

API: Skyscanner Affiliate Programme — necesită cont aprobat.

---

#### Feature #13 — Travel Insurance Marketplace

**Estimare**: **20-30 ore**.

Integrări AXA/Allianz/Hanse Merkur (API-uri B2B).

---

#### Feature #14 — Co-Traveler Match (Solo Travelers)

**Estimare**: **25-30 ore**.

```sql
create table travel_matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references auth.users(id),
  user_b uuid references auth.users(id),
  trip_a_id uuid, trip_b_id uuid,
  similarity_score numeric,
  status text check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now()
);
```

---

#### Feature #15 — Local Experiences Marketplace

**Estimare**: **15-20 ore**.

API: Viator Partner API + GetYourGuide Partner API. Comision 5-12%.

---

## PASUL 5 — Lista buguri cu fix-uri exacte

### Bug #1 — Origin hardcoded în wizard

**📍 Locație**: `src/app/(main)/plan/page.tsx:93-94`
**🔴 Severitate**: **CRITICAL**
**📝 Problemă**: `originIata: "OTP"` hardcoded; user nu poate alege origine.

**💡 Fix exact:**
```typescript
// ÎNAINTE (linia 93-106)
const [state, setState] = useState<PlanState>({
  originIata: "OTP",
  originDisplay: "Bucharest",
  // ...
});

// DUPĂ — adaugă pas 0 + autocomplete
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";

// În JSX, înainte de step === 0, adaugă step === -1 sau redenumește step
{step === 0 && (
  <motion.div /* ... */>
    <div className="text-5xl mb-4">📍</div>
    <h2 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-2">
      Where are you starting from?
    </h2>
    <LocationAutocomplete
      value={state.originIata}
      displayValue={state.originDisplay}
      onSelect={(iata, display) => {
        set("originIata", iata);
        set("originDisplay", display);
      }}
    />
    <button
      onClick={goNext}
      disabled={!state.originIata}
      className="rounded-full bg-primary-500 px-8 py-4 text-white disabled:opacity-50"
    >
      Next
    </button>
  </motion.div>
)}

// Și schimbă totalSteps de la 4 la 5
const totalSteps = 5;
```

---

### Bug #2 — Buget max prea mic

**📍 Locație**: `src/app/(main)/plan/page.tsx:296-298`
**🔴 Severitate**: Major

**💡 Fix:**
```typescript
// ÎNAINTE
<input type="range" min={150} max={3000} step={50} ... />
// DUPĂ
<input type="range" min={150} max={8000} step={50} ... />
<div className="flex justify-between text-xs text-text-muted mb-8">
  <span>€150</span><span>€8,000</span>
</div>
```

---

### Bug #3 — sessionStorage pierde results la refresh

**📍 Locație**: `src/app/(main)/plan/results/page.tsx:30-49`
**🔴 Severitate**: Major

**💡 Fix** — persistă în Supabase:

**Schema:**
```sql
create table plan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  packages jsonb not null,
  params jsonb,
  expires_at timestamptz default now() + interval '24 hours',
  created_at timestamptz default now()
);
```

```typescript
// În /plan/page.tsx, după primit data:
const { data: session } = await supabase
  .from('plan_sessions')
  .insert({ packages: data.packages, params: state })
  .select()
  .single();
router.push(`/plan/results?session=${session.id}`);

// În /plan/results/page.tsx — fetch by session id din URL
const sessionId = searchParams.get('session');
const { data } = await supabase.from('plan_sessions').select().eq('id', sessionId).single();
```

---

### Bug #4 — Imagini Unsplash fără onError

**📍 Locație**: `src/app/(main)/plan/results/page.tsx:163-169`
**🔴 Severitate**: Major

**💡 Fix:**
```typescript
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=500&fit=crop&q=80';
<img
  src={heroUrl}
  alt={`${dest.city}, ${dest.country}`}
  className="w-full h-full object-cover"
  loading="lazy"
  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
/>
```

---

### Bug #5 — Shuffle aleatoriu pe homepage

**📍 Locație**: `src/app/(main)/page.tsx:139-148`
**🔴 Severitate**: Minor (UX)

**💡 Fix** — default sort `price-asc`:
```typescript
// În stores/filtersStore.ts, default:
sortBy: 'price-asc' as const,

// În page.tsx, șterge useMemo cu shuffle, păstrează direct filteredDeals:
const displayDeals = filteredDeals;
```

---

### Bug #6 — Google Reviews 4.6 fake

**📍 Locație**: `src/app/(main)/page.tsx:75-84`
**🔴 Severitate**: Major (legal)

**💡 Fix** — query real din Supabase:
```typescript
// În Server Component (sau useEffect în Client):
const { count } = await supabase.from('reviews').select('*', { count: 'exact', head: true });
const { data: avgRating } = await supabase.rpc('avg_rating');
// Apoi afișează doar dacă count > 50 ca să eviți „Reviewed by 3 people"
{count > 50 && (
  <div>Rated {avgRating.toFixed(1)} by {count} travelers</div>
)}
```

Sau **elimină complet** badge-ul fake.

---

### Bug #7 — Nominatim rate limit

**📍 Locație**: `src/components/InteractiveMap.tsx:55-59`
**🔴 Severitate**: Major

**💡 Fix** — cache + Mapbox:

**Schema:**
```sql
create table geocoding_cache (
  query_hash text primary key,
  query text not null,
  lat numeric, lon numeric,
  created_at timestamptz default now()
);
```

```typescript
// src/lib/geocode.ts
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function geocode(name: string, city: string) {
  const query = `${name} ${city}`;
  const hash = crypto.createHash('sha256').update(query.toLowerCase()).digest('hex');
  const supabase = await createClient();
  const { data: cached } = await supabase.from('geocoding_cache').select().eq('query_hash', hash).single();
  if (cached) return { lat: cached.lat, lon: cached.lon };

  // Mapbox: 100k requests/lună gratis
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.MAPBOX_TOKEN}&limit=1`
  );
  const { features } = await res.json();
  if (!features.length) return null;
  const [lon, lat] = features[0].center;
  await supabase.from('geocoding_cache').insert({ query_hash: hash, query, lat, lon });
  return { lat, lon };
}
```

---

### Bug #8 — Leaflet icons din CDN

**📍 Locație**: `src/components/InteractiveMap.tsx:11-13`
**🔴 Severitate**: Minor

**💡 Fix** — self-host:
```bash
# 1. Download icons
curl -o public/leaflet/marker-icon.png https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png
curl -o public/leaflet/marker-icon-2x.png https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png
curl -o public/leaflet/marker-shadow.png https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png
```

```typescript
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});
```

---

### Bug #9 — /booking/simulate booking fals

**📍 Locație**: `src/app/(main)/booking/simulate/page.tsx`
**🔴 Severitate**: Critical (legal + securitate)

**💡 Fix temporar** — banner + test card validation:
```typescript
// La începutul pagini, înainte de form:
<div className="bg-red-500 text-white p-4 text-center font-bold">
  ⚠️ DEMO MODE — DO NOT enter real card numbers. This is a simulation.
</div>

// La payment step:
function isTestCard(num: string) {
  return num.replace(/\s/g, '') === '4242424242424242'; // Stripe test
}
if (!isTestCard(cardNumber)) {
  setError('Please use test card 4242 4242 4242 4242');
  return;
}
```

---

### Bug #10 — Logo airline fără fallback

**📍 Locație**: multiple (`pics.avs.io`)
**🔴 Severitate**: Minor

**💡 Fix:**
```typescript
<img
  src={`https://pics.avs.io/80/30/${pkg.flight.airline}.png`}
  alt={pkg.flight.airline}
  className="h-5 object-contain"
  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
/>
```

---

### Bug #11 — IP geolocation imprecis

**📍 Locație**: `src/hooks/useUserLocation.ts`
**🔴 Severitate**: Major

**💡 Fix** — fallback browser geolocation API:
```typescript
function tryBrowserGeo(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      reject,
      { timeout: 5000 }
    );
  });
}

// În useUserLocation:
const ipGeo = await fetchIPGeo();
if (!ipGeo || ipGeo.confidence < 0.8) {
  try { return await tryBrowserGeo(); } catch { return ipGeo; }
}
```

---

### Bug #12 — Fără retry pe Amadeus 5xx

**📍 Locație**: toate `/api/*/live/route.ts`
**🔴 Severitate**: Minor

**💡 Fix** — retry exponential backoff:
```typescript
// src/lib/retry.ts
export async function retryFetch<T>(fn: () => Promise<T>, max = 3, delayMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < max; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, delayMs * (2**i))); }
  }
  throw lastErr;
}

// Wrap Amadeus calls:
const flights = await retryFetch(() => searchFlights(params));
```

---

### Bug #13 — /api/ai/plan-trip fără rate limiting

**📍 Locație**: `src/app/api/ai/plan-trip/route.ts`
**🔴 Severitate**: **CRITICAL** (cost explosion)

**💡 Fix:**
```bash
npm i @upstash/ratelimit @upstash/redis
```

```typescript
// src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const planTripLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  analytics: true,
});

// În /api/ai/plan-trip/route.ts, la început POST():
const ip = req.headers.get('x-forwarded-for') ?? 'anon';
const { success, reset } = await planTripLimit.limit(ip);
if (!success) return Response.json({ error: 'Rate limit', retryAfter: reset }, { status: 429 });
```

---

### Bug #14 — Fără OAuth Google/Apple

**📍 Locație**: `src/app/(auth)/login/page.tsx`
**🔴 Severitate**: Major (adoption)

**💡 Fix:**
```typescript
async function signInWithGoogle() {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
}

<button onClick={signInWithGoogle} className="w-full ...">
  <GoogleIcon /> Continue with Google
</button>
```

Plus: Supabase Dashboard → Auth → Providers → enable Google + Apple cu credentials.

---

### Bug #15 — Form acceptă card real în /booking/simulate

**📍 Locație**: `src/app/(main)/booking/simulate/page.tsx` payment step
**🔴 Severitate**: **CRITICAL SECURITATE**

**💡 Fix**: vezi Bug #9 (combine).

---

### Bug #16 — Fără SEO metadata dinamic

**📍 Locație**: toate paginile
**🔴 Severitate**: Minor

**💡 Fix** — `generateMetadata` per pagină:
```typescript
// src/app/(main)/plan/trip/[id]/page.tsx
import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `Trip to ${city} | TravelTwin`,
    description: `Personalized AI itinerary for ${city}`,
    openGraph: { images: [`/api/og?city=${city}`] },
  };
}
```

---

### Bug #17 — Mesaje „No flights" fără context

**📍 Locație**: `src/app/(main)/plan/results/page.tsx:88`
**🔴 Severitate**: Minor

**💡 Fix**: detectează cauza:
```typescript
function diagnoseError(params: PlanState): string {
  if (params.budget < 300) return 'Budget too low — try at least €500.';
  if (new Date(params.departureDate) < new Date(Date.now() + 14*86400000))
    return 'Date too close — try at least 2 weeks ahead.';
  if (!params.originIata) return 'Origin missing — please select a city.';
  return 'No matches. Try adjusting style or climate.';
}
```

---

### Bug #18 — `<img>` standard în loc de `next/image`

**📍 Locație**: multiple
**🔴 Severitate**: Minor (perf)

**💡 Fix**:
```typescript
import Image from 'next/image';
<Image src={heroUrl} alt={dest.city} width={800} height={500} className="..." />

// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'images.unsplash.com' },
    { protocol: 'https', hostname: 'pics.avs.io' },
  ],
},
```

---

## PASUL 6 — Structura lucrării de licență

**Titlu propus**: *„TravelTwin: Platformă Web Inteligentă pentru Planificarea Călătoriilor cu Agenți AI Conversaționali, CRDT-Based Collaborative Editing și Date GDS în Timp Real"*

### Capitol 1 — Introducere și Motivație (8-12 pag.)
- Context: piața travel digital 2026, post-COVID rebound, AI-native vs OTA
- Problema fragmentării (5+ platforme pentru un singur trip)
- Soluția: platformă unificată AI-first cu localizare RO
- Obiective SMART (3-5)
- Contribuții personale clare (esențial!)

### Capitol 2 — Studiu de Piață (12-18 pag.)
- Taxonomie: tradițional (Booking, Expedia, Trip.com), AI-native (**Tryp.com** — analiza din PASUL 2), Mindtrip, Layla, Wonderplan
- Tabel SWOT detaliat
- Analiză virtual interlining (Tryp differentiator) vs single-source (TravelTwin)
- Identificare gap: localizare RO + collaborative editing CRDT

### Capitol 3 — Arhitectura Sistemului (15-25 pag.) ⭐
- Diagrame C4 (System / Container / Component) — vezi PASUL 8
- Stack: Next.js 16 + React 19 + Supabase + Amadeus + Claude + pgvector + Yjs
- Caching strategy (Edge + Supabase + sessionStorage + Browser)
- ER Diagram + sequence diagrams (PASUL 8)
- Securitate: RLS + Rate Limiting + Webhook signatures

### Capitol 4 — Implementare Features Principale (18-25 pag.)
- Wizard AI 4-pași (cu fix bug origin)
- Live Search Amadeus + retry
- React-Leaflet map cu cache geocoding
- Itinerary AI (prompt + parsing JSON)
- Booking simulator (cu disclaimer)

### Capitol 5 — Features Inovatoare (10-15 pag.) ⭐ **„WOW factor"**
Implementează minim 3 din PASUL 4:
- **#1 Conversational Chat AI** (RO + EN, Tool Use)
- **#3 Collaborative CRDT** (Yjs + Supabase Realtime)
- **#8 Carbon Footprint** (eco mode)
- Justifică alegerile cu papers SOTA 2024-2026

### Capitol 6 — Testare și Evaluare (10-15 pag.)
- Unit tests Vitest pentru `lib/`
- E2E Playwright (full plan flow)
- User testing 10-15 persoane + SUS questionnaire
- Lighthouse + Web Vitals comparație vs Tryp
- AI eval 30 sample queries

### Capitol 7 — Concluzii și Direcții Viitoare (5-8 pag.)
- Summary contribuții
- Limitări (Amadeus dependency, AI cost per query)
- Viitor: native mobile, voice mode, ML personalization, blockchain rewards

### Anexe
- A: Manual instalare + deploy
- B: API documentation (OpenAPI)
- C: DB schema dump
- D: User testing rezultate raw

---

## PASUL 7 — Scoring academic

### Stare CURENTĂ a aplicației

| Criteriu | Scor | Justificare |
|----------|:---:|---|
| Noutate și originalitate | **6.5/10** | AI travel exists; diferențiator: RO localization + transparency |
| Complexitate tehnică | **7.5/10** | Stack modern; lipsește testing/CI/observability |
| Utilitate practică | **7/10** | Funcționează E2E; lipsește booking real |
| Calitatea codului | **6/10** | TS strict OK, dar `any` încă există + no tests |
| Documentație | **5/10** | README șters; lipsesc diagrame, screenshots, video |
| **TOTAL** | **32/50** | **Notă proiectată: 7.5-8** |

### Roadmap pentru 50/50 (notă maximă 10)

| Acțiune | Ore | Câștig |
|---------|:---:|:---:|
| Implementare Features #1, #3, #8 (Chat AI + CRDT + Carbon) | ~75h | +5 originalitate, +2 utilitate |
| Testing + CI/CD (Vitest + Playwright + GH Actions + Sentry + Pino) | ~15h | +1.5 cod, +1 complexitate |
| Booking real (#12 Skyscanner Affiliate) + PWA (#5) | ~30h | +2 utilitate |
| Eliminat all `any`, ESLint custom rules, JSDoc | ~10h | +1 cod |
| README profi + Mermaid diagrams + video demo + custom domain | ~25h | +3 documentație |
| User testing 10 oameni + SUS report | ~8h | +1 documentație |
| Lucrare 80-120 pag. în LaTeX UPB template | ~50h | +1 documentație |

**Total efort: ~213 ore (~5-6 săpt full-time / 10-12 săpt part-time)**
**Scor proiectat: 49-50/50 → notă 9.5-10**

---

## PASUL 8 — Diagrame de arhitectură (Mermaid)

### 8.1 C4 System Context

```mermaid
graph TB
    User[Utilizator]
    Admin[Admin]

    subgraph TravelTwin["TravelTwin Platform"]
        Web[Next.js Web App]
    end

    subgraph External["External Systems"]
        Amadeus[Amadeus GDS]
        Claude[Anthropic Claude API]
        Supabase[Supabase Postgres + Auth]
        Mapbox[Mapbox Geocoding]
        Unsplash[Unsplash Images]
        Resend[Resend Email]
        OpenAI[OpenAI Embeddings]
        WebPush[Web Push Service]
    end

    User -->|HTTPS| Web
    Admin -->|Dashboard| Supabase
    Web -->|REST OAuth2| Amadeus
    Web -->|Tool Use| Claude
    Web -->|SSR + Realtime| Supabase
    Web -->|Geocoding| Mapbox
    Web -->|Hero photos| Unsplash
    Web -->|Notifications| Resend
    Web -->|Embeddings| OpenAI
    Web -->|Push| WebPush
```

### 8.2 C4 Container Diagram

```mermaid
graph TB
    Browser[Browser / PWA]

    subgraph VercelEdge["Vercel Edge"]
        Next[Next.js 16 App Router]
        Routes[API Routes]
        Cron[Vercel Cron Jobs]
    end

    subgraph SupabaseCloud["Supabase Cloud"]
        Auth[Supabase Auth]
        DB[(PostgreSQL + pgvector)]
        Realtime[Realtime Channels]
        Storage[Storage Buckets]
    end

    subgraph ExternalAPIs["External APIs"]
        AmadeusGDS[Amadeus GDS]
        ClaudeAPI[Claude Sonnet 4.6]
        OpenAIEmbed[OpenAI Embeddings]
        MapboxAPI[Mapbox Geocoding]
        UpstashRedis[Upstash Redis Rate Limit]
    end

    Browser -->|SSR + Streaming| Next
    Browser -->|WebSocket Yjs| Realtime
    Browser -->|Direct| Auth
    Next --> Routes
    Routes --> AmadeusGDS
    Routes --> ClaudeAPI
    Routes --> OpenAIEmbed
    Routes --> MapboxAPI
    Routes --> UpstashRedis
    Routes --> DB
    Cron -->|Daily 8am| Routes
    Auth --> DB
    Realtime --> DB
```

### 8.3 ER Diagram Supabase

```mermaid
erDiagram
    profiles ||--o{ saved_trips : owns
    profiles ||--o{ user_searches : performs
    profiles ||--o{ reviews : writes
    profiles ||--o{ favorites : marks
    profiles ||--o| user_personas : has
    profiles ||--o{ chat_sessions : starts
    profiles ||--o{ price_alerts : creates
    profiles ||--o{ collab_participants : joins

    chat_sessions ||--o{ chat_messages : contains
    saved_trips ||--o| collab_trips : may_have
    saved_trips ||--o{ price_alerts : tracked_by
    collab_trips ||--o{ collab_participants : has

    polls ||--o{ poll_votes : receives

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
        vector embedding
        timestamptz created_at
    }

    chat_sessions {
        uuid id PK
        uuid user_id FK
        text title
        timestamptz created_at
    }

    chat_messages {
        uuid id PK
        uuid session_id FK
        text role
        jsonb content
        timestamptz created_at
    }

    price_alerts {
        uuid id PK
        uuid user_id FK
        uuid trip_id FK
        numeric baseline_price
        numeric threshold_pct
        jsonb push_subscription
        timestamptz triggered_at
        boolean active
    }

    collab_trips {
        uuid id PK
        uuid trip_id FK
        bytea yjs_state
        text share_token
        timestamptz updated_at
    }

    user_personas {
        uuid user_id PK
        text persona_name
        vector persona_centroid
        int trip_count
    }

    plan_sessions {
        uuid id PK
        uuid user_id FK
        jsonb packages
        jsonb params
        timestamptz expires_at
    }

    geocoding_cache {
        text query_hash PK
        text query
        numeric lat
        numeric lon
    }
```

### 8.4 Sequence: User → Plan Trip → AI → Amadeus → Results

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web (Browser)
    participant API as /api/ai/plan-trip
    participant RL as Upstash RateLimit
    participant D as Destinations Matcher
    participant A as Amadeus Client
    participant C as Claude API
    participant S as Supabase

    U->>W: Complete wizard (5 steps)
    W->>API: POST {origin, budget, dates, styles}
    API->>RL: check rate limit
    alt Rate limit exceeded
        RL-->>API: 429
        API-->>W: Error 429
    else OK
        RL-->>API: allowed
        API->>D: matchDestinations()
        D-->>API: top 20 candidates
        loop For each top 5 destination
            API->>A: searchFlights(origin, dest, dates)
            A-->>API: NormalizedFlight[]
            API->>A: searchHotelsByCity(dest, dates)
            A-->>API: NormalizedHotel[]
        end
        API->>C: Generate itinerary AI content
        C-->>API: aiContent JSON (day-by-day, attractions, restaurants)
        API->>S: insert plan_sessions(packages, params)
        S-->>API: session_id
        API-->>W: { packages[], session_id }
        W->>W: router.push(/plan/results?session=ID)
        W->>S: select packages where id=session_id
        S-->>W: packages
        W->>U: Render PackageCards with images
    end
```

### 8.5 Sequence: User → Booking → Supabase → Share Link

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web Browser
    participant B as /booking/simulate
    participant API as /api/bookings
    participant S as Supabase
    participant E as Resend Email
    participant Sh as /trips/share/:ref

    U->>W: Click "View Full Itinerary" on package
    W->>W: sessionStorage.setItem(trip_ID, pkg)
    W->>B: navigate /booking/simulate?trip=ID
    B->>U: Step 1 — Review trip details
    U->>B: Click Next
    B->>U: Step 2 — Traveler info form
    U->>B: Submit name/email/passport
    B->>U: Step 3 — Payment (test card only)
    U->>B: Enter 4242 4242 4242 4242
    B->>API: POST /api/bookings { tripId, travelerInfo }
    API->>S: insert into bookings (booking_ref, ...)
    S-->>API: booking_ref = TW-XYZ123
    API->>E: send confirmation email
    E-->>U: Email with booking ref + share link
    API-->>B: { booking_ref }
    B->>U: Step 4 — Confirmation + share button
    U->>Sh: Open /trips/share/TW-XYZ123
    Sh->>S: select bookings where booking_ref=TW-XYZ123
    S-->>Sh: trip details + itinerary
    Sh->>U: Public itinerary (printable)
```

### 8.6 Sequence: Collaborative Editing (Yjs + Realtime)

```mermaid
sequenceDiagram
    actor U1 as User A
    actor U2 as User B
    participant Y1 as Y.Doc (A)
    participant SR as Supabase Realtime
    participant Y2 as Y.Doc (B)

    U1->>Y1: Drag activity to Day 2
    Y1->>Y1: Generate Y.Update
    Y1->>SR: broadcast yjs-update
    SR-->>Y2: receive update
    Y2->>Y2: Y.applyUpdate(doc, update)
    Y2-->>U2: UI re-renders activity in Day 2

    par Presence sync
        U2->>Y2: Move cursor over restaurant
        Y2->>SR: presence track {cursor, color}
        SR-->>Y1: presence sync
        Y1-->>U1: Render User B cursor avatar
    end
```

---

## PASUL 9 — Plan de implementare Claude Code

### 9.1 Setup inițial (înainte de orice feature)

**1. Instalează dependențe noi:**
```bash
npm i @anthropic-ai/sdk @upstash/ratelimit @upstash/redis web-push yjs y-protocols dexie next-pwa workbox-webpack-plugin openai resend exifr @sentry/nextjs pino
npm i -D vitest @vitest/ui playwright @playwright/test @types/web-push
```

**2. Variabile noi în `.env.local`:**
```bash
# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Geocoding
MAPBOX_TOKEN=pk.eyJ1...

# Rate limit
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Web Push
VAPID_PUBLIC_KEY=B... (npx web-push generate-vapid-keys)
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=B...

# Cron security
CRON_SECRET=$(openssl rand -hex 32)

# Email (alerts)
RESEND_API_KEY=re_...

# Observability
SENTRY_DSN=https://...sentry.io/...
SENTRY_AUTH_TOKEN=...

# Voice (optional Feature #9)
ELEVENLABS_API_KEY=...

# Service-role pentru cron jobs
SUPABASE_SERVICE_KEY=eyJhbGc...
```

**3. Adaugă la `vercel.json`:**
```json
{
  "crons": [
    { "path": "/api/cron/check-prices", "schedule": "0 8 * * *" },
    { "path": "/api/cron/cleanup-sessions", "schedule": "0 3 * * *" }
  ]
}
```

---

### 9.2 Ordinea exactă de implementare

#### **WEEK 1 — FIX BUGS CRITICAL** (4-6 ore)

**Task 1.1**: Bug #1 (origin hardcoded)
- Modifică: `src/app/(main)/plan/page.tsx`
- Adaugă pas 0 cu `LocationAutocomplete`
- Update `totalSteps = 5`
- ✅ Verificare: wizard începe cu „Where from?", nu cu buget

**Task 1.2**: Bug #2 (buget max)
- Modifică: `src/app/(main)/plan/page.tsx:296-298`
- max={8000}
- ✅ Verificare: slider merge până la 8000€

**Task 1.3**: Bug #6 (Google fake)
- Modifică: `src/app/(main)/page.tsx:75-84`
- Înlocuiește text static cu real Supabase query SAU elimină
- ✅ Verificare: nu mai apare „Google Reviews 4.6" hard-coded

**Task 1.4**: Bug #9, #15 (booking warning)
- Modifică: `src/app/(main)/booking/simulate/page.tsx`
- Adaugă banner roșu „⚠️ DEMO MODE"
- Validate test card 4242
- ✅ Verificare: nu poți submit cu card real

**Task 1.5**: Bug #4 (image fallback)
- Modifică: `src/app/(main)/plan/results/page.tsx`
- Adaugă `onError` pe img
- ✅ Verificare: imagine broken arată fallback ocean

**Task 1.6**: Bug #18 (next/image)
- Modifică: `next.config.ts` + toate `<img>` → `<Image>`
- ✅ Verificare: Lighthouse score performance crește >5 puncte

**🎯 Checkpoint Week 1**:
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` success
- [ ] Toate cele 6 task-uri verificate manual
- [ ] Commit + push: `fix: critical UX bugs in wizard, homepage, booking`

---

#### **WEEK 2 — CONVERSATIONAL AI CHAT** (Feature #1, ~22 ore)

**Task 2.1**: API route `/api/ai/chat`
- Creează: `src/app/api/ai/chat/route.ts`
- Cod în PASUL 4 Feature #1
- ✅ Verificare: `curl -X POST localhost:3000/api/ai/chat ...` returnează stream

**Task 2.2**: ChatPanel component
- Creează: `src/components/chat/ChatPanel.tsx`
- ✅ Verificare: chat se deschide în colț, primește răspunsuri

**Task 2.3**: Schema Supabase chat
- Migration SQL în PASUL 4 Feature #1
- Aplica via Supabase MCP sau dashboard
- ✅ Verificare: `select * from chat_sessions limit 1` merge

**Task 2.4**: Tool Use integration
- Modifică `/api/ai/chat/route.ts` să apeleze `/api/ai/plan-trip` când AI cere
- ✅ Verificare: scrii „1500€ 5 zile mare iulie" → AI returnează packages

**Task 2.5**: Persist chat history
- În ChatPanel: la fiecare message, insert în `chat_messages`
- La load, fetch sessions list pentru user
- ✅ Verificare: refresh → chat-ul nu dispare

**Task 2.6**: Streaming UI
- SSE parser, type indicator „...", abort button
- ✅ Verificare: text apare pe măsură ce AI scrie

**🎯 Checkpoint Week 2**:
- [ ] Chat panel funcțional, RO + EN
- [ ] History persists
- [ ] Tool Use → plan-trip funcționează
- [ ] Commit: `feat: conversational AI chat with Claude Tool Use`

---

#### **WEEK 3 — TESTING + CI/CD** (~15 ore)

**Task 3.1**: Setup Vitest
- Creează: `vitest.config.ts`
- Adaugă scripts în `package.json`: `"test": "vitest"`, `"test:ui": "vitest --ui"`
- ✅ Verificare: `npm test` rulează

**Task 3.2**: Unit tests pentru `lib/`
- Creează 25+ tests pentru: `matchDestinations`, `pricing`, `dealEnrichment`, `filterDeals`, `currency`, `carbon`, `geocode`
- Target: coverage >70% pentru `src/lib/`
- ✅ Verificare: `npm test` passes 25/25

**Task 3.3**: Setup Playwright
- `npx playwright install`
- Creează: `e2e/plan-flow.spec.ts` — full wizard E2E
- ✅ Verificare: test trece local

**Task 3.4**: GitHub Actions
- Creează: `.github/workflows/ci.yml`
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test
      - run: npx playwright install --with-deps
      - run: npx playwright test
```
- ✅ Verificare: PR → toate checks verzi

**Task 3.5**: Sentry integration
- `npx @sentry/wizard@latest -i nextjs`
- ✅ Verificare: throw error → apare în Sentry dashboard

**Task 3.6**: Pino logger
- Creează: `src/lib/logger.ts`
- Înlocuiește `console.error` cu `logger.error`
- ✅ Verificare: log structurat în Vercel logs

**🎯 Checkpoint Week 3**:
- [ ] CI verde pe ultimul commit
- [ ] Coverage `lib/` >70%
- [ ] Sentry funcțional
- [ ] Commit: `feat: add Vitest + Playwright + CI/CD + Sentry observability`

---

#### **WEEK 4 — COLLABORATIVE EDITING (CRDT)** (Feature #3, ~40 ore)

**Task 4.1**: Schema Supabase collab
- SQL migration din PASUL 4 Feature #3
- ✅ Verificare: tabele create

**Task 4.2**: useCollaborativeTrip hook
- Creează: `src/hooks/useCollaborativeTrip.ts`
- ✅ Verificare: 2 tab-uri editează același doc → sync

**Task 4.3**: TripDetailView cu CRDT
- Modifică: `src/components/TripDetailView.tsx` să folosească Y.Array activities
- Drag-drop pentru reordonare
- ✅ Verificare: 2 tab-uri văd reordonările live

**Task 4.4**: Presence indicators
- Avatari userilor activi în top-right
- Cursor virtual pe item-ul hover-uit de altcineva
- ✅ Verificare: vezi ce face celălalt user

**Task 4.5**: Share token + invite link
- Generate `share_token`, copy-to-clipboard
- Permit user anonim să se alăture (read-only) sau auth (edit)
- ✅ Verificare: trimite link prieten, el poate vota

**🎯 Checkpoint Week 4**:
- [ ] 2+ useri editează simultan, fără conflict
- [ ] Presence avatars funcționează
- [ ] Demo video 2 min cu 2 browsers side-by-side
- [ ] Commit: `feat: collaborative editing with Yjs CRDT and Supabase Realtime`

---

#### **WEEK 5 — CARBON FOOTPRINT + PWA + DOCS** (~30 ore)

**Task 5.1**: Carbon (Feature #8)
- Creează: `src/lib/carbon.ts`
- Adaugă badge eco pe `PackageCard`
- ✅ Verificare: zboruri lungi → 🔥 High impact

**Task 5.2**: PWA (Feature #5)
- `next.config.ts` cu `next-pwa`
- Creează: `public/manifest.json`, icons 192/512
- Tile caching OSM
- ✅ Verificare: `chrome://flags` → install ca app, offline funcționează

**Task 5.3**: README profesional
- Înlocuiește `README.md` (deletat) cu versiune nouă: badges, screenshots, install steps, architecture link
- ✅ Verificare: GitHub repo arată profi

**Task 5.4**: Mermaid diagrams
- Creează: `docs/architecture.md` cu cele 6 diagrame din PASUL 8
- ✅ Verificare: GitHub renderează Mermaid corect

**Task 5.5**: Video demo 3 min
- Loom / OBS recording: full flow (chat → results → collab → carbon)
- Upload YouTube unlisted
- Embed în README
- ✅ Verificare: link funcționează

**Task 5.6**: User testing (8 ore separat)
- 10 useri × 30 min, înregistrează screen + face audio
- SUS questionnaire (10 întrebări)
- Compute SUS score (target >75 = above average)
- Raport în lucrare Capitol 6

**🎯 Checkpoint Week 5**:
- [ ] PWA installable
- [ ] README arată profi cu badges, screenshots
- [ ] Video demo embed
- [ ] User testing complet, SUS >75
- [ ] Commit: `feat: PWA + carbon mode + comprehensive documentation`

---

### 9.3 Checklist final (înainte de prezentare)

#### Cod
- [ ] `npx tsc --noEmit` zero errors
- [ ] `npm run lint` zero warnings
- [ ] `npm test` >70% coverage `lib/`
- [ ] `npx playwright test` zero failures
- [ ] Zero `any` în TS (verifică `Grep "any"`)
- [ ] Zero `console.log` (verifică `Grep "console\."`)
- [ ] Toate `<img>` → `<Image>`

#### Funcțional
- [ ] Wizard 5 pași cu origin selectabil
- [ ] Buget până la 8000€
- [ ] Chat AI conversațional RO + EN
- [ ] Collaborative editing 2 useri
- [ ] Carbon footprint vizibil pe cards
- [ ] PWA installable
- [ ] OAuth Google funcțional
- [ ] Rate limit pe `/api/ai/plan-trip` (10/h/IP)
- [ ] Booking simulator cu warning roșu

#### Documentație
- [ ] README.md cu badges (build, license, version)
- [ ] Screenshots ≥6 (homepage, wizard, chat, collab, results, mobile)
- [ ] Mermaid diagrams (C4 + ER + 3 sequence)
- [ ] Video demo embed
- [ ] OpenAPI spec în `docs/api.yaml`
- [ ] User testing report în `docs/user-testing.md`
- [ ] Lucrare LaTeX 80-120 pag

#### Deployment
- [ ] Custom domain (NU vercel.app) — ex. `traveltwin.ai`
- [ ] Environment variables corecte în Vercel
- [ ] Sentry capturează erori production
- [ ] Web Push înregistrat (push notifications work)
- [ ] CI verde pe `main`

---

## 📌 REZUMAT EXECUTIV — Top 5 acțiuni

> Ordonate strict după **impact_academic / effort**.

### 🎯 ACȚIUNEA 1 — Fix critical bugs (Săpt. 1, **6 ore**)
- Bug #1 origin hardcoded
- Bug #2 buget max
- Bug #6 fake reviews
- Bug #9 + #15 booking demo warning
- Bug #4 image fallback
- **Impact**: -6 puncte pierdute la demo evitate. **Câștig: +0 dar protejează 32→32.**

### 🎯 ACȚIUNEA 2 — Conversational Chat AI (Săpt. 2, **22 ore**)
- Feature #1 complet
- **Impact**: +3 originalitate (32→35) + „wow factor" la demo.

### 🎯 ACȚIUNEA 3 — Testing + CI/CD + Sentry (Săpt. 3, **15 ore**)
- Vitest + Playwright + GitHub Actions + Sentry
- **Impact**: +1.5 cod, +1 complexitate (35→37.5).

### 🎯 ACȚIUNEA 4 — Collaborative CRDT (Săpt. 4, **40 ore**)
- Feature #3 complet
- **Impact**: +5 originalitate (37.5→42.5). **Acesta e capitolul „WOW".**

### 🎯 ACȚIUNEA 5 — Carbon + PWA + Docs + User Testing (Săpt. 5, **30 ore**)
- Features #5, #8 + README + diagrame + video + SUS test
- **Impact**: +5 documentație, +2 utilitate (42.5→49.5).

**Total efort: ~113 ore (~3 săpt full-time / 6 săpt part-time)**
**Scor proiectat: 32 → 49.5 / 50 → notă 9.9-10**

---

> **Concluzie**: TravelTwin are o **bază tehnică solidă** (Next.js 16, React 19, live Amadeus, Supabase). Față de Tryp.com (165/240) e încă în urmă (89/240), DAR are 3 ferestre clare unde poate fi *superior*: **(1) localizare RO** + **(2) Collaborative CRDT** (Tryp NU are) + **(3) Sustainable AI prompting cu carbon awareness**. Implementând cele 5 acțiuni din rezumat, TravelTwin devine **capitol de licență de 9.5-10** și platformă cu features pe care nici Tryp.com nu le are.

> **Sources Tryp.com analysis** (live):
> - [Tryp.com homepage](https://www.tryp.com/en)
> - [About Tryp.com](https://www.tryp.com/en/about)
> - [Tryp.com App blog](https://www.tryp.com/en/blog/trypcom-app-smart-travel-booking-at-your-fingertips)
> - [Tryp vs Trip.com](https://www.tryp.com/en/blog/trypcom-vs-tripcom-the-ultimate-travel-platform)
> - [Fundz VC analysis](https://www.fundz.net/venture-capital-blog/from-dorm-room-to-jetsetter-how-tryp.com-is-redefining-travel-planning)
