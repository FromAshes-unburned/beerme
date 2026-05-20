'use client';

import { useEffect, useRef } from 'react';

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
  driverLat: number;
  driverLng: number;
  deliveryLat?: number;
  deliveryLng?: number;
}

export default function DriverMap({ driverLat, driverLng, deliveryLat, deliveryLng }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

    loadGoogleMaps(apiKey).then(() => {
      const map = new google.maps.Map(ref.current!, {
        center: { lat: driverLat, lng: driverLng },
        zoom: 14,
        mapId: 'beerme_driver_map',
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapRef.current = map;

      if (deliveryLat && deliveryLng) {
        const dest = document.createElement('div');
        dest.innerHTML = '📍';
        dest.style.fontSize = '28px';
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: deliveryLat, lng: deliveryLng },
          content: dest,
        });
      }

      const car = document.createElement('div');
      car.innerHTML = '🚗';
      car.style.fontSize = '28px';
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: driverLat, lng: driverLng },
        content: car,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    const pos = { lat: driverLat, lng: driverLng };
    markerRef.current.position = pos;
    mapRef.current.panTo(pos);
  }, [driverLat, driverLng]);

  return <div ref={ref} className="w-full h-64 rounded-2xl overflow-hidden" />;
}
