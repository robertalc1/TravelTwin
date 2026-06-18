# Changelog bază de date (Supabase)

Modificări aplicate pe proiectul Supabase `mfargelrfrzxogelqrqz` (TravelTwin).
Aplicate direct ca migrări (vizibile în Dashboard → Database → Migrations) și
salvate ca fișiere `.sql` în `supabase/migrations/`.

---

## 1. Eliminat — tabele vechi nefolosite

Migrare: `drop_legacy_seed_tables` (`20260618211936`)

| Tabel șters | Rânduri | De ce |
|---|---|---|
| `flights` | ~271.888 | Seed brazilian din template-ul original (Recife, Florianopolis…) |
| `hotels` | ~40.552 | Idem (Hotel A/K, prețuri statice) |
| `user_searches` | 0 | Istoric căutări — nefolosit |

**Motiv:** singurii consumatori erau endpoint-urile `/api/recommendations` și
`/api/searches`, care **nu erau apelate de nicăieri din UI**. Datele reale vin
live din Tripadvisor și se cache-uiesc în `api_cache`. Verificat că niciun
tabel viu nu avea foreign key către acestea înainte de `DROP`.

```sql
DROP TABLE IF EXISTS public.flights CASCADE;
DROP TABLE IF EXISTS public.hotels CASCADE;
DROP TABLE IF EXISTS public.user_searches CASCADE;
```

> În cod s-au șters și endpoint-urile orfane `src/app/api/recommendations` și
> `src/app/api/searches`, plus referințele din `README.md` / `TEHNOLOGII.md`.

---

## 2. Reparat — tabelul `saved_trips`

Migrare: `align_saved_trips_to_app_schema` (`20260618212125`)

**Problema:** la booking (`/booking/simulate`) apărea eroarea
*„Could not find the 'days' column of 'saved_trips' in the schema cache"* —
schema tabelului nu se potrivea cu ce scrie/citește aplicația.

**Adăugat** (coloane noi pe care le folosește codul):

| Coloană | Tip |
|---|---|
| `destination` | `text` |
| `origin` | `text` |
| `days` | `integer` |
| `outbound_flight` | `jsonb` |
| `return_flight` | `jsonb` |

**Relaxat** (coloane vechi NOT NULL pe care codul nu le populează → acum
nullable, ca să nu mai blocheze insert-ul; **nimic șters, zero pierdere de
date**): `name`, `destination_city`, `departure_city`, `duration_days`.

**Modificat** constrângerea de status (acceptă toate valorile folosite):

```sql
CHECK (status IN ('planning','planned','booked','completed','cancelled'))
```

> RLS pe `saved_trips` (owner = `auth.uid() = user_id`) exista deja și a rămas
> neatins. Migrarea e non-distructivă și idempotentă.

---

## 3. Stare finală — tabele rămase

| Tabel | Rol |
|---|---|
| `api_cache` | Cache live Tripadvisor/Open-Meteo (zboruri, hoteluri, restaurante, vreme, geo). **Sursa reală de date.** |
| `favorites` | Favoritele utilizatorului (`item_type`: city/attraction/hotel/trip) |
| `profiles` | Profiluri utilizatori |
| `saved_trips` | Călătorii rezervate prin booking simulator |

---

## 4. Efect în aplicație

- ✅ Booking-ul se salvează corect în `saved_trips` (fără eroarea de sync).
- ✅ Oferta cumpărată apare în **Profil → My Trips** și se poate redeschide
  (pagina `/trips/[id]` încarcă din `saved_trips` când nu e în sessionStorage).
- ✅ ~312.000 de rânduri moarte eliminate → bază de date mai curată.
