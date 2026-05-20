'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CustomerNav from '@/components/CustomerNav';
import { getBrewery, placeOrder, type Brewery, type MenuItem } from '@/lib/api';

interface CartItem { item: MenuItem; qty: number }

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  unavailable: 'bg-gray-100 text-gray-500',
};

export default function BreweryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [brewery, setBrewery] = useState<Brewery | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tip, setTip] = useState(2);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBrewery(id).then(setBrewery).catch(() => setError('Could not load brewery.'));
  }, [id]);

  function addToCart(item: MenuItem) {
    setCart((c) => {
      const existing = c.find((ci) => ci.item.id === item.id);
      if (existing) return c.map((ci) => ci.item.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci);
      return [...c, { item, qty: 1 }];
    });
  }

  function removeFromCart(itemId: number) {
    setCart((c) => c.flatMap((ci) => {
      if (ci.item.id !== itemId) return [ci];
      return ci.qty > 1 ? [{ ...ci, qty: ci.qty - 1 }] : [];
    }));
  }

  const subtotal = cart.reduce((s, ci) => s + Number(ci.item.price) * ci.qty, 0);
  const fee = subtotal * 0.12;
  const delivery = 5;
  const total = subtotal + fee + delivery + tip;

  async function handleOrder() {
    setPlacing(true);
    setError('');
    try {
      const order = await placeOrder(
        id,
        cart.map((ci) => ({ menuItemId: ci.item.id, quantity: ci.qty })),
        1,
        tip,
        notes
      );
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not place order');
      setPlacing(false);
    }
  }

  const categories = [...new Set(brewery?.menu?.map((m) => m.category ?? 'Beer') ?? [])];

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {!brewery ? (
          <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Menu */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-5xl">🏭</span>
                <div>
                  <h1 className="text-2xl font-bold">{brewery.name}</h1>
                  <p className="text-gray-500 text-sm">{brewery.address}</p>
                </div>
              </div>

              {categories.map((cat) => (
                <div key={cat} className="mb-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">{cat}</h2>
                  <div className="flex flex-col gap-3">
                    {brewery.menu?.filter((m) => (m.category ?? 'Beer') === cat).map((item) => (
                      <div key={item.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && <p className="text-gray-500 text-sm">{item.description}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-amber-600 font-semibold">${Number(item.price).toFixed(2)}</span>
                            {item.abv && <span className="text-xs text-gray-400">{item.abv}% ABV</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.available ? 'available' : 'unavailable']}`}>
                              {item.available ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </div>
                        <button
                          disabled={!item.available}
                          onClick={() => addToCart(item)}
                          className="ml-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold w-8 h-8 rounded-full transition-colors shrink-0"
                        >
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Cart */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-20">
                <h2 className="font-semibold text-lg mb-4">Your order</h2>
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-sm">Add items from the menu.</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 mb-4">
                      {cart.map((ci) => (
                        <div key={ci.item.id} className="flex items-center justify-between text-sm">
                          <span className="flex-1">{ci.item.name}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => removeFromCart(ci.item.id)} className="text-gray-400 hover:text-red-500 w-5 h-5 text-center">−</button>
                            <span className="w-4 text-center">{ci.qty}</span>
                            <button onClick={() => addToCart(ci.item)} className="text-gray-400 hover:text-amber-500 w-5 h-5 text-center">+</button>
                            <span className="w-12 text-right font-medium">${(Number(ci.item.price) * ci.qty).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-3 text-sm space-y-1 text-gray-500">
                      <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Service fee (12%)</span><span>${fee.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Delivery</span><span>${delivery.toFixed(2)}</span></div>
                      <div className="flex justify-between items-center">
                        <span>Tip</span>
                        <div className="flex gap-1">
                          {[0, 2, 3, 5].map((t) => (
                            <button key={t} onClick={() => setTip(t)}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${tip === t ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 hover:border-amber-400'}`}>
                              ${t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold text-gray-900 pt-1">
                        <span>Total</span><span>${total.toFixed(2)}</span>
                      </div>
                    </div>
                    <textarea
                      placeholder="Special instructions…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full mt-3 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                      rows={2}
                    />
                    {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                    <button onClick={handleOrder} disabled={placing}
                      className="w-full mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition-colors">
                      {placing ? 'Placing order…' : `Place order · $${total.toFixed(2)}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
