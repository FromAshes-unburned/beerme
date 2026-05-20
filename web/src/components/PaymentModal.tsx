'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

interface Props {
  clientSecret: string;
  total: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ total, onSuccess, onCancel }: Omit<Props, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed');
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handlePay}>
      <PaymentElement />
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      <div className="flex gap-3 mt-5">
        <button
          type="submit"
          disabled={!stripe || paying}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition-colors"
        >
          {paying ? 'Processing…' : `Pay $${Number(total).toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className="px-5 border border-gray-200 text-gray-600 font-medium rounded-full text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PaymentModal({ clientSecret, total, onSuccess, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 className="font-semibold text-lg mb-5">Complete your order</h2>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
          <CheckoutForm total={total} onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      </div>
    </div>
  );
}
