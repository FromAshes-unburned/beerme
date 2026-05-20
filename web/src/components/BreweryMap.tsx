'use client';

import { useEffect, useRef, useState } from 'react';
import type { Brewery } from '@/lib/api';

declare global {
  interface Window { __gmResolve?: () => void; }
}

let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    window.__gmResolve = resolve;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__gmResolve&v=weekly`;
    s.async = true;
    s.defer = true;
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
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (!ref.current || !breweries.length) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
    if (!apiKey) { setMapError('Maps API key not configured'); return; }

    loadGoogleMaps(apiKey).then(() => {
      if (!ref.current) return;
      const center = breweries[0]?.lat && breweries[0]?.lng
        ? { lat: Number(breweries[0].lat), lng: Number(breweries[0].lng) }
        : { lat: 38.2527, lng: -85.7585 };

      const map = new google.maps.Map(ref.current, {
        center: userLat && userLng ? { lat: userLat, lng: userLng } : center,
        zoom: 12,
      });

      breweries.forEach((b) => {
        if (!b.lat || !b.lng) return;
        const marker = new google.maps.Marker({
          map,
          position: { lat: Number(b.lat), lng: Number(b.lng) },
          title: b.name,
        });
        marker.addListener('click', () => { if (onSelect) onSelect(b.id); });
      });
    }).catch((err) => {
      console.error('Maps error:', err);
      setMapError('Map could not load');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breweries.length, userLat, userLng]);

  if (mapError) {
    return (
      <div className="w-full h-full rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        {mapError}
      </div>
    );
  }

  return <div ref={ref} className="w-full h-full rounded-2xl" />;
}
