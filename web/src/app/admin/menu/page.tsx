'use client';

import { useEffect, useState } from 'react';
import { getBrewery, addMenuItem, updateMenuItem, type MenuItem } from '@/lib/api';

const BREWERY_ID = 1;

const BLANK: Partial<MenuItem> = { name: '', description: '', price: 0, category: 'Beer', abv: undefined, available: true };

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<MenuItem>>(BLANK);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBrewery(BREWERY_ID).then((b) => setItems(b.menu ?? [])).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof MenuItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
  };

  function startEdit(item: MenuItem) {
    setEditing(item.id);
    setForm(item);
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setForm(BLANK);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await updateMenuItem(BREWERY_ID, editing, form);
        setItems((items) => items.map((i) => (i.id === editing ? updated : i)));
      } else {
        const created = await addMenuItem(BREWERY_ID, form);
        setItems((items) => [...items, created]);
      }
      cancelEdit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu</h1>
        {!editing && (
          <button onClick={() => { setEditing(0); setForm(BLANK); }}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-full text-sm transition-colors">
            + Add item
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-4">{editing === 0 ? 'New item' : 'Edit item'}</h2>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required value={form.name ?? ''} onChange={set('name')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input value={form.category ?? ''} onChange={set('category')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input type="number" step="0.01" min="0" required value={form.price ?? ''} onChange={set('price')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ABV (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={form.abv ?? ''} onChange={set('abv')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Container type</label>
              <select value={(form as Record<string, unknown>).container_type as string ?? ''} onChange={(e) => setForm((f) => ({ ...f, container_type: e.target.value }))}
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description ?? ''} onChange={set('description')} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="avail" checked={form.available ?? true} onChange={set('available')}
                className="accent-amber-500" />
              <label htmlFor="avail" className="text-sm text-gray-700">Available</label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-full text-sm transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={cancelEdit}
                className="border border-gray-200 hover:border-gray-300 text-gray-600 font-medium px-6 py-2 rounded-full text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        categories.length === 0 ? (
          <p className="text-gray-400">No menu items yet. Add one above.</p>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{cat}</h2>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {items.filter((i) => i.category === cat).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium">{item.name}</td>
                        <td className="px-5 py-3 text-gray-500">{item.description}</td>
                        <td className="px-5 py-3">${item.price.toFixed(2)}</td>
                        <td className="px-5 py-3 text-gray-400">{item.abv ? `${item.abv}%` : '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button onClick={() => startEdit(item)}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )
      )}
    </main>
  );
}
