'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTeachRole } from '../hooks/useTeachRole';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { supabase } from '@/lib/supabase';   // ← AJOUT : import manquant
import TeacherDashboard from './TeacherDashboard';
import ParentDashboard from './ParentDashboard';

type Role = 'teacher' | 'parent';
const STORAGE_KEY = 'actoos-teach-active-role';

type Decision =
  | 'pending'                // En cours de vérification
  | 'redirect-login'         // Pas connecté
  | 'redirect-suspended'     // Compte suspendu
  | 'redirect-admin'         // Admin → /admin
  | 'redirect-onboarding'    // Pas de profil → onboarding
  | 'render-teacher'         // Prof
  | 'render-parent'          // Parent
  | 'render-both';           // Les 2 rôles → toggle

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    isTeacher,
    isParent,
    isTeacherRejected,
    loading: roleLoading,
  } = useTeachRole();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [decision, setDecision] = useState<Decision>('pending');
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [isSuspended, setIsSuspended] = useState<boolean | null>(null);

  // Charge l'état de suspension
  useEffect(() => {
    if (authLoading || !user?.id) {
      setIsSuspended(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('users')
        .select('suspended_at')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setIsSuspended(!!data?.suspended_at);
    })();

    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  // Charge le rôle actif depuis localStorage (pour les users avec 2 rôles)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'teacher' || stored === 'parent') setActiveRole(stored);
  }, []);

  // ⚡️ UNE SEULE décision, prise quand TOUT est chargé
  useEffect(() => {
    // 1. Attendre que tous les checks soient terminés
    if (authLoading || roleLoading || adminLoading) return;
    if (isSuspended === null) return;   // ← Attendre le check suspension

    // 2. Si on a déjà décidé, ne pas recalculer
    if (decision !== 'pending') return;

    // 3. Aucun user → login
    if (!user) {
      setDecision('redirect-login');
      router.replace('/login');
      return;
    }

    // 3.b. Compte suspendu → /suspended (AVANT tout le reste)
    if (isSuspended) {
      setDecision('redirect-suspended');
      router.replace('/suspended');
      return;
    }

    // 4. Admin → /admin
    if (isAdmin) {
      setDecision('redirect-admin');
      router.replace('/admin');
      return;
    }

    // 5. Prof refusé sans profil parent → onboarding
    if (isTeacherRejected && !isParent) {
      setDecision('redirect-onboarding');
      router.replace('/onboarding');
      return;
    }

    // 6. Aucun profil → onboarding
    if (!isTeacher && !isParent) {
      setDecision('redirect-onboarding');
      router.replace('/onboarding');
      return;
    }

    // 7. Prof seul → TeacherDashboard
    if (isTeacher && !isParent) {
      setDecision('render-teacher');
      return;
    }

    // 8. Parent seul → ParentDashboard
    if (isParent && !isTeacher) {
      setDecision('render-parent');
      return;
    }

    // 9. Les 2 rôles → toggle
    if (isTeacher && isParent) {
      setDecision('render-both');
      // Définit le rôle par défaut si pas dans localStorage
      if (!activeRole) setActiveRole('teacher');
    }
  }, [
    authLoading, roleLoading, adminLoading, isSuspended,
    user, isAdmin, isTeacher, isParent, isTeacherRejected,
    decision, activeRole, router,
  ]);

  const changeRole = (role: Role) => {
    setActiveRole(role);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, role);
  };

  // 🚫 TANT QUE LA DÉCISION N'EST PAS PRISE → LOADER UNIQUEMENT
  if (
    decision === 'pending' ||
    decision === 'redirect-login' ||
    decision === 'redirect-suspended' ||
    decision === 'redirect-admin' ||
    decision === 'redirect-onboarding'
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  // ✅ Rendu
  if (decision === 'render-teacher') return <TeacherDashboard />;
  if (decision === 'render-parent') return <ParentDashboard />;

  // Les 2 rôles → toggle
  return (
    <div className="relative">
      <div className="pt-6 pb-2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-full shadow-sm">
            <button
              onClick={() => changeRole('teacher')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeRole === 'teacher'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Enseignant
            </button>
            <button
              onClick={() => changeRole('parent')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeRole === 'parent'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Parent
            </button>
          </div>
        </div>
      </div>
      {activeRole === 'teacher' ? <TeacherDashboard /> : <ParentDashboard />}
    </div>
  );
}