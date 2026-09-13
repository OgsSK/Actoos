'use client';
export const dynamic = 'force-dynamic';
import { BookOpen, Users, Search, ArrowRight } from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Actoos Teach" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg tracking-tight">Actoos Teach</span>
          </a>
          <div className="flex items-center gap-3">
            {!loading && user ? (
              <a
                href="/dashboard"
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Mon espace
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Se connecter
                </a>
                <a
                  href="/register"
                  className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  Créer un compte
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
            Trouvez le prof idéal pour votre enfant
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-9">
            Des enseignants vérifiés, des cours adaptés à chaque élève.
            Soutien scolaire, préparation d'examens, cours particuliers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/register"
              className="group inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              Trouver un prof
              <ArrowRight size={15} />
            </a>
            <a
              href="/register?role=teacher"
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Devenir enseignant
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Recherche simple</h3>
            <p className="text-sm text-slate-500">Filtrez par matière, niveau et ville</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users size={22} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Profs vérifiés</h3>
            <p className="text-sm text-slate-500">Identité et diplômes contrôlés</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={22} className="text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Cours adaptés</h3>
            <p className="text-sm text-slate-500">En ligne ou à domicile</p>
          </div>
        </div>
      </main>
    </div>
  );
}