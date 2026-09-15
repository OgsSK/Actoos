'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useIsAdmin } from '@/app/hooks/useIsAdmin';
import { useLanguage } from '@/app/context/LanguageContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?redirect=/admin');
      return;
    }
    if (!isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">
            {isFr ? 'Vérification des accès…' : 'Checking access…'}
          </p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3">
            {isFr ? 'Accès refusé' : 'Access denied'}
          </h1>
          <p className="text-sm text-slate-500">
            {isFr
              ? "Vous n'avez pas les droits pour accéder à cette page."
              : "You don't have permission to access this page."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}