'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomerNav from '@/components/CustomerNav';
import { getBreweries, type Brewery } from '@/lib/api';

export default function BrowsePage() {
  const [breweries, setBreweries] = useState<Brewery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async ({ coords }) => {
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Local breweries</h1>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && <p className="text-red-500">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {breweries.map((b) => (
            <Link
              key={b.id}
              href={`/brewery/${b.id}`}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start"
            >
              <span className="text-4xl">🏭</span>
              <div>
                <h2 className="font-semibold text-lg">{b.name}</h2>
                <p className="text-gray-500 text-sm">{b.address}</p>
                {b.distance_miles != null && (
                  <p className="text-amber-600 text-sm font-medium mt-1">
                    {b.distance_miles.toFixed(1)} mi away
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {!loading && breweries.length === 0 && !error && (
          <p className="text-gray-500 text-center py-12">No breweries available right now.</p>
        )}
      </main>
    </div>
  );
}
