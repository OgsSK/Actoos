'use client';

import { useEffect, useState } from 'react';
import { LogOut, Mail, User as UserIcon, Briefcase, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const { user, profile, loading, signOut, isAdmin, isCompany, isCandidate } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!user) return null;

  const roleLabel = isAdmin ? 'Administrateur' : isCompany ? 'Entreprise' : isCandidate ? 'Candidat' : 'Utilisateur';
  const roleIcon = isAdmin ? Shield : isCompany ? Briefcase : UserIcon;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-base tracking-tight">Actoos ID</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://actoos.com" className="text-sm text-slate-500 hover:text-slate-900">Vitrine</a>
            <a href="https://jobs.actoos.com" className="text-sm text-slate-500 hover:text-slate-900">Jobs</a>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Mon compte</h1>
          <p className="text-sm text-slate-500">Gérez vos informations et vos accès</p>
        </div>

        {/* Carte profil */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
              {profile?.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              {profile?.lastName?.[0]?.toUpperCase() || ''}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                <Mail size={13} />
                {user.email}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                {(() => { const Icon = roleIcon; return <Icon size={12} />; })()}
                {roleLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={process.env.NEXT_PUBLIC_STUDIO_URL || 'https://actoos.com/studio/account'}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors group"
          >
            <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Mes projets</h3>
            <p className="text-xs text-slate-500">Suivre mes projets Actoos</p>
          </a>
          <a
            href="https://jobs.actoos.com"
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors group"
          >
            <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Actoos Jobs</h3>
            <p className="text-xs text-slate-500">Accéder à la plateforme de recrutement</p>
          </a>
        </div>

        {/* Déconnexion */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-1">Déconnexion</h3>
          <p className="text-sm text-slate-500 mb-4">
            Vous serez déconnecté de tous les produits Actoos sur ce navigateur.
          </p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
          >
            <LogOut size={15} />
            Se déconnecter
          </button>
        </div>
      </main>
    </div>
  );
}