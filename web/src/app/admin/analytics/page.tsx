'use client';

import { useEffect, useState } from 'react';
import { getBreweryAnalytics } from '@/lib/api';

const BREWERY_ID = '45f5cef8-fddf-4e05-96b6-3fe38e251897';

interface BreweryStats {
  total_completed: number;
  orders_this_week: number;
  total_revenue: number;
  avg_order_value: number;
  orders_today: number;
  revenue_today: number;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<BreweryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getBreweryAnalytics(BREWERY_ID)
      .then((d) => setData(d as unknown as BreweryStats))
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const statCards = data ? [
    { label: 'Total revenue', value: `$${Number(data.total_revenue ?? 0).toFixed(2)}`, icon: '💰' },
    { label: "Today's revenue", value: `$${Number(data.revenue_today ?? 0).toFixed(2)}`, icon: '📅' },
    { label: 'Orders today', value: data.orders_today ?? 0, icon: '📦' },
    { label: 'Orders this week', value: data.orders_this_week ?? 0, icon: '📊' },
    { label: 'Total delivered', value: data.total_completed ?? 0, icon: '✅' },
    { label: 'Avg order value', value: `$${Number(data.avg_order_value ?? 0).toFixed(2)}`, icon: '🧾' },
  ] : [];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-8">Analytics</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-6">
              <p className="text-3xl mb-2">{s.icon}</p>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No data yet — analytics will appear once orders come in.</p>
      )}
    </main>
  );
}
