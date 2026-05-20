'use client';

import { useEffect, useState } from 'react';
import { getBrewery, addMenuItem, type MenuItem } from '@/lib/api';

const BREWERY_ID = '45f5cef8-fddf-4e05-96b6-3fe38e251897';

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Beer');
  const [abv, setAbv] = useState('');
  const [description, setDescription] = useState('');
  const [containerType, setContainerType] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getBrewery(BREWERY_ID)
      .then((b) => setItems(b.menu ?? []))
      .catch((e) => setError(e.message ?? 'Could not load menu'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!name || !price || !containerType) {
      setFormError('Name, price and container type are required');
      return;
    }
    setSaving(true);
    try {
      const created = await addMenuItem(BREWERY_ID, {
        name,
        price: parseFloat(price),
        category,
        abv: abv ? parseFloat(abv) : undefined,
        description,
        available: true,
        containerType,
      } as Partial<MenuItem> & { containerType: string });
      setItems((prev) => [...prev, created]);
      setShowForm(false);
      setName(''); setPrice(''); setCategory('Beer'); setAbv(''); setDescription(''); setContainerType('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-full text-sm">
            + Add item
          </button>
        )}
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-4">New item</h2>
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
              <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Container type *</label>
              <select value={containerType} onChange={(e) => setContainerType(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="">Select…</option>
                <option value="can_4pack">Can 4-pack</option>
                <option value="can_6pack">Can 6-pack</option>
                <option value="crowler">Crowler</option>
                <option value="growler">Growler</option>
                <option value="bottle">Bottle</option>
                <option value="case">Case</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ABV (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={abv} onChange={(e) => setAbv(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-full text-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 font-medium px-6 py-2 rounded-full text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <p className="text-gray-400">No menu items yet. Add one above.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-gray-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">ABV</th>
                <th className="px-5 py-3 font-medium">Container</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{item.name}</td>
                  <td className="px-5 py-3 text-gray-500">{item.category}</td>
                  <td className="px-5 py-3">${Number(item.price).toFixed(2)}</td>
                  <td className="px-5 py-3 text-gray-400">{item.abv ? `${item.abv}%` : '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{(item as MenuItem & { container_type?: string }).container_type ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
