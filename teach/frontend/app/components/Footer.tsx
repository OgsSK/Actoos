'use client';

import Link from 'next/link';
import { GraduationCap, Mail } from 'lucide-react';
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
    <footer className="bg-slate-950 text-slate-300">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">

        {/* ═══ BLOC PRINCIPAL ═══ */}
        <div className="py-14 sm:py-16 grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-8">

          {/* ─── BRAND ─── */}
          <div className="col-span-2 md:col-span-4">
            <Link
              href="/"
              prefetch
              className="inline-flex items-center gap-2.5 mb-4"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                {BRAND.name}
              </span>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-sm">
              {isFr
                ? 'La plateforme qui relie parents et enseignants particuliers. Trouvez le bon prof, échangez en confiance.'
                : 'The platform connecting parents and private teachers. Find the right teacher, chat with confidence.'}
            </p>

            <a
              href="mailto:contact@actoos.com"
              className="group inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              contact@actoos.com
            </a>
          </div>

          {/* ─── PARENTS ─── */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-5">
              {isFr ? 'Parents' : 'Parents'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/teachers"
                  prefetch
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isFr ? 'Trouver un prof' : 'Find a teacher'}
                </Link>
              </li>

              {!isLoggedIn && (
                <li>
                  <Link
                    href="/register"
                    prefetch
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {isFr ? 'Créer un compte' : 'Create account'}
                  </Link>
                </li>
              )}

              {isLoggedIn && (
                <li>
                  <Link
                    href="/dashboard"
                    prefetch
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {isFr ? 'Mon espace' : 'My space'}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* ─── ENSEIGNANTS ─── */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-5">
              {isFr ? 'Enseignants' : 'Teachers'}
            </h3>
            <ul className="space-y-3 text-sm">
              {!isTeacher && (
                <li>
                  <Link
                    href="/register?role=teacher"
                    prefetch
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {isFr ? 'Devenir enseignant' : 'Become a teacher'}
                  </Link>
                </li>
              )}

              {isTeacher && (
                <li>
                  <Link
                    href="/teacher/profile/edit"
                    prefetch
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {isFr ? 'Mon profil enseignant' : 'My teacher profile'}
                  </Link>
                </li>
              )}

              <li>
                <Link
                  href="/teachers"
                  prefetch
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isFr ? 'Voir les profs' : 'Browse teachers'}
                </Link>
              </li>
            </ul>
          </div>

          {/* ─── AIDE ─── */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-5">
              {isFr ? 'Aide' : 'Help'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/faq"
                  prefetch
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isFr ? 'FAQ' : 'FAQ'}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  prefetch
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isFr ? 'Nous contacter' : 'Contact us'}
                </Link>
              </li>
            </ul>
          </div>

          {/* ─── LÉGAL ─── */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-5">
              {isFr ? 'Légal' : 'Legal'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/legal"
                  prefetch
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isFr ? 'Mentions légales' : 'Legal notice'}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  prefetch
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isFr ? 'Confidentialité' : 'Privacy'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ═══ BOTTOM BAR ═══ */}
        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {year} {BRAND.name} — {isFr ? 'Tous droits réservés.' : 'All rights reserved.'}
          </p>

          <p className="text-xs text-slate-500">
            {isFr ? 'Un produit' : 'An'}{' '}
            <span className="text-slate-400 font-medium">Actoos</span>
          </p>
        </div>
      </div>
    </footer>
  );
}