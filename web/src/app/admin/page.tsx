'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, getBreweryOrders, type Order } from '@/lib/api';

const BREWERY_ID = 1; // replaced at runtime with the logged-in admin's brewery

const STATUS_STYLE: Record<string, string> = {
  pending:         'bg-yellow-100 text-yellow-700',
  accepted:        'bg-blue-100 text-blue-700',
  preparing:       'bg-blue-100 text-blue-700',
  ready:           'bg-indigo-100 text-indigo-700',
  driver_assigned: 'bg-purple-100 text-purple-700',
  en_route:        'bg-purple-100 text-purple-700',
  delivered:       'bg-green-100 text-green-700',
  failed_id:       'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((user) => {
        if (user.role !== 'brewery_admin' && user.role !== 'super_admin') router.push('/browse');
      })
      .catch(() => router.push('/login'));

    getBreweryOrders(BREWERY_ID).then(setOrders).finally(() => setLoading(false));
  }, [router]);

  const active = orders.filter((o) => !['delivered', 'failed_id'].includes(o.status));
  const today = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString());
  const revenue = today.filter((o) => o.status === 'delivered').reduce((s, o) => s + (o.total ?? 0), 0);

  const stats = [
    { label: 'Active orders', value: active.length, icon: '📦' },
    { label: "Today's orders", value: today.length, icon: '📅' },
    { label: "Today's revenue", value: `$${revenue.toFixed(2)}`, icon: '💰' },
    { label: 'Total orders', value: orders.length, icon: '📊' },
  ];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-3xl mb-2">{s.icon}</p>
            <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold mb-4">Active orders</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : active.length === 0 ? (
          <p className="text-gray-400 text-sm">No active orders right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Placed</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {active.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-medium">#{o.id}</td>
                    <td className="py-2.5 text-gray-500">{new Date(o.created_at).toLocaleTimeString()}</td>
                    <td className="py-2.5">${o.total?.toFixed(2)}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
