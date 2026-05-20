'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerNav from '@/components/CustomerNav';
import BreweryMap from '@/components/BreweryMap';
import { getBreweries, type Brewery } from '@/lib/api';

export default function BrowsePage() {
  const router = useRouter();
  const [breweries, setBreweries] = useState<Brewery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLat, setUserLat] = useState<number>();
  const [userLng, setUserLng] = useState<number>();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async ({ coords }) => {
        setUserLat(coords.latitude);
        setUserLng(coords.longitude);
        try {
          setBreweries(await getBreweries(coords.latitude, coords.longitude));
        } catch {
          setError('Could not load breweries.');
        } finally {
          setLoading(false);
        }
      },
      async () => {
        try {
          setBreweries(await getBreweries());
        } catch {
          setError('Could not load breweries.');
        } finally {
          setLoading(false);
        }
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Local breweries</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Brewery list */}
          <div className="flex-1 flex flex-col gap-4">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
              ))
            ) : breweries.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No breweries available right now.</p>
            ) : (
              breweries.map((b) => (
                <Link
                  key={b.id}
                  href={`/brewery/${b.id}`}
                  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <span className="text-4xl">🏭</span>
                  <div>
                    <h2 className="font-semibold text-lg">{b.name}</h2>
                    <p className="text-gray-500 text-sm">{b.address}</p>
                    {b.distance_miles != null && (
                      <p className="text-amber-600 text-sm font-medium mt-1">
                        {Number(b.distance_miles).toFixed(1)} mi away
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Map */}
          {!loading && breweries.length > 0 && (
            <div className="lg:w-96 h-80 lg:h-[560px] lg:sticky lg:top-20 rounded-2xl overflow-hidden shadow-sm">
              <BreweryMap
                breweries={breweries}
                userLat={userLat}
                userLng={userLng}
                onSelect={(id) => router.push(`/brewery/${id}`)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
