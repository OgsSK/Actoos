'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Users, Clock, CheckCircle2, XCircle, Ban, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';

interface Stats {
  teachersTotal: number;
  teachersPending: number;
  teachersVerified: number;
  teachersRejected: number;
  teachersSuspended: number;
  parentsTotal: number;
  usersTotal: number;
}

export default function AdminDashboard() {
  const { language } = useLanguage();
  const isFr = language === 'fr';
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [
          teachersTotal,
          teachersPending,
          teachersVerified,
          teachersRejected,
          teachersSuspended,
          parentsTotal,
        ] = await Promise.all([
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'suspended'),
          supabase.from('parent_profiles').select('id', { count: 'exact', head: true }),
        ]);

        if (cancelled) return;

        // Utilisateurs Teach ACTIFS = profs validés + parents (peu importe leur statut)
        // Exclut : profs pending et rejected
        const [teachersActiveIds, parentsIds] = await Promise.all([
          supabase
            .from('teacher_profiles')
            .select('id')
            .eq('verification_status', 'verified'),
          supabase.from('parent_profiles').select('id'),
        ]);

        const uniqueActiveIds = new Set<string>([
          ...(teachersActiveIds.data || []).map(t => t.id),
          ...(parentsIds.data || []).map(p => p.id),
        ]);

        setStats({
          teachersTotal: teachersTotal.count || 0,
          teachersPending: teachersPending.count || 0,
          teachersVerified: teachersVerified.count || 0,
          teachersRejected: teachersRejected.count || 0,
          teachersSuspended: teachersSuspended.count || 0,
          parentsTotal: parentsTotal.count || 0,
          usersTotal: uniqueActiveIds.size,
        });
      } catch (err) {
        console.error('[AdminDashboard]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isFr ? 'Tableau de bord' : 'Dashboard'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isFr ? 'Vue d\'ensemble de la plateforme' : 'Platform overview'}
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={GraduationCap}
          label={isFr ? 'Professeurs' : 'Teachers'}
          value={loading ? '—' : String(stats?.teachersTotal ?? 0)}
          color="blue"
          href="/admin/teachers"
        />
        <StatCard
          icon={Users}
          label={isFr ? 'Parents' : 'Parents'}
          value={loading ? '—' : String(stats?.parentsTotal ?? 0)}
          color="emerald"
          href="/admin/users"
        />
        <StatCard
          icon={Clock}
          label={isFr ? 'À valider' : 'To validate'}
          value={loading ? '—' : String(stats?.teachersPending ?? 0)}
          color="amber"
          href="/admin/teachers?filter=pending"
          highlight={!!stats && stats.teachersPending > 0}
        />
        <StatCard
          icon={Users}
          label={isFr ? 'Utilisateurs actifs' : 'Active users'}
          value={loading ? '—' : String(stats?.usersTotal ?? 0)}
          color="slate"
        />
      </div>

      {/* Détails professeurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Statut des profs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            {isFr ? 'Statut des professeurs' : 'Teacher status'}
          </h2>
          <div className="space-y-3">
            <StatusRow
              icon={CheckCircle2}
              label={isFr ? 'Vérifiés' : 'Verified'}
              value={stats?.teachersVerified ?? 0}
              color="emerald"
            />
            <StatusRow
              icon={Clock}
              label={isFr ? 'En attente' : 'Pending'}
              value={stats?.teachersPending ?? 0}
              color="amber"
            />
            <StatusRow
              icon={XCircle}
              label={isFr ? 'Refusés' : 'Rejected'}
              value={stats?.teachersRejected ?? 0}
              color="red"
            />
            <StatusRow
              icon={Ban}
              label={isFr ? 'Suspendus' : 'Suspended'}
              value={stats?.teachersSuspended ?? 0}
              color="slate"
            />
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            {isFr ? 'Actions rapides' : 'Quick actions'}
          </h2>
          <div className="space-y-2">
            <QuickLink
              href="/admin/teachers?filter=pending"
              label={isFr ? 'Valider les professeurs en attente' : 'Validate pending teachers'}
              badge={stats?.teachersPending}
            />
            <QuickLink
              href="/admin/teachers"
              label={isFr ? 'Voir tous les professeurs' : 'View all teachers'}
            />
            <QuickLink
              href="/admin/users"
              label={isFr ? 'Gérer les utilisateurs' : 'Manage users'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Sous-composants ═══ */

function StatCard({
  icon: Icon, label, value, color = 'slate', href, highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: 'blue' | 'emerald' | 'amber' | 'slate';
  href?: string;
  highlight?: boolean;
}) {
  const colorMap = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
    slate:   { bg: 'bg-slate-100',  text: 'text-slate-600' },
  }[color];

  const inner = (
    <div className={`bg-white rounded-2xl border p-5 transition-all ${highlight ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap.bg}`}>
          <Icon className={`w-5 h-5 ${colorMap.text}`} />
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href} prefetch>{inner}</Link>;
  return inner;
}

function StatusRow({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
    red:     { bg: 'bg-red-50',     text: 'text-red-600' },
    slate:   { bg: 'bg-slate-100',  text: 'text-slate-600' },
  }[color];

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap.bg}`}>
        <Icon className={`w-4 h-4 ${colorMap.text}`} />
      </div>
      <span className="flex-1 text-sm text-slate-700">{label}</span>
      <span className="text-lg font-bold text-slate-900">{value}</span>
    </div>
  );
}

function QuickLink({
  href, label, badge,
}: {
  href: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
    >
      <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-slate-900">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}