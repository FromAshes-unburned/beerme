'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CustomerNav from '@/components/CustomerNav';
import { getOrder, trackOrder, type Order } from '@/lib/api';

const STEPS = ['pending', 'accepted', 'preparing', 'ready', 'driver_assigned', 'en_route', 'delivered'];

const STEP_LABELS: Record<string, string> = {
  pending:         '⏳ Order placed',
  accepted:        '✅ Brewery confirmed',
  preparing:       '🍺 Preparing your order',
  ready:           '📦 Ready for pickup',
  driver_assigned: '🚗 Driver on the way',
  en_route:        '🚗 Almost there',
  delivered:       '🎉 Delivered!',
  failed_id:       '❌ ID check failed',
};

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrder(id).then(setOrder).finally(() => setLoading(false));

    const unsub = trackOrder(
      id,
      () => {},
      ({ status }) => setOrder((o) => o ? { ...o, status } : o)
    );
    return unsub;
  }, [id]);

  const currentStep = STEPS.indexOf(order?.status ?? '');

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <main className="max-w-xl mx-auto px-4 py-8">
        {loading ? (
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        ) : !order ? (
          <p className="text-red-500">Order not found.</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">{order.brewery_name}</h1>
                <span className="text-sm text-gray-400">#{order.id}</span>
              </div>

              {order.status === 'failed_id' ? (
                <div className="bg-red-50 rounded-xl p-4 text-red-700 text-center">
                  <p className="text-2xl mb-2">❌</p>
                  <p className="font-semibold">ID check failed</p>
                  <p className="text-sm mt-1">Your order has been returned to the brewery.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {STEPS.map((step, i) => (
                    <div key={step} className={`flex items-center gap-3 ${i > currentStep ? 'opacity-30' : ''}`}>
                      <div className={`w-3 h-3 rounded-full shrink-0 ${i <= currentStep ? 'bg-amber-500' : 'bg-gray-200'}`} />
                      <span className={`text-sm ${i === currentStep ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                        {STEP_LABELS[step]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold mb-3">Order details</h2>
              {order.driver_name && (
                <p className="text-sm text-gray-600 mb-3">🚗 Driver: <span className="font-medium">{order.driver_name}</span></p>
              )}
              <div className="flex flex-col gap-2 text-sm">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span>{item.quantity}× {item.name}</span>
                    <span>${((item.price ?? 0) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-2 mt-1">
                  <span>Total</span>
                  <span>${order.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
