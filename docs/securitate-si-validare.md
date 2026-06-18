# Validare formulare & securitate input

Acest document descrie cum sunt validate câmpurile din aplicație și cum se
apără TravelTwin împotriva injecției SQL și a altor atacuri pe input.

---

## 1. Biblioteca de validatori — `src/lib/validation.ts`

Validatori **puri** (fără React, fără I/O): primesc un `string` și returnează
`null` dacă valoarea e validă, sau un mesaj de eroare (`string`) dacă nu.
Pot rula atât în browser (feedback instant), cât și pe server (refolosibil).

| Funcție | Reguli | Mesaj la eroare |
|---|---|---|
| `validatePersonName(v, field)` | obligatoriu; 2–50 caractere; litere Unicode (inclusiv diacritice `ă â î ș ț`), spațiu, `-`, `'`, `.` | „… is required / must be 2–50 / contains invalid characters" |
| `validateEmail(v)` | obligatoriu; max 254; format `local@domeniu.tld` | „Enter a valid email address" |
| `validatePhone(v)` | obligatoriu; doar `+`, cifre, spațiu, `()`, `-`; **7–15 cifre** | „Enter a valid phone number (7–15 digits)" |
| `validateAdultDateOfBirth(v, minAge=18)` | dată validă; nu în viitor; vârstă plauzibilă (≤120); **vârstă ≥ 18** | „You must be at least 18 years old to book" |
| `validatePassport(v)` | obligatoriu; **5–15** caractere alfanumerice | „Passport must be 5–15 letters or digits" |
| `validateCardNumber(v)` | doar cifre; **13–19** lungime; **check Luhn** | „Enter a valid card number" |
| `validateExpiry(v)` | format `MM/YY`; lună 01–12; **nu expirat** | „Card has expired" / „Use MM/YY format" |
| `validateCVC(v)` | doar cifre; **3–4** (4 = Amex) | „CVC must be 3 or 4 digits" |
| `luhnValid(digits)` · `ageInYears(dob)` | helperi folosiți de validatorii de mai sus | — |

---

## 2. Unde sunt aplicate

Fluxul de booking — `src/app/[locale]/(main)/booking/simulate/page.tsx`:

**Pasul „Traveler"** (`validateTraveler`)
| Câmp | Validator |
|---|---|
| First / Last name | `validatePersonName` |
| Email | `validateEmail` |
| Phone | `validatePhone` |
| Date of Birth | `validateAdultDateOfBirth` (gate 18+) |
| Passport | `validatePassport` |

**Pasul „Payment"** (`validatePayment`)
| Câmp | Validator |
|---|---|
| Card Number | `validateCardNumber` |
| Expiry | `validateExpiry` |
| CVC | `validateCVC` |
| Cardholder Name | `validatePersonName` |

**Comportament UX:** erori roșii inline sub fiecare câmp (afișate doar după
`blur` sau la apăsarea butonului), border roșu pe câmpul greșit, `maxLength` +
`inputMode="numeric"` pe câmpurile numerice. Butonul de avansare/plată
afișează toate erorile și **blochează** continuarea până când totul e valid.
`handlePay` re-validează (traveler + payment) ca **defense-in-depth**, deci un
minor sau date invalide nu pot ajunge la booking nici dacă pașii UI sunt ocoliți.

---

## 3. De ce suntem protejați împotriva SQL injection

**SQL injection apare doar când input-ul utilizatorului este lipit într-un șir
SQL** (ex. `"SELECT * FROM x WHERE id = '" + input + "'"`). În TravelTwin asta
**nu se întâmplă nicăieri**:

1. **Toate query-urile trec prin Supabase / PostgREST**, care trimite valorile
   **parametrizat** (separat de comanda SQL), nu prin concatenare de text.
   Exemplu din cod: `supabase.from("saved_trips").insert({ ... })` — valorile
   sunt transmise ca date, nu ca SQL. Chiar dacă cineva scrie
   `Robert'); DROP TABLE saved_trips;--` într-un câmp, ajunge în baza de date ca
   **text simplu**, niciodată executat.
2. **Singurul SQL „crud" din proiect** e în fișierele din `supabase/migrations/`
   — scrise de dezvoltator, niciodată generate din input de utilizator.
3. **Row Level Security (RLS)** pe `saved_trips`, `favorites`, `profiles`
   limitează fiecare rând la `auth.uid() = user_id`, deci chiar și un query
   valid nu poate atinge datele altui utilizator.
4. **React escapează automat** tot ce randează în JSX → și XSS (injecția de
   `<script>`) e prevenit by default.

> Concluzie: protecția anti-SQLi este la **nivel de driver** (parametrizare),
> nu la nivel de „curățare" a textului.

---

## 4. Cum ne apărăm — straturi (defense-in-depth)

| Strat | Rol |
|---|---|
| **Parametrizare (Supabase/PostgREST)** | Elimină SQL injection — valorile nu sunt niciodată cod. |
| **RLS în Postgres** | Izolează datele per utilizator, indiferent de query. |
| **Validare de format** (`src/lib/validation.ts`) | Respinge date imposibile (email/telefon/card/vârstă invalide). |
| **Limite de lungime** (`maxLength`, capuri în validatori) | Previne payload-uri uriașe / abuz. |
| **Tipuri de input** (`type="date"`, `inputMode="numeric"`) | Restrânge ce poate introduce userul din UI. |
| **Re-validare la submit** (`handlePay`) | Apărare chiar dacă gate-ul UI e ocolit. |
| **React auto-escaping** | Previne XSS la afișare. |

---

## 5. Ce NU facem (intenționat)

**Nu „sanitizăm" prin ștergerea de caractere** (apostrof, `;`, `--`, ghilimele):

- Ar **strica date legitime** — nume reale ca `O'Brien`, `D'Angelo`.
- Dă o **falsă senzație de securitate** — nu parametrizarea, ci ștergerea de
  caractere ar deveni „linia de apărare", iar aceea e fragilă.

Abordarea corectă (și cea folosită aici) e **validare + parametrizare**, nu
mutilarea input-ului.
