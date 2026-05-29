'use client';

import { ArrowLeft, ArrowRight, CheckCircle2, Building2, Briefcase } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <span className="font-black text-xl tracking-tighter uppercase">
              ACTOOS<span className="text-[#D4AF37]">.</span>
            </span>
          </a>
          <a href="/" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold">
            <ArrowLeft size={18} />
            <span>Retour</span>
          </a>
        </div>
      </nav>

      {/* Contenu */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
            Nos solutions
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 mb-6">
            Des logiciels pensés pour l'action<span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Des outils concrets, déjà à l'œuvre dans des entreprises exigeantes.
          </p>
        </div>

        {/* Actoos Pro */}
        <div className="bg-[#0F172A] rounded-[48px] p-8 md:p-16 mb-16 relative overflow-hidden shadow-2xl">
          <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-[#D4AF37]/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#10B981]/5 blur-[100px] rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-[#10B981] rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Building2 size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Actoos Pro</h2>
                <p className="text-[#10B981] text-sm font-bold">Gestion d'interventions terrain</p>
              </div>
            </div>

            <p className="text-slate-400 text-lg mb-8 max-w-2xl">
              La plateforme tout-en-un pour les entreprises de services terrain : planning intelligent,
              suivi des techniciens en temps réel, devis et factures intégrés, rapports automatiques.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                'Planning intelligent',
                'Suivi en temps réel',
                'Devis & Factures',
                'Gestion des techniciens',
                'Mode hors-ligne',
                'Rapports PDF',
                'Géolocalisation',
                'Export comptable',
                'Signature électronique',
                "Photos d'intervention",
              ].map((feature, i) => (
                <div key={i} className="flex items-center space-x-2 text-white/80">
                  <CheckCircle2 size={16} className="text-[#10B981] flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://pro.actoos.com/signup"
                className="inline-flex items-center space-x-2 bg-[#10B981] text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl hover:shadow-emerald-500/30"
              >
                <span>Essai gratuit 14 jours</span>
                <ArrowRight size={16} />
              </a>
              <a
                href="/contact"
                className="inline-flex items-center space-x-2 bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
              >
                <span>Nous contacter</span>
              </a>
            </div>
          </div>
        </div>

                {/* Actoos Jobs */}
        <div className="bg-[#0F172A] rounded-[48px] p-8 md:p-16 mb-16 relative overflow-hidden shadow-2xl">
          <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-[#2563EB]/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#1D4ED8]/5 blur-[100px] rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Briefcase size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Actoos Jobs</h2>
                <p className="text-[#3B82F6] text-sm font-bold">Recrutement flexible</p>
              </div>
            </div>

            <p className="text-slate-400 text-lg mb-8 max-w-2xl">
              La plateforme de recrutement pour les jobs flexibles : étudiants, extras, temps partiel et missions ponctuelles.
              Publiez une offre en quelques minutes et trouvez le bon profil localement.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                'Publication d\'offres rapide',
                'Recherche par ville et catégorie',
                'Candidatures simplifiées',
                'Espace entreprise dédié',
                'Tableau de bord candidat',
                'Matching intelligent',
                'Jobs étudiants & extras',
                'Temps partiel & stages',
                'Abonnements flexibles',
                'Boost de visibilité',
              ].map((feature, i) => (
                <div key={i} className="flex items-center space-x-2 text-white/80">
                  <CheckCircle2 size={16} className="text-[#2563EB] flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://jobs.actoos.com"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:from-blue-500 hover:to-blue-700 transition-all shadow-xl hover:shadow-blue-500/30"
              >
                <span>Accéder à Actoos Jobs</span>
                <ArrowRight size={16} />
              </a>
              <a
                href="/contact"
                className="inline-flex items-center space-x-2 bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
              >
                <span>Nous contacter</span>
              </a>
            </div>
          </div>
        </div>

        {/* Ouverture vers le futur */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-950 mb-4">
            Et pour vos autres besoins ?
          </h2>
          <p className="text-slate-500 mb-8">
            Chaque entreprise est unique. Nous concevons des logiciels sur mesure, adaptés à votre secteur.
            <a href="/contact" className="text-[#D4AF37] hover:underline ml-1">Parlons de votre projet</a>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-8 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          <p>© Actoos Group. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}