'use client';

import { useEffect, useRef } from 'react';

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
  driverLat: number;
  driverLng: number;
  deliveryLat?: number;
  deliveryLng?: number;
}

export default function DriverMap({ driverLat, driverLng, deliveryLat, deliveryLng }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
    if (!apiKey) return;

    loadGoogleMaps(apiKey).then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MapsMarker = (google.maps as any).Marker;

      const map = new google.maps.Map(ref.current!, {
        center: { lat: driverLat, lng: driverLng },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapRef.current = map;

      if (deliveryLat && deliveryLng) {
        new MapsMarker({
          map,
          position: { lat: deliveryLat, lng: deliveryLng },
          label: '📍',
          title: 'Delivery address',
        });
      }

      markerRef.current = new MapsMarker({
        map,
        position: { lat: driverLat, lng: driverLng },
        title: 'Driver',
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    const pos = { lat: driverLat, lng: driverLng };
    markerRef.current.setPosition(pos);
    mapRef.current.panTo(pos);
  }, [driverLat, driverLng]);

  return <div ref={ref} className="w-full h-64 rounded-2xl overflow-hidden" />;
}
