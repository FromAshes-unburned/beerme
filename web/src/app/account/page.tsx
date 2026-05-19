'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerNav from '@/components/CustomerNav';
import { getMe, startIdVerification, logout, type User } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMe().then(setUser).catch(() => router.push('/login'));
  }, [router]);

  async function handleVerify() {
    setVerifying(true);
    setError('');
    try {
      const { url } = await startIdVerification();
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start verification');
      setVerifying(false);
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Account</h1>

        {!user ? (
          <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">Profile</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{user.fullName}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-medium">{user.email}</dd></div>
                {user.phone && <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="font-medium">{user.phone}</dd></div>}
                <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
              </dl>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold mb-2">Age verification</h2>
              <p className="text-sm text-gray-500 mb-4">Required to place orders. We use Stripe Identity for secure, one-time verification.</p>
              {user.idVerified ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <span className="text-xl">✅</span> Identity verified
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-amber-600 font-medium mb-4">
                    <span className="text-xl">⚠️</span> Not yet verified
                  </div>
                  {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                  <button onClick={handleVerify} disabled={verifying}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-full transition-colors">
                    {verifying ? 'Starting…' : 'Verify my ID →'}
                  </button>
                </>
              )}
            </div>

            <button onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors text-left">
              Sign out
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
