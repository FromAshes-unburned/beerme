'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDriverEarnings, type DriverEarnings } from '@/lib/api';

export default function DriverEarningsPage() {
  const router = useRouter();
  const [data, setData] = useState<DriverEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDriverEarnings().then(setData).finally(() => setLoading(false));
  }, []);

  const cards = data ? [
    { label: 'Earned today',     value: `$${Number(data.earned_today ?? 0).toFixed(2)}`,     icon: '📅' },
    { label: 'Earned this week', value: `$${Number(data.earned_this_week ?? 0).toFixed(2)}`, icon: '📊' },
    { label: 'Total earned',     value: `$${Number(data.total_earned ?? 0).toFixed(2)}`,     icon: '💰' },
    { label: 'Total deliveries', value: data.total_deliveries ?? 0,                           icon: '📦' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/driver')} className="text-gray-400 hover:text-white">←</button>
        <h1 className="font-bold text-lg">Earnings</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {cards.map((c) => (
              <div key={c.label} className="bg-gray-800 rounded-2xl p-5">
                <p className="text-2xl mb-2">{c.icon}</p>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-gray-400 text-xs mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
