'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap, Users, Clock, CheckCircle2, XCircle, Ban,
  ChevronRight, Flag,
} from 'lucide-react';
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
  reportsNew: number;   // ✨ nouveau
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
          reportsNew,
        ] = await Promise.all([
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'suspended'),
          supabase.from('parent_profiles').select('id', { count: 'exact', head: true }),
          // ✨ Signalements non lus
          supabase
            .from('moderation_reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'new'),
        ]);

        if (cancelled) return;

        // Utilisateurs Teach ACTIFS = profs validés + parents
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
          reportsNew: reportsNew.count || 0,
        });
      } catch (err) {
        console.error('[AdminDashboard]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const hasNewReports = (stats?.reportsNew ?? 0) > 0;
  const hasPendingTeachers = (stats?.teachersPending ?? 0) > 0;

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

      {/* ✨ Bandeau d'alerte si actions en attente */}
      {(hasNewReports || hasPendingTeachers) && !loading && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {isFr ? 'Actions en attente' : 'Pending actions'}
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              {hasNewReports && hasPendingTeachers
                ? (isFr
                    ? `${stats?.reportsNew} signalement${(stats?.reportsNew ?? 0) > 1 ? 's' : ''} non lu${(stats?.reportsNew ?? 0) > 1 ? 's' : ''} • ${stats?.teachersPending} prof${(stats?.teachersPending ?? 0) > 1 ? 's' : ''} à valider`
                    : `${stats?.reportsNew} new report${(stats?.reportsNew ?? 0) > 1 ? 's' : ''} • ${stats?.teachersPending} teacher${(stats?.teachersPending ?? 0) > 1 ? 's' : ''} to validate`)
                : hasNewReports
                  ? (isFr
                      ? `${stats?.reportsNew} signalement${(stats?.reportsNew ?? 0) > 1 ? 's' : ''} à examiner`
                      : `${stats?.reportsNew} report${(stats?.reportsNew ?? 0) > 1 ? 's' : ''} to review`)
                  : (isFr
                      ? `${stats?.teachersPending} prof${(stats?.teachersPending ?? 0) > 1 ? 's' : ''} en attente de validation`
                      : `${stats?.teachersPending} teacher${(stats?.teachersPending ?? 0) > 1 ? 's' : ''} pending`)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {hasNewReports && (
              <Link
                href="/admin/reports"
                prefetch
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                {isFr ? 'Voir signalements' : 'See reports'}
              </Link>
            )}
            {hasPendingTeachers && (
              <Link
                href="/admin/teachers?filter=pending"
                prefetch
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {isFr ? 'Valider profs' : 'Validate'}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
        {/* ✨ Nouveau : signalements */}
        <StatCard
          icon={Flag}
          label={isFr ? 'Signalements' : 'Reports'}
          value={loading ? '—' : String(stats?.reportsNew ?? 0)}
          color="red"
          href="/admin/reports"
          highlight={!!stats && stats.reportsNew > 0}
          badge={stats && stats.reportsNew > 0 ? String(stats.reportsNew) : undefined}
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
            {/* ✨ Signalements en priorité si présents */}
            <QuickLink
              href="/admin/reports"
              label={isFr ? 'Gérer les signalements' : 'Manage reports'}
              badge={stats?.reportsNew}
              badgeColor="red"
            />
            <QuickLink
              href="/admin/teachers?filter=pending"
              label={isFr ? 'Valider les professeurs en attente' : 'Validate pending teachers'}
              badge={stats?.teachersPending}
              badgeColor="amber"
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
  icon: Icon, label, value, color = 'slate', href, highlight, badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: 'blue' | 'emerald' | 'amber' | 'slate' | 'red';
  href?: string;
  highlight?: boolean;
  badge?: string;
}) {
  const colorMap = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
    slate:   { bg: 'bg-slate-100',  text: 'text-slate-600' },
    red:     { bg: 'bg-red-50',     text: 'text-red-600' },
  }[color];

  const inner = (
    <div className={`relative bg-white rounded-2xl border p-5 transition-all ${highlight ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'}`}>
      {/* ✨ Badge en haut à droite */}
      {badge && (
        <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shadow-sm ring-2 ring-white">
          {badge}
        </span>
      )}
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
  href, label, badge, badgeColor = 'amber',
}: {
  href: string;
  label: string;
  badge?: number;
  badgeColor?: 'amber' | 'red';
}) {
  const badgeClasses = badgeColor === 'red'
    ? 'bg-red-600 text-white'
    : 'bg-amber-500 text-white';

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
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClasses}`}>
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}