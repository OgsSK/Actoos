'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTeachRole } from '../hooks/useTeachRole';
import { useIsAdmin } from '../hooks/useIsAdmin';
import TeacherDashboard from './TeacherDashboard';
import ParentDashboard from './ParentDashboard';

// ============================================================
// PRIMITIVES
// ============================================================
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ============================================================
// SKELETON
// ============================================================
function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

function DashboardRouterSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
        <SkeletonLine className="w-16 h-16 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-7 w-56 max-w-full" />
          <SkeletonLine className="h-4 w-full max-w-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
          <SkeletonLine className="h-11 w-full sm:w-40 rounded-xl" />
          <SkeletonLine className="h-11 w-full sm:w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="h-3.5 w-24" />
                  <SkeletonLine className="h-6 w-16" />
                </div>
                <SkeletonLine className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 h-40" />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 h-56" />
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 h-40" />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 h-32" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isTeacher, isParent, loading: roleLoading } = useTeachRole();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  // Redirection login si non connecté
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [user, authLoading]);

  // ✅ Redirection admin → /admin
  useEffect(() => {
    if (adminLoading || authLoading) return;
    if (isAdmin) {
      router.replace('/admin');
    }
  }, [isAdmin, adminLoading, authLoading, router]);

  // Skeleton pendant le chargement (auth + rôle + admin)
  if (authLoading || roleLoading || adminLoading) {
    return <DashboardRouterSkeleton />;
  }

  // ✅ Si admin → on affiche un mini loader le temps de la redirection
  if (isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Redirection vers l'espace admin…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Prof → dashboard prof
  if (isTeacher && !isParent) return <TeacherDashboard />;

  // Parent → dashboard parent
  if (isParent && !isTeacher) return <ParentDashboard />;

  // Les deux rôles → dashboard prof
  if (isTeacher && isParent) {
    return <TeacherDashboard />;
  }

  // Aucun profil
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
              <GraduationCap className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Profil introuvable
            </h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Aucun profil Teach n'est associé à ce compte.
            </p>
            <a href="/">
              <PrimaryButton>
                <ArrowLeft className="w-4 h-4" />
                Retour à l'accueil
              </PrimaryButton>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}