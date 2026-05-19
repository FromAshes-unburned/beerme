'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/api';

const links = [
  { href: '/browse', label: '🍺 Browse' },
  { href: '/orders', label: '📦 Orders' },
  { href: '/account', label: '👤 Account' },
];

export default function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
      <Link href="/browse" className="text-xl font-bold">🍺 Beer Me</Link>
      <div className="flex items-center gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              pathname.startsWith(l.href)
                ? 'bg-amber-100 text-amber-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <button onClick={handleLogout} className="ml-2 text-sm text-gray-400 hover:text-gray-600">
          Sign out
        </button>
      </div>
    </nav>
  );
}
