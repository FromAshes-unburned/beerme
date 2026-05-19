'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomerNav from '@/components/CustomerNav';
import { getMyOrders, type Order } from '@/lib/api';

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your orders</h1>

        {loading && <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}</div>}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">📦</p>
            <p>No orders yet.</p>
            <Link href="/browse" className="mt-4 inline-block text-amber-600 font-medium hover:underline">Browse breweries →</Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{o.brewery_name}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {o.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-sm text-gray-500 flex items-center justify-between">
                <span>{new Date(o.created_at).toLocaleDateString()}</span>
                <span className="font-medium text-gray-700">${o.total?.toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
