'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail, User as UserIcon, Lock, LogOut, ArrowLeft,
  ChevronRight, Globe, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ChangeNameModal from '../components/ChangeNameModal';
import ChangeEmailModal from '../components/ChangeEmailModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function SettingsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const [showName, setShowName] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isFr = language === 'fr';

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-500" />
      </div>
    );
  }
  if (!user) return null;

  const meta = user.user_metadata || {};
  const firstName = profile?.first_name || meta.first_name || '';
  const lastName = profile?.last_name || meta.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || (isFr ? 'Utilisateur' : 'User');
  const initials = ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={isFr ? 'Retour' : 'Back'}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {isFr ? 'Mon compte' : 'My account'}
            </h1>
          </div>
        </div>

        {/* Carte profil simple */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center text-lg font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 truncate">{fullName}</p>
              <p className="text-sm text-slate-500 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Profil */}
        <Section title={isFr ? 'Profil' : 'Profile'}>
          <Row
            icon={UserIcon}
            title={isFr ? 'Nom complet' : 'Full name'}
            subtitle={fullName}
            onClick={() => setShowName(true)}
          />
          <Row
            icon={Mail}
            title={isFr ? 'Adresse email' : 'Email address'}
            subtitle={user.email || ''}
            onClick={() => setShowEmail(true)}
          />
          <Row
            icon={Globe}
            title={isFr ? 'Langue' : 'Language'}
            subtitle={isFr ? 'Français' : 'English'}
            customAction={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLanguage('fr')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    language === 'fr'
                      ? 'bg-red-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    language === 'en'
                      ? 'bg-red-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  EN
                </button>
              </div>
            }
          />
        </Section>

        {/* Sécurité */}
        <Section title={isFr ? 'Sécurité' : 'Security'}>
          <Row
            icon={Lock}
            title={isFr ? 'Mot de passe' : 'Password'}
            subtitle={isFr ? 'Modifier votre mot de passe' : 'Change your password'}
            onClick={() => setShowPassword(true)}
          />
        </Section>

        {/* Déconnexion */}
        <Section title={isFr ? 'Session' : 'Session'}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50/40 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
              <LogOut size={16} className="text-slate-500 group-hover:text-red-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 group-hover:text-red-700 transition-colors">
                {isFr ? 'Se déconnecter' : 'Sign out'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFr ? 'Vous devrez vous reconnecter pour revenir' : 'You will need to sign in again'}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-red-400 transition-colors shrink-0" />
          </button>
        </Section>

      </div>

      {/* Modales */}
      <ChangeNameModal isOpen={showName} onClose={() => setShowName(false)} language={language} />
      <ChangeEmailModal isOpen={showEmail} onClose={() => setShowEmail(false)} language={language} />
      <ChangePasswordModal isOpen={showPassword} onClose={() => setShowPassword(false)} language={language} />
    </div>
  );
}

/* ═══ Sous-composants ═══ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  onClick,
  customAction,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  customAction?: React.ReactNode;
}) {
  const content = (
    <>
      <div className="w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors">
        <Icon size={16} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      {customAction ? (
        <div className="shrink-0">{customAction}</div>
      ) : (
        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-slate-200">
      {content}
    </div>
  );
}