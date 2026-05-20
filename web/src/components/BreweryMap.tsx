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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly`;
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
    if (!apiKey) return;

    loadGoogleMaps(apiKey).then(() => {
      const center = breweries[0]?.lat && breweries[0]?.lng
        ? { lat: breweries[0].lat, lng: breweries[0].lng }
        : { lat: 38.2527, lng: -85.7585 };

      const map = new google.maps.Map(ref.current!, {
        center: userLat && userLng ? { lat: userLat, lng: userLng } : center,
        zoom: 12,
      });

      breweries.forEach((b) => {
        if (!b.lat || !b.lng) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = new (google.maps as any).Marker({
          map,
          position: { lat: Number(b.lat), lng: Number(b.lng) },
          title: b.name,
        });
        marker.addListener('click', () => {
          if (onSelect) onSelect(b.id);
        });
      });
    }).catch((err) => console.error('Maps load error:', err));
  }, [breweries, userLat, userLng, onSelect]);

  return <div ref={ref} className="w-full h-full rounded-2xl" />;
}
