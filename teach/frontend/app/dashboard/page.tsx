'use client';
export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="text-2xl font-bold mb-2">Bonjour 👋</h1>
        <p className="text-slate-500 mb-6">{user.email}</p>
        <p className="text-sm text-slate-600 mb-6">
          Le dashboard sera construit à l'étape suivante.
        </p>
        <button
          onClick={handleSignOut}
          className="bg-red-50 text-red-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}