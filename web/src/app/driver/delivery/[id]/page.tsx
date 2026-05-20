'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOrder, updateOrderStatus, updateDriverLocation, verifyCustomerId, type Order } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  driver_assigned: 'Head to the brewery',
  en_route:        'Delivering to customer',
  delivered:       'Delivered!',
  failed_id:       'ID check failed',
};

export default function ActiveDeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [idChecked, setIdChecked] = useState(false);
  const [error, setError] = useState('');
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    getOrder(id).then(setOrder).catch(() => setError('Order not found')).finally(() => setLoading(false));
  }, [id]);

  // Start GPS broadcasting when en_route
  useEffect(() => {
    if (order?.status !== 'en_route') return;
    if (!navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        updateDriverLocation(coords.latitude, coords.longitude, id).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [id, order?.status]);

  async function markPickedUp() {
    setUpdating(true);
    try {
      await updateOrderStatus(id, 'en_route');
      setOrder((o) => o ? { ...o, status: 'en_route' } : o);
    } catch { setError('Could not update status'); }
    finally { setUpdating(false); }
  }

  async function markDelivered() {
    if (!idChecked) { setError('You must confirm the ID check first'); return; }
    setUpdating(true);
    try {
      await verifyCustomerId(id, true);
      await updateOrderStatus(id, 'delivered');
      router.push('/driver');
    } catch { setError('Could not complete delivery'); }
    finally { setUpdating(false); }
  }

  async function markIdFailed() {
    setUpdating(true);
    try {
      await updateOrderStatus(id, 'failed_id');
      router.push('/driver');
    } catch { setError('Could not update status'); }
    finally { setUpdating(false); }
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading…</div>;

  if (!order) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-red-400">{error || 'Order not found'}</p>
    </div>
  );

  const isDone = ['delivered', 'failed_id'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/driver')} className="text-gray-400 hover:text-white">←</button>
        <div>
          <h1 className="font-bold">{order.brewery_name}</h1>
          <p className="text-amber-400 text-sm">{STATUS_LABEL[order.status] ?? order.status}</p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Order summary */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Order #{order.id}</p>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm mb-1">
              <span>{item.quantity}× {item.name}</span>
              <span className="text-gray-400">${((item.price ?? 0) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold">
            <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Step 1: Go to brewery */}
        <div className={`bg-gray-800 rounded-2xl p-4 ${order.status !== 'driver_assigned' ? 'opacity-50' : ''}`}>
          <p className="font-semibold mb-1">1. Pick up from brewery</p>
          <p className="text-gray-400 text-sm mb-3">{order.brewery_name}</p>
          {order.status === 'driver_assigned' && (
            <button
              onClick={markPickedUp}
              disabled={updating}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold py-3 rounded-full transition-colors"
            >
              {updating ? 'Updating…' : "I've picked up the order"}
            </button>
          )}
          {order.status !== 'driver_assigned' && (
            <p className="text-green-400 text-sm">✓ Picked up</p>
          )}
        </div>

        {/* Step 2: Deliver + ID check */}
        <div className={`bg-gray-800 rounded-2xl p-4 ${order.status !== 'en_route' ? 'opacity-50' : ''}`}>
          <p className="font-semibold mb-1">2. Deliver & verify ID</p>
          <p className="text-gray-400 text-sm mb-3">
            {order.delivery_address ?? 'Customer address on file'}
          </p>

          {order.status === 'en_route' && (
            <>
              <div className="bg-amber-900 border border-amber-500 rounded-xl p-3 mb-4">
                <p className="text-amber-300 font-semibold text-sm mb-1">⚠️ ID Check Required by Law</p>
                <p className="text-amber-200 text-xs">Ask the customer for a valid government-issued ID. Confirm they are 21+. Do NOT hand over beer until confirmed.</p>
              </div>

              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={idChecked}
                  onChange={(e) => setIdChecked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-amber-500"
                />
                <span className="text-sm">I have checked a valid photo ID and confirmed the customer is 21 or older</span>
              </label>

              <button
                onClick={markDelivered}
                disabled={updating || !idChecked}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold py-3 rounded-full transition-colors mb-2"
              >
                {updating ? 'Completing…' : 'Mark as delivered'}
              </button>

              <button
                onClick={markIdFailed}
                disabled={updating}
                className="w-full bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 rounded-full text-sm transition-colors"
              >
                ID check failed — return to brewery
              </button>
            </>
          )}

          {order.status === 'delivered' && <p className="text-green-400 text-sm">✓ Delivered</p>}
          {order.status === 'failed_id' && <p className="text-red-400 text-sm">✗ ID check failed</p>}
        </div>

        {isDone && (
          <button
            onClick={() => router.push('/driver')}
            className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-3 rounded-full"
          >
            Back to dashboard
          </button>
        )}
      </div>
    </div>
  );
}
