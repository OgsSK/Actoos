'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { GraduationCap, Users, ChevronRight, Loader2, Check, XCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { isTeacher, isParent, isTeacherRejected, teacherProfile, loading: roleLoading } = useTeachRole();
  const [submitting, setSubmitting] = useState<null | 'teacher' | 'parent'>(null);
  const [error, setError] = useState('');

  const isFr = language === 'fr';

  const rolesCount = (isTeacher ? 1 : 0) + (isParent ? 1 : 0);
  const hasBothRoles = isTeacher && isParent;

  const headerTitle = isFr
    ? rolesCount === 0
      ? `Bienvenue sur ${BRAND.name}`
      : 'Ajouter un rôle'
    : rolesCount === 0
      ? `Welcome to ${BRAND.name}`
      : 'Add a role';

  const headerSubtitle = isFr
    ? rolesCount === 0
      ? 'Pour commencer, dites-nous qui vous êtes.'
      : 'Vous pouvez cumuler les deux rôles sur un même compte.'
    : rolesCount === 0
      ? 'To get started, tell us who you are.'
      : 'You can cumulate both roles on the same account.';

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (hasBothRoles && !isTeacherRejected) {
      window.location.href = '/dashboard';
    }
  }, [authLoading, roleLoading, user, hasBothRoles, isTeacherRejected]);

  async function handleChoose(role: 'teacher' | 'parent') {
    if (!user || submitting) return;

    if (role === 'teacher' && isTeacher && !isTeacherRejected) return;
    if (role === 'parent' && isParent) return;

    setError('');
    setSubmitting(role);

    try {
      if (role === 'teacher') {
        if (isTeacherRejected) {
          const { error: updErr } = await supabase
            .from('teacher_profiles')
            .update({
              verification_status: 'pending',
              rejected_reason: null,
            })
            .eq('id', user.id);
          if (updErr) throw updErr;
        } else {
          const { error: insertErr } = await supabase
            .from('teacher_profiles')
            .insert({ id: user.id, verification_status: 'pending' });
          if (insertErr && insertErr.code !== '23505') throw insertErr;
        }

        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'admin-new-teacher',
              teacher_id: user.id,
            }),
          }
        ).catch((e) => console.warn('[Email] Non envoyé:', e));
      } else {
        const { error: insertErr } = await supabase
          .from('parent_profiles')
          .insert({ id: user.id });
        if (insertErr && insertErr.code !== '23505') throw insertErr;
      }

      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('[Onboarding]', err);
      setError(
        err?.message ||
          (isFr ? 'Erreur lors de la création du profil. Réessayez.' : 'Error creating profile. Please retry.')
      );
      setSubmitting(null);
    }
  }

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffafa]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#fffafa] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">

        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-red-500 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{headerTitle}</h1>
          <p className="text-slate-500 text-base">{headerSubtitle}</p>
          <p className="text-xs text-slate-400 mt-2 truncate">{user.email}</p>
        </div>

        {/* 2 cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Enseignant */}
          {isTeacher && !isTeacherRejected ? (
            <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 text-left">
              <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-red-500" strokeWidth={3} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {isFr ? 'Enseignant' : 'Teacher'}
              </h2>
              <p className="text-sm text-red-600 leading-relaxed font-medium">
                {isFr ? 'Rôle déjà ajouté' : 'Role already added'}
              </p>
            </div>
          ) : isTeacherRejected ? (
            <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 text-left">
              <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {isFr ? 'Enseignant — Refusé' : 'Teacher — Rejected'}
              </h2>
              {teacherProfile?.rejected_reason && (
                <p className="text-sm text-red-700 leading-relaxed mb-4">
                  <strong>{isFr ? 'Raison :' : 'Reason:'}</strong> {teacherProfile.rejected_reason}
                </p>
              )}
              <button
                onClick={() => handleChoose('teacher')}
                disabled={submitting !== null}
                className="inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900 underline disabled:opacity-50"
              >
                {submitting === 'teacher' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isFr ? 'Retenter ma candidature' : 'Retry my application'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleChoose('teacher')}
              disabled={submitting !== null}
              className="group bg-white rounded-2xl border-2 border-slate-200 p-6 text-left hover:border-red-400 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
                {submitting === 'teacher' ? (
                  <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
                ) : (
                  <GraduationCap className="w-7 h-7 text-red-500" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {isFr ? 'Je suis enseignant' : "I'm a teacher"}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {isFr
                  ? 'Proposez des cours particuliers et recevez des demandes de parents.'
                  : 'Offer private lessons and receive requests from parents.'}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-red-500 group-hover:text-red-600">
                {rolesCount === 0
                  ? isFr ? 'Commencer' : 'Get started'
                  : isFr ? 'Ajouter ce rôle' : 'Add this role'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          )}

          {/* Parent */}
          {isParent ? (
            <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 text-left">
              <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-red-500" strokeWidth={3} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {isFr ? 'Parent' : 'Parent'}
              </h2>
              <p className="text-sm text-red-600 leading-relaxed font-medium">
                {isFr ? 'Rôle déjà ajouté' : 'Role already added'}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleChoose('parent')}
              disabled={submitting !== null}
              className="group bg-white rounded-2xl border-2 border-slate-200 p-6 text-left hover:border-red-400 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
                {submitting === 'parent' ? (
                  <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
                ) : (
                  <Users className="w-7 h-7 text-red-500" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {isFr ? 'Je suis parent' : "I'm a parent"}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {isFr
                  ? 'Trouvez le prof idéal pour votre enfant et échangez en confiance.'
                  : 'Find the ideal teacher for your child and chat with confidence.'}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-red-500 group-hover:text-red-600">
                {rolesCount === 0
                  ? isFr ? 'Commencer' : 'Get started'
                  : isFr ? 'Ajouter ce rôle' : 'Add this role'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {rolesCount > 0 && (
          <div className="text-center mt-8">
            <a
              href="/dashboard"
              className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
            >
              {isFr ? '← Retour au tableau de bord' : '← Back to dashboard'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}