# Pop-up „Sesiune expirată" (SessionTimeoutModal)

**Fișier:** `src/components/SessionTimeoutModal.tsx`
**Apare pe:** paginile de detaliu trip (`TripDetailView`, `RoadTripDetailView`).

## Ce face
Un modal care blochează pagina după **10 minute** de la deschiderea ei și trimite
utilizatorul înapoi pe pagina principală (`/${locale}`).

## De ce există
Prețurile (zboruri/hoteluri) vin live din Tripadvisor (RapidAPI). Dacă lași tab-ul
deschis ore întregi, prețurile afișate devin vechi, iar fiecare reîncărcare consumă
din cota API. Modalul forțează o reîncărcare „proaspătă" ca să vezi mereu oferte
actuale și să nu se ardă quota pe date vechi.

## Cum funcționează
- Timer fix de `TIMEOUT_MS = 10 min`, pornit la montarea componentei (nu se resetează
  la activitate — nu e idle-aware).
- La expirare apare modalul cu un singur buton: **„Înapoi la pagina principală"**.
- Butonul șterge din `sessionStorage` datele de trip/booking stale:
  - chei fixe: `planResults_v2`, `homepage_destinations`, `bookingTrip`,
    `currentBookingMeta`, `lastBookingRef`
  - chei cu prefix: `trip_*`, `booking_*`, `flightView_*`
  - **NU** șterge cache-ul de geolocație (re-detecția IP la fiecare reload e inutilă).
- Apoi face hard redirect: `window.location.href = /${locale}`.

## Detaliu de interfață
Countdown-ul afișat (`00 : 00 : 00` — Ore / Minute / Secunde) este **decor static**,
nu un ceas care numără. Nu e un bug — nu încerca să-l „repari" să ticăie.

## i18n
Texte bilingve inline (RO/EN) prin `isRo = locale === 'ro'`:
- Titlu: „Sesiune expirată" / „Session timed out"
- Buton: „Înapoi la pagina principală" / „Back to homepage"

## Posibilă îmbunătățire
A face timer-ul idle-aware (reset la activitatea userului) ar fi o îmbunătățire reală.
Ridicarea valorii `TIMEOUT_MS` e ok și simplă.
