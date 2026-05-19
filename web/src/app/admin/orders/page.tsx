'use client';

import { useEffect, useState } from 'react';
import { getBreweryOrders, updateOrderStatus, type Order } from '@/lib/api';

const BREWERY_ID = 1;

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

const NEXT_STATUS: Record<string, string> = {
  pending:   'accepted',
  accepted:  'preparing',
  preparing: 'ready',
};

const FILTERS = ['all', 'pending', 'accepted', 'preparing', 'ready', 'delivered'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    getBreweryOrders(BREWERY_ID, filter === 'all' ? undefined : filter)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [filter]);

  async function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(order.id);
    try {
      const updated = await updateOrderStatus(order.id, next);
      setOrders((os) => os.map((o) => (o.id === updated.id ? updated : o)));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => { setFilter(f); setLoading(true); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-400'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No orders found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-gray-400">
                <th className="px-6 py-3 font-medium">Order</th>
                <th className="px-6 py-3 font-medium">Placed</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Items</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold">#{o.id}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4">${o.total?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500">{o.items?.length ?? 0} item(s)</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[o.status] ?? 'bg-gray-100'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {NEXT_STATUS[o.status] && (
                      <button onClick={() => advance(o)} disabled={updating === o.id}
                        className="text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-full transition-colors capitalize">
                        {updating === o.id ? '…' : `Mark ${NEXT_STATUS[o.status].replace(/_/g, ' ')}`}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
