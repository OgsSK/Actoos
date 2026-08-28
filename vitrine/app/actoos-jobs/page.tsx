import { ArrowRight, Briefcase } from 'lucide-react';

export const metadata = {
  title: 'Actoos Jobs – Plateforme d’emploi flexible | Actoos',
  description: 'Actoos Jobs est la plateforme d’Actoos dédiée aux emplois flexibles : jobs étudiants, extras, temps partiel. Accédez à toutes les offres.',
};

export default function ActoosJobsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col">
      {/* Navigation minimale */}
      <nav className="w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <span className="font-black text-xl tracking-tighter uppercase">
              ACTOOS<span className="text-[#D4AF37]">.</span>
            </span>
          </a>
          <a href="/" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            Retour au site
          </a>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="flex-1 flex items-center justify-center px-6 py-32">
        <div className="max-w-2xl w-full text-center bg-[#0F172A] rounded-[32px] p-8 md:p-12 shadow-2xl">
          <div className="w-14 h-14 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <Briefcase size={28} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-4">
            Actoos Jobs<span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="text-slate-300 text-lg mb-8">
            Notre plateforme dédiée aux emplois flexibles : jobs étudiants, extras, temps partiel et missions ponctuelles.
          </p>
          <a
            href="https://jobs.actoos.com"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:from-blue-500 hover:to-blue-700 transition-all shadow-xl"
          >
            <span>Accéder à Actoos Jobs</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="bg-white py-8 px-6 border-t border-slate-100">
        <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          © 2026 Actoos Group. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}