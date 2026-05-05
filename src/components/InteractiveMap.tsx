'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix Leaflet default icon paths (broken in Next.js bundler) ───────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Custom icons ─────────────────────────────────────────────────────────────
const attractionIcon = L.divIcon({
  html: '<div style="background:#f97316;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

const restaurantIcon = L.divIcon({
  html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

const cityIcon = L.divIcon({
  html: '<div style="background:#6366f1;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(99,102,241,0.5)"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

const selectedIcon = L.divIcon({
  html: '<div class="traveltwin-pulse" style="background:#f97316;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 4px 8px rgba(249,115,22,0.5)"></div>',
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

// ─── Geocoding ────────────────────────────────────────────────────────────────
// In-memory cache keyed by "{name}|{city}". Survives navigation within session.
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'TravelTwin/1.0' } });
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500) return null;
    } catch { /* network error — retry */ }
    await new Promise((r) => setTimeout(r, 250 * 2 ** i));
  }
  return null;
}

async function geocode(name: string, city: string): Promise<{ lat: number; lon: number } | null> {
  const key = `${name}|${city}`.toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    name + ' ' + city,
  )}&format=json&limit=1`;
  const res = await fetchWithRetry(url);
  if (!res) {
    geocodeCache.set(key, null);
    return null;
  }
  try {
    const data = await res.json();
    if (data[0]) {
      const out = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      geocodeCache.set(key, out);
      return out;
    }
  } catch { /* malformed JSON */ }
  geocodeCache.set(key, null);
  return null;
}

/**
 * Geocode a list of places in parallel batches. Nominatim allows ~1 req/sec
 * but tolerates short bursts; we batch by `concurrency` and pause between
 * batches to stay polite while finishing in seconds, not minutes.
 */
async function batchGeocode(
  places: Array<{ name: string; city: string }>,
  concurrency = 4,
  pauseMs = 250,
): Promise<Array<{ lat: number; lon: number } | null>> {
  const out: Array<{ lat: number; lon: number } | null> = new Array(places.length).fill(null);
  for (let i = 0; i < places.length; i += concurrency) {
    const slice = places.slice(i, i + concurrency);
    const results = await Promise.allSettled(slice.map((p) => geocode(p.name, p.city)));
    results.forEach((r, idx) => {
      out[i + idx] = r.status === 'fulfilled' ? r.value : null;
    });
    if (i + concurrency < places.length) await new Promise((r) => setTimeout(r, pauseMs));
  }
  return out;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeoLocation {
  lat: number;
  lon: number;
  type: 'attraction' | 'restaurant' | 'cafe';
}

interface MapControllerProps {
  selectedPlace: string | null;
  locations: Record<string, GeoLocation>;
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}

// ─── MapController: handles flyTo + popup from inside MapContainer ────────────
function MapController({ selectedPlace, locations, markerRefs }: MapControllerProps) {
  const map = useMap();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelected = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedPlace || !locations[selectedPlace]) return;
    if (selectedPlace === prevSelected.current) return;
    prevSelected.current = selectedPlace;

    const { lat, lon } = locations[selectedPlace];
    map.flyTo([lat, lon], 16, { duration: 1.2, easeLinearity: 0.25 });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const marker = markerRefs.current[selectedPlace];
      if (marker) marker.openPopup();
    }, 1300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [selectedPlace, locations, map, markerRefs]);

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export interface InteractiveMapProps {
  centerLat: number;
  centerLon: number;
  cityName: string;
  attractions: Array<{ name: string; description?: string; category?: string }>;
  restaurants: Array<{ name: string; cuisine?: string; priceRange?: string; description?: string }>;
  cafes: Array<{ name: string; specialty?: string; description?: string }>;
  selectedPlace: string | null;
  onSelectPlace: (name: string | null) => void;
}

export default function InteractiveMap({
  centerLat,
  centerLon,
  cityName,
  attractions,
  restaurants,
  cafes,
  selectedPlace,
  onSelectPlace,
}: InteractiveMapProps) {
  const [locations, setLocations] = useState<Record<string, GeoLocation>>({});
  const [loading, setLoading] = useState(true);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  useEffect(() => {
    const allPlaces = [
      ...attractions.map((a) => ({ name: a.name, type: 'attraction' as const })),
      ...restaurants.map((r) => ({ name: r.name, type: 'restaurant' as const })),
      ...cafes.map((c) => ({ name: c.name, type: 'cafe' as const })),
    ];

    if (allPlaces.length === 0) {
      setLoading(false);
      return;
    }

    const geocodeAll = async () => {
      const coords = await batchGeocode(
        allPlaces.map((p) => ({ name: p.name, city: cityName })),
      );
      const results: Record<string, GeoLocation> = {};
      coords.forEach((c, i) => {
        const place = allPlaces[i];
        results[place.name] = c
          ? { ...c, type: place.type }
          : {
              lat: centerLat + (Math.random() - 0.5) * 0.02,
              lon: centerLon + (Math.random() - 0.5) * 0.02,
              type: place.type,
            };
      });
      setLocations(results);
      setLoading(false);
    };

    geocodeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-[500px] rounded-2xl bg-neutral-100 dark:bg-surface-elevated animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-[3px] border-neutral-200 border-t-primary-500 animate-spin" />
        <p className="text-sm text-text-muted">Loading map locations...</p>
      </div>
    );
  }

  const selectedLoc = selectedPlace ? locations[selectedPlace] : null;

  // Helper to get popup content
  const popupContent = (
    name: string,
    typeLabel: string,
    typeColor: string,
    sub: string,
    description?: string,
    loc?: GeoLocation,
  ) => (
    <div style={{ minWidth: 170, fontFamily: 'inherit' }}>
      <p style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, color: '#1e293b' }}>{name}</p>
      <p style={{ color: typeColor, fontSize: 11, marginBottom: description ? 6 : 8 }}>{typeLabel} · {sub}</p>
      {description && (
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>{description}</p>
      )}
      {loc && (
        <a
          href={`https://www.google.com/maps/dir/${centerLat},${centerLon}/${loc.lat},${loc.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
        >
          ↗ Get Directions
        </a>
      )}
    </div>
  );

  return (
    <>
      {/* Pulse animation + popup styles */}
      <style>{`
        @keyframes traveltwin-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 8px rgba(249,115,22,0.5); }
          50% { transform: scale(1.4); box-shadow: 0 6px 16px rgba(249,115,22,0.7); }
        }
        .traveltwin-pulse { animation: traveltwin-pulse 1.5s ease-in-out infinite; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important; border: 1px solid #e2e8f0; }
        .leaflet-popup-content { margin: 12px 14px !important; }
        .leaflet-popup-tip { background: white !important; }
      `}</style>

      <div className="h-[500px] rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default relative">
        <MapContainer
          center={[centerLat, centerLon]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
            maxZoom={20}
          />

          <MapController
            selectedPlace={selectedPlace}
            locations={locations}
            markerRefs={markerRefs}
          />

          {/* Dashed route line from city center to selected place */}
          {selectedLoc && (
            <Polyline
              positions={[
                [centerLat, centerLon],
                [selectedLoc.lat, selectedLoc.lon],
              ]}
              pathOptions={{
                color: '#f97316',
                weight: 2,
                dashArray: '8, 6',
                opacity: 0.85,
              }}
            />
          )}

          {/* City center marker */}
          <Marker position={[centerLat, centerLon]} icon={cityIcon}>
            <Popup>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#6366f1' }}>
                📍 {cityName} City Center
              </div>
            </Popup>
          </Marker>

          {/* Attraction markers */}
          {attractions.map((a) => {
            const loc = locations[a.name];
            if (!loc) return null;
            return (
              <Marker
                key={`attr-${a.name}`}
                position={[loc.lat, loc.lon]}
                icon={selectedPlace === a.name ? selectedIcon : attractionIcon}
                eventHandlers={{
                  add: (e) => { markerRefs.current[a.name] = e.target as L.Marker; },
                  click: () => onSelectPlace(a.name),
                }}
              >
                <Popup>
                  {popupContent(a.name, '🟠 Attraction', '#f97316', a.category || 'landmark', a.description, loc)}
                </Popup>
              </Marker>
            );
          })}

          {/* Restaurant markers */}
          {restaurants.map((r) => {
            const loc = locations[r.name];
            if (!loc) return null;
            return (
              <Marker
                key={`rest-${r.name}`}
                position={[loc.lat, loc.lon]}
                icon={selectedPlace === r.name ? selectedIcon : restaurantIcon}
                eventHandlers={{
                  add: (e) => { markerRefs.current[r.name] = e.target as L.Marker; },
                  click: () => onSelectPlace(r.name),
                }}
              >
                <Popup>
                  {popupContent(r.name, '🟢 Restaurant', '#22c55e', r.priceRange || '€€', r.description, loc)}
                </Popup>
              </Marker>
            );
          })}

          {/* Cafe markers */}
          {cafes.map((c) => {
            const loc = locations[c.name];
            if (!loc) return null;
            return (
              <Marker
                key={`cafe-${c.name}`}
                position={[loc.lat, loc.lon]}
                icon={selectedPlace === c.name ? selectedIcon : restaurantIcon}
                eventHandlers={{
                  add: (e) => { markerRefs.current[c.name] = e.target as L.Marker; },
                  click: () => onSelectPlace(c.name),
                }}
              >
                <Popup>
                  {popupContent(c.name, '🟢 Cafe', '#22c55e', c.specialty || 'Coffee', c.description, loc)}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Subtle gradient frame for premium feel */}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl z-[400]" />

        {/* Legend overlay — branded floating chip */}
        <div
          className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-xl shadow-xl border border-neutral-200/80 dark:border-border-default px-3.5 py-2.5 text-xs space-y-1.5 pointer-events-none"
          style={{ zIndex: 1000 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Map legend</p>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0 ring-2 ring-white" />
            <span className="text-text-secondary">City center</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0 ring-2 ring-white" />
            <span className="text-text-secondary">Attraction</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0 ring-2 ring-white" />
            <span className="text-text-secondary">Restaurant / Cafe</span>
          </div>
        </div>
      </div>
    </>
  );
}
