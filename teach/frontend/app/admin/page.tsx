'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap, Users, Clock, CheckCircle2, XCircle, Ban,
  ChevronRight, Flag, ArrowRight, Shield,
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
  reportsNew: number;
}

/* ═══ FadeInSection (identique à la home) ═══ */
function FadeInSection({
  children, delay = 0, className = '',
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) { setIsVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${className} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
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
          supabase
            .from('moderation_reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'new'),
        ]);

        if (cancelled) return;

        // Utilisateurs Teach ACTIFS = profs validés + parents
        const [teachersActiveIds, parentsIds] = await Promise.all([
          supabase.from('teacher_profiles').select('id').eq('verification_status', 'verified'),
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
    <div className="min-h-screen bg-[#fffafa] text-slate-900 selection:bg-red-100 selection:text-red-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* ═══ HEADER ═══ */}
        <FadeInSection>
          <div className="mb-8 sm:mb-10">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-red-500 mb-1.5 sm:mb-2">
              {isFr ? 'Administration' : 'Administration'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {isFr ? 'Tableau de bord' : 'Dashboard'}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-2">
              {isFr ? "Vue d'ensemble de la plateforme" : 'Platform overview'}
            </p>
          </div>
        </FadeInSection>

        {/* ═══ BANDEAU D'ALERTE (Sans l'icône) ═══ */}
        {(hasNewReports || hasPendingTeachers) && !loading && (
          <FadeInSection delay={50}>
            <div className="mb-6 sm:mb-8 relative overflow-hidden rounded-[1.35rem] border border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50 p-5 sm:p-6 flex flex-wrap items-center gap-4">
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-16 w-40 h-40 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0) 70%)' }}
              />

              <div className="relative z-10 min-w-0 flex-1">
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  {isFr ? 'Actions en attente' : 'Pending actions'}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
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

              <div className="relative z-10 flex flex-wrap gap-2 shrink-0">
                {hasNewReports && (
                  <Link
                    href="/admin/reports"
                    prefetch
                    className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-colors active:scale-95"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {isFr ? 'Voir signalements' : 'See reports'}
                  </Link>
                )}
                {hasPendingTeachers && (
                  <Link
                    href="/admin/teachers?filter=pending"
                    prefetch
                    className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors active:scale-95"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    {isFr ? 'Valider profs' : 'Validate'}
                  </Link>
                )}
              </div>
            </div>
          </FadeInSection>
        )}

        {/* ═══ STATS PRINCIPALES ═══ */}
        <FadeInSection delay={100}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
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
        </FadeInSection>

        {/* ═══ DÉTAILS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Statut des profs */}
          <FadeInSection delay={150}>
            <div className="bg-white rounded-[1.35rem] border border-slate-200 p-5 sm:p-6 hover:shadow-lg hover:border-red-100 transition-all duration-300">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {isFr ? 'Statut des professeurs' : 'Teacher status'}
                </h2>
              </div>
              <div className="space-y-1">
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
          </FadeInSection>

          {/* Actions rapides */}
          <FadeInSection delay={200}>
            <div className="bg-white rounded-[1.35rem] border border-slate-200 p-5 sm:p-6 hover:shadow-lg hover:border-red-100 transition-all duration-300">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {isFr ? 'Actions rapides' : 'Quick actions'}
                </h2>
              </div>
              <div className="space-y-2">
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
          </FadeInSection>
        </div>
      </div>
    </div>
  );
}

/* ═══ StatCard — style home ═══ */
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
    <div
      className={`group relative bg-white rounded-[1.35rem] border p-4 sm:p-5 transition-all duration-300 ${
        highlight
          ? 'border-red-200 shadow-sm ring-2 ring-red-100'
          : 'border-slate-200 hover:border-red-200 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      {badge && (
        <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">
          {badge}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1.5 tabular-nums">
            {value}
          </p>
        </div>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap.bg} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colorMap.text}`} />
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href} prefetch className="block">{inner}</Link>;
  return inner;
}

/* ═══ StatusRow — style home ═══ */
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
    <div className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50/70 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorMap.bg}`}>
        <Icon className={`w-4 h-4 ${colorMap.text}`} />
      </div>
      <span className="flex-1 text-sm text-slate-700 font-medium">{label}</span>
      <span className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

/* ═══ QuickLink — style home ═══ */
function QuickLink({
  href, label, badge, badgeColor = 'amber',
}: {
  href: string;
  label: string;
  badge?: number;
  badgeColor?: 'amber' | 'red';
}) {
  const badgeClasses = badgeColor === 'red'
    ? 'bg-red-500 text-white'
    : 'bg-amber-500 text-white';

  return (
    <Link
      href={href}
      prefetch
      className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50/40 transition-all duration-200"
    >
      <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeClasses}`}>
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}