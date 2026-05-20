'use client';

import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

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
    const loader = new Loader({ apiKey, version: 'weekly' });

    loader.importLibrary('maps').then(async ({ Map }) => {
      const { AdvancedMarkerElement } = await loader.importLibrary('marker') as google.maps.MarkerLibrary;

      const map = new Map(ref.current!, {
        center: { lat: driverLat, lng: driverLng },
        zoom: 14,
        mapId: 'beerme_driver_map',
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapRef.current = map;

      // Delivery destination pin
      if (deliveryLat && deliveryLng) {
        const dest = document.createElement('div');
        dest.innerHTML = '📍';
        dest.style.fontSize = '28px';
        new AdvancedMarkerElement({ map, position: { lat: deliveryLat, lng: deliveryLng }, content: dest });
      }

      // Driver pin
      const car = document.createElement('div');
      car.innerHTML = '🚗';
      car.style.fontSize = '28px';
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: driverLat, lng: driverLng },
        content: car,
      });
      markerRef.current = marker;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once

  // Update driver position live
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    const pos = { lat: driverLat, lng: driverLng };
    markerRef.current.position = pos;
    mapRef.current.panTo(pos);
  }, [driverLat, driverLng]);

  return <div ref={ref} className="w-full h-64 rounded-2xl overflow-hidden" />;
}
