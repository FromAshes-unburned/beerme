'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/api';

const links = [
  { href: '/admin', label: '📊 Dashboard', exact: true },
  { href: '/admin/orders', label: '📦 Orders' },
  { href: '/admin/menu', label: '🍺 Menu' },
  { href: '/admin/analytics', label: '📈 Analytics' },
  { href: '/admin/settings', label: '⚙️ Settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="text-lg font-bold">🍺 Beer Me</p>
        <p className="text-xs text-gray-400 mt-0.5">Brewery Portal</p>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2">
          Sign out
        </button>
      </div>
    </aside>
  );
}
