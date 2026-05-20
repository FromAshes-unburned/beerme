'use client';

import { useEffect, useState } from 'react';
import { getBreweryAnalytics, type Analytics } from '@/lib/api';

const BREWERY_ID = '45f5cef8-fddf-4e05-96b6-3fe38e251897';

const STATUS_LABELS: Record<string, string> = {
  pending:         'Pending',
  accepted:        'Accepted',
  preparing:       'Preparing',
  ready:           'Ready',
  driver_assigned: 'Driver assigned',
  en_route:        'En route',
  delivered:       'Delivered',
  failed_id:       'Failed ID',
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getBreweryAnalytics(BREWERY_ID)
      .then(setData)
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const statCards = data ? [
    { label: 'Total revenue', value: `$${Number(data.total_revenue).toFixed(2)}`, icon: '💰' },
    { label: 'Total orders', value: data.total_orders, icon: '📦' },
    { label: 'Avg order value', value: `$${Number(data.avg_order_value).toFixed(2)}`, icon: '📊' },
  ] : [];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-8">Analytics</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-3xl mb-2">{s.icon}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold mb-4">Orders by status</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(data.orders_by_status).map(([status, count]) => {
                const max = Math.max(...Object.values(data.orders_by_status));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-600 shrink-0">{STATUS_LABELS[status] ?? status}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
