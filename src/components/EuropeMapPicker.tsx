'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EUROPEAN_CITIES, type EuropeanCity } from '@/data/europeanCities';

export interface MapPickerCity {
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  iata?: string;
}

interface Props {
  mode: 'origin' | 'destination';
  selectedCity: MapPickerCity | null;
  excludeCity?: string;
  onSelect: (city: MapPickerCity) => void;
  height?: string;
}

const EUROPE_BOUNDS: [[number, number], [number, number]] = [
  [33, -25],
  [72, 45],
];

function pinIcon(state: 'primary' | 'secondary' | 'selected'): L.DivIcon {
  const tones = {
    primary: { size: 14, ring: 'rgba(16,185,129,0.25)', fill: '#10b981', border: '#fff' },
    secondary: { size: 9, ring: 'rgba(148,163,184,0.20)', fill: '#94a3b8', border: '#fff' },
    selected: { size: 20, ring: 'rgba(249,115,22,0.30)', fill: '#f97316', border: '#fff' },
  };
  const t = tones[state];
  const ringSize = t.size + 8;
  return L.divIcon({
    className: 'europe-map-pin',
    html: `<div style="position:relative;width:${ringSize}px;height:${ringSize}px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:${t.ring};"></div>
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${t.size}px;height:${t.size}px;border-radius:9999px;background:${t.fill};border:2px solid ${t.border};box-shadow:0 1px 3px rgba(0,0,0,0.25);"></div>
    </div>`,
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
  });
}

function PanToSelected({ city }: { city: MapPickerCity | null }) {
  const map = useMap();
  if (city) {
    map.flyTo([city.lat, city.lng], Math.max(map.getZoom(), 5), { duration: 0.6 });
  }
  return null;
}

export default function EuropeMapPicker({
  mode,
  selectedCity,
  excludeCity,
  onSelect,
  height = '420px',
}: Props) {
  const cities = useMemo<EuropeanCity[]>(() => {
    if (!excludeCity) return EUROPEAN_CITIES;
    const lower = excludeCity.toLowerCase();
    return EUROPEAN_CITIES.filter((c) => c.name.toLowerCase() !== lower);
  }, [excludeCity]);

  return (
    <div
      className="overflow-hidden rounded-radius-xl border border-border-default bg-surface-sunken"
      style={{ height }}
    >
      <MapContainer
        center={[50, 12]}
        zoom={4}
        minZoom={3}
        maxZoom={7}
        maxBounds={EUROPE_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {cities.map((c) => {
          const isSelected = selectedCity?.name === c.name;
          const state: 'primary' | 'secondary' | 'selected' = isSelected
            ? 'selected'
            : c.popular
              ? 'primary'
              : 'secondary';
          return (
            <Marker
              key={`${c.countryCode}-${c.name}`}
              position={[c.lat, c.lng]}
              icon={pinIcon(state)}
              eventHandlers={{
                click: () => {
                  onSelect({
                    name: c.name,
                    country: c.country,
                    countryCode: c.countryCode,
                    lat: c.lat,
                    lng: c.lng,
                    iata: c.iata,
                  });
                },
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={1}
                permanent={isSelected}
                className={isSelected ? 'europe-map-tooltip-selected' : ''}
              >
                <span style={{ fontSize: 11, fontWeight: 600 }}>
                  {c.name}
                  <span style={{ color: '#64748b', fontWeight: 400 }}>, {c.country}</span>
                </span>
              </Tooltip>
            </Marker>
          );
        })}
        <PanToSelected city={selectedCity} />
        {/* Inline style to make the divIcon background transparent (Leaflet
            default adds a white frame around custom icons). */}
        <style>{`
          .leaflet-div-icon, .europe-map-pin { background: transparent !important; border: none !important; }
          .europe-map-tooltip-selected { font-weight: 700 !important; }
          .leaflet-tooltip { padding: 4px 8px !important; }
          .leaflet-container { font-family: inherit; background: #f8fafc; }
          @media (prefers-color-scheme: dark) {
            .leaflet-container { background: #0f172a; }
          }
        `}</style>
      </MapContainer>
      <div className="pointer-events-none flex items-center justify-between gap-2 border-t border-border-default bg-surface px-3 py-2 text-xs text-text-muted">
        <span>
          {mode === 'origin' ? 'Pick origin city' : 'Pick destination city'}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            major
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
            other
          </span>
        </span>
      </div>
    </div>
  );
}
