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
async function geocodeWithDelay(
  name: string,
  city: string,
  index: number,
): Promise<{ lat: number; lon: number } | null> {
  await new Promise((r) => setTimeout(r, index * 300));
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ' ' + city)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'TravelTwin/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
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
      const results: Record<string, GeoLocation> = {};
      await Promise.all(
        allPlaces.map(async (place, i) => {
          const coords = await geocodeWithDelay(place.name, cityName, i);
          results[place.name] = coords
            ? { ...coords, type: place.type }
            : {
                lat: centerLat + (Math.random() - 0.5) * 0.02,
                lon: centerLon + (Math.random() - 0.5) * 0.02,
                type: place.type,
              };
        }),
      );
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

        {/* Legend overlay */}
        <div
          className="absolute bottom-4 right-4 z-[1000] bg-white dark:bg-surface rounded-xl shadow-lg border border-neutral-200 dark:border-border-default px-3 py-2 text-xs space-y-1 pointer-events-none"
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
            <span className="text-text-secondary">Attraction</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-text-secondary">Restaurant / Cafe</span>
          </div>
          <p className="text-[10px] text-text-muted border-t border-neutral-100 dark:border-border-default pt-1 mt-1">
            Click any card to navigate
          </p>
        </div>
      </div>
    </>
  );
}
