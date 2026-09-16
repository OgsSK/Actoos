'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useIsAdmin } from '@/app/hooks/useIsAdmin';

type Status = 'pending' | 'authorized' | 'denied';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (status !== 'pending') return;

    // Pas connecté → login
    if (!user) {
      setStatus('denied');
      router.replace('/login?redirect=/admin');
      return;
    }

    // Pas admin → dashboard
    if (!isAdmin) {
      setStatus('denied');
      router.replace('/dashboard');
      return;
    }

    // Admin OK → autorisé
    setStatus('authorized');
  }, [authLoading, adminLoading, user, isAdmin, status, router]);

  // 🚫 Rien tant que le check n'est pas fini
  if (status === 'pending' || status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Vérification des accès…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}