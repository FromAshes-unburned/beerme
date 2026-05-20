'use client';

import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { Brewery } from '@/lib/api';

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

    const loader = new Loader({ apiKey, version: 'weekly' });
    loader.importLibrary('maps').then(async ({ Map }) => {
      const { AdvancedMarkerElement } = await loader.importLibrary('marker') as google.maps.MarkerLibrary;

      const center = breweries[0]
        ? { lat: breweries[0].lat, lng: breweries[0].lng }
        : { lat: 38.2527, lng: -85.7585 }; // Louisville default

      const map = new Map(ref.current!, {
        center: userLat && userLng ? { lat: userLat, lng: userLng } : center,
        zoom: 12,
        mapId: 'beerme_map',
        disableDefaultUI: false,
        zoomControl: true,
      });

      // User location pin
      if (userLat && userLng) {
        const dot = document.createElement('div');
        dot.style.cssText =
          'width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)';
        new AdvancedMarkerElement({ map, position: { lat: userLat, lng: userLng }, content: dot });
      }

      // Brewery pins
      breweries.forEach((b) => {
        if (!b.lat || !b.lng) return;
        const pin = document.createElement('div');
        pin.innerHTML = '🏭';
        pin.style.cssText = 'font-size:28px;cursor:pointer;';
        pin.title = b.name;

        const marker = new AdvancedMarkerElement({
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
