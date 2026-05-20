'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMe, setDriverOnline, getAvailableOrders, acceptOrder, getMyOrders,
  type DriverOrder, type User, type Order,
} from '@/lib/api';

export default function DriverDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [online, setOnline] = useState(false);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState<number | string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [available, myOrders] = await Promise.all([
        getAvailableOrders(),
        getMyOrders(),
      ]);
      setOrders(available);
      const active = myOrders.find((o) =>
        ['driver_assigned', 'en_route'].includes(o.status)
      );
      setActiveDelivery(active ?? null);
    } catch {
      // ignore — not online yet is OK
    }
  }, []);

  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.role !== 'driver') { router.push('/'); return; }
        setUser(u);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [user, online, refresh]);

  async function toggleOnline() {
    setToggling(true);
    try {
      await setDriverOnline(!online);
      setOnline((o) => !o);
      if (!online) refresh();
    } catch { setError('Could not update status'); }
    finally { setToggling(false); }
  }

  async function handleAccept(orderId: number | string) {
    setAccepting(orderId);
    try {
      await acceptOrder(orderId);
      router.push(`/driver/delivery/${orderId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not accept order');
      setAccepting(null);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Beer Me Driver</h1>
          <p className="text-gray-400 text-sm">{user?.fullName}</p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={toggling}
          className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
            online
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
        >
          {toggling ? '…' : online ? '🟢 Online' : '⚫ Go Online'}
        </button>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Active delivery banner */}
        {activeDelivery && (
          <div className="bg-amber-500 rounded-2xl p-4">
            <p className="font-semibold text-gray-900 mb-1">Active delivery in progress</p>
            <p className="text-gray-900 text-sm mb-3">{activeDelivery.brewery_name}</p>
            <button
              onClick={() => router.push(`/driver/delivery/${activeDelivery.id}`)}
              className="w-full bg-gray-900 text-white font-semibold py-2 rounded-full text-sm"
            >
              Continue delivery →
            </button>
          </div>
        )}

        {/* Available orders */}
        {online && !activeDelivery && (
          <div>
            <h2 className="font-semibold text-gray-300 mb-3">
              {orders.length === 0 ? 'No orders available right now' : `${orders.length} order${orders.length !== 1 ? 's' : ''} available`}
            </h2>
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="bg-gray-800 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{o.brewery_name}</p>
                      <p className="text-gray-400 text-sm">{o.brewery_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-400">${(Number(o.delivery_fee) + Number(o.tip)).toFixed(2)}</p>
                      <p className="text-gray-500 text-xs">fee + tip</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">📍 {o.delivery_street}, {o.delivery_city}</p>
                  <button
                    onClick={() => handleAccept(o.id)}
                    disabled={accepting === o.id}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold py-2 rounded-full text-sm transition-colors"
                  >
                    {accepting === o.id ? 'Accepting…' : 'Accept delivery'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!online && !activeDelivery && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🚗</p>
            <p>Go online to see available deliveries</p>
          </div>
        )}

        {/* Earnings link */}
        <button
          onClick={() => router.push('/driver/earnings')}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-full text-sm transition-colors"
        >
          View earnings
        </button>
      </div>
    </div>
  );
}
