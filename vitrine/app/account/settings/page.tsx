'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';
import { ArrowLeft, Loader2, Mail, Lock, Trash2, Check, X } from 'lucide-react';

export default function AccountSettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { user, signOut, updateEmail, updatePassword, deleteAccount } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'email' | 'password' | 'delete'>('email');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Changer email
  const [newEmail, setNewEmail] = useState('');

  // Changer mot de passe
  const [newPassword, setNewPassword] = useState('');

  // Redirection si non connecté (dans un useEffect pour éviter les erreurs SSR)
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Pendant la redirection, ne rien afficher
  if (!user) {
    return null;
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const { error } = await updateEmail(newEmail);
    if (error) {
      setError(error);
    } else {
      setSuccess(language === 'en' ? 'A confirmation email has been sent to your new address.' : 'Un email de confirmation a été envoyé à votre nouvelle adresse.');
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    if (newPassword.length < 6) {
      setError(language === 'en' ? 'Password must be at least 6 characters.' : 'Le mot de passe doit contenir au moins 6 caractères.');
      setLoading(false);
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (error) {
      setError(error);
    } else {
      setSuccess(language === 'en' ? 'Password updated successfully.' : 'Mot de passe mis à jour avec succès.');
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm(language === 'en' ? 'Delete your account permanently? This action cannot be undone.' : 'Supprimer votre compte définitivement ? Cette action est irréversible.')) return;
    setLoading(true);
    setError('');
    const { error } = await deleteAccount();
    if (error) {
      setError(error);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'email' as const, label: language === 'en' ? 'Change email' : "Changer l'email", icon: Mail },
    { id: 'password' as const, label: language === 'en' ? 'Change password' : 'Changer le mot de passe', icon: Lock },
    { id: 'delete' as const, label: language === 'en' ? 'Delete account' : 'Supprimer le compte', icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <span className="font-black text-xl tracking-tighter uppercase">
              ACTOOS<span className="text-[#D4AF37]">.</span>
            </span>
          </Link>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <button onClick={() => setLanguage('fr')} className={`${language === 'fr' ? 'text-slate-900 underline' : 'hover:text-black'}`}>FR</button>
              <button onClick={() => setLanguage('en')} className={`${language === 'en' ? 'text-slate-900 underline' : 'hover:text-black'}`}>EN</button>
            </div>
            <Link href="/" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold">
              <ArrowLeft size={18} />
              <span>{t[language]?.back || 'Retour'}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950 mb-8 text-center">
          {language === 'en' ? 'Account settings' : 'Paramètres du compte'}
        </h1>

        {/* Onglets */}
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-slate-200 shadow-sm w-fit mx-auto mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Messages de succès / erreur */}
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <Check size={16} /> {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <X size={16} /> {error}
          </div>
        )}

        {/* Changer email */}
        {activeTab === 'email' && (
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <p className="text-sm text-slate-500">
              {language === 'en' ? `Current email: ${user.email}` : `Email actuel : ${user.email}`}
            </p>
            <input
              type="email"
              placeholder={language === 'en' ? 'New email' : 'Nouvel email'}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#D4AF37] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {language === 'en' ? 'Update email' : "Mettre à jour l'email"}
            </button>
          </form>
        )}

        {/* Changer mot de passe */}
        {activeTab === 'password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input
              type="password"
              placeholder={language === 'en' ? 'New password (min. 6 characters)' : 'Nouveau mot de passe (min. 6 caractères)'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#D4AF37] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {language === 'en' ? 'Update password' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}

        {/* Supprimer le compte */}
        {activeTab === 'delete' && (
          <div className="text-center space-y-4">
            <p className="text-sm text-slate-500">
              {language === 'en'
                ? 'This action is irreversible. All your data will be permanently deleted.'
                : 'Cette action est irréversible. Toutes vos données seront supprimées définitivement.'}
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              <Trash2 size={16} />
              {language === 'en' ? 'Delete my account' : 'Supprimer mon compte'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}