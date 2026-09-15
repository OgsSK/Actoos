'use client';

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTeachRole } from '../hooks/useTeachRole';
import { BRAND } from '@/lib/constants';

export default function Footer() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isTeacher } = useTeachRole();
  const isFr = language === 'fr';
  const year = new Date().getFullYear();

  const isLoggedIn = Boolean(user);

  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-14">

        {/* ═══ Grille principale ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">

          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              prefetch
              className="font-bold text-lg tracking-tight text-slate-900 inline-block mb-3"
            >
              {BRAND.name}
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              {isFr
                ? 'La plateforme qui relie parents et enseignants au Mali.'
                : 'The platform connecting parents and teachers in Mali.'}
            </p>
          </div>

          {/* Parents */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
              {isFr ? 'Parents' : 'Parents'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/teachers"
                  prefetch
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {isFr ? 'Trouver un prof' : 'Find a teacher'}
                </Link>
              </li>

              {/* Créer un compte UNIQUEMENT si déconnecté */}
              {!isLoggedIn && (
                <li>
                  <Link
                    href="/register"
                    prefetch
                    className="text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    {isFr ? 'Créer un compte' : 'Create account'}
                  </Link>
                </li>
              )}

              {/* Mon espace UNIQUEMENT si connecté */}
              {isLoggedIn && (
                <li>
                  <Link
                    href="/dashboard"
                    prefetch
                    className="text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    {isFr ? 'Mon espace' : 'My space'}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Enseignants */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
              {isFr ? 'Enseignants' : 'Teachers'}
            </h3>
            <ul className="space-y-3 text-sm">
              {/* Devenir enseignant : seulement si non-prof */}
              {!isTeacher && (
                <li>
                  {/* ✅ FIX : /become-teacher n'existe pas → /register?role=teacher */}
                  <Link
                    href="/register?role=teacher"
                    prefetch
                    className="text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    {isFr ? 'Devenir enseignant' : 'Become a teacher'}
                  </Link>
                </li>
              )}

              {/* Créer un profil : seulement si déconnecté OU parent (pas prof) */}
              {(!isLoggedIn || !isTeacher) && (
                <li>
                  <Link
                    href="/register?role=teacher"
                    prefetch
                    className="text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    {isFr ? 'Créer un profil' : 'Create a profile'}
                  </Link>
                </li>
              )}

              {/* Espace prof : seulement si prof */}
              {isTeacher && (
                <li>
                  <Link
                    href="/teacher/profile/edit"
                    prefetch
                    className="text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    {isFr ? 'Mon profil enseignant' : 'My teacher profile'}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
              {isFr ? 'Informations' : 'Information'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/legal"
                  prefetch
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {isFr ? 'Mentions légales' : 'Legal'}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  prefetch
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {isFr ? 'Confidentialité' : 'Privacy'}
                </Link>
              </li>
              <li>
                {/* mailto reste un <a> : c'est un lien externe */}
                <a
                  href="mailto:contact@kalanden.com"
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ═══ Bottom ═══ */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © {year} {BRAND.name}. {isFr ? 'Tous droits réservés.' : 'All rights reserved.'}
          </p>

          <div className="flex items-center gap-5 text-xs text-slate-400">
            <Link href="/legal" prefetch className="hover:text-emerald-600 transition-colors">
              {isFr ? 'CGU' : 'Terms'}
            </Link>
            <Link href="/privacy" prefetch className="hover:text-emerald-600 transition-colors">
              {isFr ? 'Confidentialité' : 'Privacy'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}