'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login?redirect=/account');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" /></div>;
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="text-2xl font-bold mb-6">Mon compte</h1>

        <div className="space-y-3 text-sm mb-8">
          <p><strong>Email :</strong> {user.email}</p>
          <p><strong>Prénom :</strong> {profile?.first_name || '—'}</p>
          <p><strong>Nom :</strong> {profile?.last_name || '—'}</p>
          <p><strong>Rôle :</strong> {profile?.role || '—'}</p>
          <p><strong>Devise :</strong> {profile?.preferred_currency || 'EUR'}</p>
        </div>

        <button
          onClick={async () => { await signOut(); router.push('/'); }}
          className="bg-red-50 text-red-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}