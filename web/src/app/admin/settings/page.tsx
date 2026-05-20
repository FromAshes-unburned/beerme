'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { startStripeConnect, getStripeStatus } from '@/lib/api';
import { Suspense } from 'react';

const BREWERY_ID = '45f5cef8-fddf-4e05-96b6-3fe38e251897';

function SettingsContent() {
  const searchParams = useSearchParams();
  const stripeParam = searchParams.get('stripe');

  const [status, setStatus] = useState<{ connected: boolean; payoutsEnabled?: boolean; detailsSubmitted?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStripeStatus(BREWERY_ID)
      .then(setStatus)
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, [stripeParam]);

  async function handleConnect() {
    setConnecting(true);
    setError('');
    try {
      const { url } = await startStripeConnect(BREWERY_ID);
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start Stripe onboarding');
      setConnecting(false);
    }
  }

  return (
    <main className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {stripeParam === 'connected' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-700">
          ✅ Stripe account connected! You can now receive payments.
        </div>
      )}
      {stripeParam === 'refresh' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-yellow-700">
          ⚠️ Stripe onboarding was interrupted. Please try again.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">Stripe payouts</h2>
            <p className="text-gray-500 text-sm mt-1">
              Connect your bank account to receive automatic payouts when orders are delivered.
            </p>
          </div>
          <span className="text-3xl">💳</span>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="font-medium">Connected and accepting payments</span>
            </div>
            {status.payoutsEnabled && (
              <div className="flex items-center gap-2 text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-medium">Payouts enabled</span>
              </div>
            )}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="mt-2 text-sm text-gray-500 underline hover:text-gray-700"
            >
              Update banking info
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-4">
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
              <span className="text-sm">Not connected — you won't receive payouts until this is set up</span>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              {connecting ? 'Redirecting to Stripe…' : 'Connect bank account'}
            </button>
            <p className="text-xs text-gray-400 mt-3">
              You'll be taken to Stripe's secure onboarding. Beer Me never sees your banking details.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
        <h2 className="font-semibold text-lg mb-1">How payouts work</h2>
        <div className="space-y-2 text-sm text-gray-500 mt-3">
          <p>💰 You receive the order subtotal minus the 12% Beer Me platform fee</p>
          <p>🚗 Beer Me handles driver pay from the delivery fee and tip</p>
          <p>⏱️ Stripe deposits funds to your bank account on a 2-day rolling basis</p>
          <p>📊 Full payout history is available in your Stripe dashboard</p>
        </div>
      </div>
    </main>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
