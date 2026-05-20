'use client';

import { useEffect, useRef } from 'react';
import type { Brewery } from '@/lib/api';

let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

interface Props {
  breweries: Brewery[];
  userLat?: number;
  userLng?: number;
  onSelect?: (id: number | string) => void;
}

export default function BreweryMap({ breweries, userLat, userLng, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !breweries.length) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

    loadGoogleMaps(apiKey).then(() => {
      const center = breweries[0]
        ? { lat: breweries[0].lat, lng: breweries[0].lng }
        : { lat: 38.2527, lng: -85.7585 };

      const map = new google.maps.Map(ref.current!, {
        center: userLat && userLng ? { lat: userLat, lng: userLng } : center,
        zoom: 12,
        mapId: 'beerme_map',
        zoomControl: true,
      });

      if (userLat && userLng) {
        const dot = document.createElement('div');
        dot.style.cssText =
          'width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)';
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: userLat, lng: userLng },
          content: dot,
        });
      }

      breweries.forEach((b) => {
        if (!b.lat || !b.lng) return;
        const pin = document.createElement('div');
        pin.innerHTML = '🏭';
        pin.style.cssText = 'font-size:28px;cursor:pointer;';

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: b.lat, lng: b.lng },
          content: pin,
          title: b.name,
        });

        marker.addListener('click', () => {
          if (onSelect) onSelect(b.id);
        });
      });
    });
  }, [breweries, userLat, userLng, onSelect]);

  return <div ref={ref} className="w-full h-full rounded-2xl" />;
}
