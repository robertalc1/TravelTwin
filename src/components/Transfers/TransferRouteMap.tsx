'use client';
import { useEffect, useRef } from 'react';
import { MapPin, Clock, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface TransferRouteMapProps {
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  durationMinutes: number;
  distanceKm: number;
}

interface OSRMRoute {
  routes?: Array<{ geometry?: GeoJSON.LineString }>;
}

export default function TransferRouteMap({
  originName,
  originLat,
  originLng,
  destinationName,
  destinationLat,
  destinationLng,
  durationMinutes,
  distanceKm,
}: TransferRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !mapRef.current) return;

      // Fix default icon paths (broken in Next.js bundler)
      const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string };
      delete proto._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const centerLat = (originLat + destinationLat) / 2;
      const centerLng = (originLng + destinationLng) / 2;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([centerLat, centerLng], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const originIcon = L.divIcon({
        html:
          '<div style="background:#E8622A;border:3px solid white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;line-height:1;">✈️</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const destIcon = L.divIcon({
        html:
          '<div style="background:#22c55e;border:3px solid white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;line-height:1;">🏨</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      L.marker([originLat, originLng], { icon: originIcon })
        .addTo(map)
        .bindPopup(`<b>🛫 ${originName}</b><br/>Pickup point`)
        .openPopup();

      L.marker([destinationLat, destinationLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>🏨 ${destinationName}</b><br/>Drop-off point`);

      const fallbackLine = L.polyline(
        [
          [originLat, originLng],
          [destinationLat, destinationLng],
        ],
        {
          color: '#E8622A',
          weight: 4,
          opacity: 0.8,
          dashArray: '10, 10',
        }
      ).addTo(map);

      // Fit fallback bounds first
      map.fitBounds(
        L.latLngBounds([originLat, originLng], [destinationLat, destinationLng]),
        { padding: [50, 50] }
      );

      // Try to get the real driving route from OSRM (free public router)
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM ${res.status}`);
        const routeData = (await res.json()) as OSRMRoute;
        const geom = routeData.routes?.[0]?.geometry;
        if (cancelled || !geom) return;

        map.removeLayer(fallbackLine);
        const routeLayer = L.geoJSON(geom, {
          style: { color: '#E8622A', weight: 5, opacity: 0.9 },
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
      } catch {
        // Keep dashed fallback line if OSRM is unreachable
      }

      mapInstanceRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [originLat, originLng, destinationLat, destinationLng, originName, destinationName]);

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default bg-white dark:bg-surface">
      <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100 dark:border-border-default flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <div className="w-3 h-3 rounded-full bg-[#E8622A] shrink-0" />
          <span className="text-text-secondary font-medium truncate max-w-[140px]">{originName}</span>
          <Navigation className="h-4 w-4 text-text-muted mx-1 shrink-0" />
          <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
          <span className="text-text-secondary font-medium truncate max-w-[140px]">{destinationName}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted shrink-0">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{durationMinutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{distanceKm} km</span>
          </div>
        </div>
      </div>
      <div ref={mapRef} className="h-64 w-full" style={{ zIndex: 1 }} />
      <div className="px-3 py-1.5 text-xs text-text-muted border-t border-neutral-100 dark:border-border-default">
        Route via{' '}
        <a
          href="https://project-osrm.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          OSRM
        </a>
        {' · Map © '}
        <a
          href="https://openstreetmap.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          OpenStreetMap
        </a>
      </div>
    </div>
  );
}
