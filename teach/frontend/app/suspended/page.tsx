'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';

export default function SuspendedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const [reason, setReason] = useState<string | null>(null);
  const [suspendedAt, setSuspendedAt] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('users')
        .select('suspended_at, suspended_reason')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data?.suspended_at) {
        router.replace('/dashboard');
        return;
      }

      setReason(data.suspended_reason || null);
      setSuspendedAt(data.suspended_at);
      setChecking(false);
    })();

    return () => { cancelled = true; };
  }, [user, authLoading, router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffafa]">
        <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffafa] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isFr ? 'Compte suspendu' : 'Account suspended'}
          </h1>
          <p className="text-sm text-slate-500">
            {isFr
              ? `Votre compte ${BRAND.name} a été suspendu par notre équipe.`
              : `Your ${BRAND.name} account has been suspended by our team.`}
          </p>
        </div>

        {reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">
              {isFr ? 'Raison' : 'Reason'}
            </p>
            <p className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap">
              {reason}
            </p>
          </div>
        )}

        {suspendedAt && (
          <p className="text-xs text-slate-400 text-center mb-6">
            {isFr ? 'Suspendu le' : 'Suspended on'}{' '}
            {new Date(suspendedAt).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}

        <div className="border-t border-slate-100 pt-6 space-y-3">
          <p className="text-xs text-slate-500 text-center">
            {isFr
              ? 'Pour contester cette suspension, contactez-nous.'
              : 'To appeal this suspension, contact us.'}
          </p>
          <a
            href="mailto:contact@actoos.com"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            contact@actoos.com
          </a>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {isFr ? 'Se déconnecter' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}