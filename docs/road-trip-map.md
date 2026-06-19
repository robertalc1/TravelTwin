# Harta Road-Trip (`RoadTripMapView`)

**Fișier:** `src/components/RoadTripMap/RoadTripMapView.tsx`
**Rută:** `/[locale]/road-trip/result/[id]/map`
**Echivalentul de la zbor:** `src/components/RouteMap/RouteMapView.tsx`

Acum harta road-trip are **aceleași funcționalități** ca harta de la zbor, dar
păstrează **accentul verde** (identitatea road-trip). Harta de la zbor folosește
portocaliu (`primary-500`).

## Ce face
Afișează traseul cu mașina/autobuzul de la orașul de plecare până la destinație
(ex. București → Istanbul), cu popasuri pe drum, plus tot ce poți explora în orașul
destinație (hoteluri, restaurante, cafenele, atracții).

Layout: **split-panel** pe desktop (hartă dreapta + sidebar stânga 420px), **stacked**
pe mobil (hartă sus 55vh, listă jos).

## Cele 4 moduri de transport (toggle peste hartă)
Identice cu harta de zbor — vin din `TRAVEL_MODES` (`buildEmbedUrl.ts`):

| Mod | La ce folosește pe road-trip |
|---|---|
| **Mașină** (`driving`) | ruta intercity completă, default pt. trip cu mașina |
| **Pe jos** (`walking`) | ultimul kilometru: din centrul orașului la o cafenea/atracție |
| **Transport** (`transit`) | liniile reale de autobuz/tren (vezi panoul de mai jos) |
| **Bicicletă** (`bicycling`) | trasee cu bicicleta (cu notă: acoperirea Google e variabilă) |

Modul inițial: `transit` dacă tripul e cu autobuzul, altfel `driving`.

## Panoul cu liniile de autobuz (`TransitDetails`)
**Asta era diferența mare față de harta de zbor — acum există și aici.**

Când modul = **Transport**, sub controale apare panoul `TransitDetails`
(`src/components/RouteMap/TransitDetails.tsx`). Cheamă `/api/directions` (Google
Directions API, cache 6h) și arată rute reale cu:
- badge-uri colorate per linie (autobuz/tren/metrou/feribot) cu numărul liniei
- ore de plecare/sosire, durată, distanță
- stația de urcare → stația de coborâre, direcția, numărul de stații
- până la 4 rute alternative, fiecare expandabilă
- link „Deschide în Google Maps" ca rezervă

Două contexte:
1. **Fără focus (ruta întreagă):** liniile **intercity** — orașul de plecare →
   orașul destinație (ex. conexiunea FlixBus). Label: `Transit {origin} → {destination}`.
2. **Cu focus pe un loc din destinație:** transportul din **centrul orașului** →
   acel loc. Label: `Transit to {place}`.

## Logica „local vs. intercity" (cheia de implementare)
Pe harta de zbor, rutele locale pleacă mereu din **aeroportul de sosire** (userul a
ajuns deja). Echivalentul pe road-trip: rutele locale pleacă din **centrul orașului
destinație**.

Cum decide codul: un loc e „local" dacă `focusedPlace` se termină cu numele orașului
destinație (sufixul `, <destinationCity>` pe care îl pune `focusPlace(name, city)`):

```
focusIsLocal = focusedPlace.toLowerCase().endsWith(destinationCity.toLowerCase())
```

- **Loc local** (hotel cazare / atracție / restaurant / cafenea) → origin = coordonatele
  centrului destinației (`trip.destination.lat,lng`). Vezi „din centru la cafenea".
- **Popas** (oraș intermediar, fără sufix) → origin = orașul de plecare (rămâne ruta
  intercity).

Se folosesc **coordonate** (nu text) pentru origin/destinație la Directions, pentru că
geocodarea numelor generate de AI (ex. „Local Kitchen") eșuează des cu NOT_FOUND.

## Sidebar — secțiuni
1. **Traseul tău** — listă numerotată: Plecare → Popasuri → Cazare → Atracții.
   Click pe un rând = focus pe hartă; click pe „Plecare" = revenire la ruta completă.
2. **Cazare în {oraș}** — card hotel cu poză (`SidebarHotelCard`), link spre pagina hotelului.
3. **Popasuri pe drum** — hoteluri de pe stopover-uri.
4. **Restaurante / Cafenele / De făcut** — rânduri `PlaceItem`: click stânga = focus pe
   hartă (rămâi în app), iconița mică = deschide locul în Google Maps (tab nou).
5. **Deschide în Google Maps** — întreg traseul, din `trip.externalLinks.googleMaps`.

## Sursele de date
- **Restaurante + atracții live:** `/api/restaurants/search` și `/api/attractions/search`
  (Tripadvisor). Fallback pe conținutul AI (`trip.aiContent`) dacă lipsesc.
- **Cafenele:** doar din AI (`aiContent.topCafes`).
- **Hoteluri:** din `trip.hotelDestination` / `trip.stopovers[].hotel` (Tripadvisor).
- **Hartă (iframe):** Google Maps **Embed API** (gratis) via `buildDirectionsEmbedUrl`
  — max 3 waypoints (limita Embed). Necesită `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- **Panou transit:** Google **Directions API** server-side via `/api/directions`.

## Deep-link `?place=<name>`
Aceleași reguli ca harta de zbor: dacă vii din `.../map?place=Cafeneaua X`, harta se
pre-focusează pe acel loc și rândul corespunzător din sidebar se aprinde. Numele fără
virgulă primește sufixul `, {destinationCity}` ca highlight-ul să se potrivească.

## Note
- `iframeKey` forțează reload-ul iframe-ului la schimbarea modului sau a focus-ului.
- Pe mobil, click pe un loc face scroll sus ca să vezi rezultatul pe hartă.
- Pe desktop se blochează scroll-ul body-ului (layout full-height).
