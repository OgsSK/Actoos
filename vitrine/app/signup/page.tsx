'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const { language, setLanguage } = useLanguage();
  const { signUp, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signUp(email, password, name);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
      router.push(redirect);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
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

      <main className="pt-32 pb-20 px-6 max-w-md mx-auto">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950 mb-8 text-center">
          {language === 'en' ? 'Create an account' : 'Créer un compte'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
          )}

          <input
            type="text"
            placeholder={language === 'en' ? 'Your name' : 'Votre nom'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
          />

          <input
            type="email"
            placeholder={t[language]?.contactPlaceholderEmail || 'Email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t[language]?.adminPasswordPlaceholder || 'Mot de passe'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-950 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#D4AF37] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {language === 'en' ? 'Create account' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            {language === 'en' ? 'Already have an account?' : 'Déjà un compte ?'}{' '}
            <Link href={`/login?redirect=${encodeURIComponent(new URLSearchParams(window.location.search).get('redirect') || '/')}`} className="text-[#D4AF37] font-bold hover:underline">
              {language === 'en' ? 'Log in' : 'Se connecter'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}