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
    <footer className="bg-white border-t border-slate-200">
      {/* Accent top */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8">

        {/* ═══ BLOC PRINCIPAL ═══ */}
        <div className="py-12 sm:py-14 grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-10">

          {/* ─── BRAND ─── */}
          <div className="col-span-2 md:col-span-4">
            <Link
              href="/"
              prefetch
              className="inline-flex items-center gap-2.5 mb-4"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                {BRAND.name}
              </span>
            </Link>

            <p className="text-sm text-slate-500 leading-relaxed mb-5 max-w-sm">
              {isFr
                ? 'La plateforme qui relie parents et enseignants particuliers au Mali. Trouvez le bon prof, échangez en confiance.'
                : 'The platform connecting parents and private teachers in Mali. Find the right teacher, chat with confidence.'}
            </p>

            <a
              href="mailto:contact@actoos.com"
              className="group inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              contact@actoos.com
            </a>
          </div>

          {/* ─── PARENTS ─── */}
          <div className="col-span-1 md:col-span-2">
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

          {/* ─── ENSEIGNANTS ─── */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
              {isFr ? 'Enseignants' : 'Teachers'}
            </h3>
            <ul className="space-y-3 text-sm">
              {!isTeacher && (
                <li>
                  <Link
                    href="/register?role=teacher"
                    prefetch
                    className="text-slate-500 hover:text-emerald-600 transition-colors"
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
                    className="text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    {isFr ? 'Mon profil enseignant' : 'My teacher profile'}
                  </Link>
                </li>
              )}

              <li>
                <Link
                  href="/teachers"
                  prefetch
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {isFr ? 'Voir les profs' : 'Browse teachers'}
                </Link>
              </li>
            </ul>
          </div>

          {/* ─── AIDE ─── */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
              {isFr ? 'Aide' : 'Help'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/faq"
                  prefetch
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {isFr ? 'FAQ' : 'FAQ'}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  prefetch
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {isFr ? 'Nous contacter' : 'Contact us'}
                </Link>
              </li>
            </ul>
          </div>

          {/* ─── LÉGAL ─── */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
              {isFr ? 'Légal' : 'Legal'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/legal"
                  prefetch
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {isFr ? 'Mentions légales' : 'Legal notice'}
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
            </ul>
          </div>
        </div>

        {/* ═══ BOTTOM BAR ═══ */}
        <div className="border-t border-slate-100 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            © {year} {BRAND.name} — {isFr ? 'Tous droits réservés.' : 'All rights reserved.'}
          </p>

          <p className="text-xs text-slate-400">
            {isFr ? 'Un produit' : 'An'}{' '}
            <span className="text-slate-500 font-medium">Actoos</span>
          </p>
        </div>
      </div>
    </footer>
  );
}