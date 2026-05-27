'use client';

import { ArrowLeft, Target, Eye, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">
                ACTOOS<span className="text-[#D4AF37]">.</span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 hidden sm:block">
                Technology Group
              </span>
            </div>
          </a>
          <a 
            href="/"
            className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
          >
            <ArrowLeft size={18} />
            <span>Retour</span>
          </a>
        </div>
      </nav>

      {/* Contenu */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
            À propos
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 mb-6">
            Nous sommes Actoos<span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Un groupe technologique dédié à la création de logiciels sur mesure.
            Nous transformons des idées en solutions numériques performantes depuis sa création.
          </p>
        </div>

        {/* Mission / Vision / Valeurs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-50 rounded-[32px] p-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#F5D78E] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/20">
              <Target size={24} className="text-slate-900" />
            </div>
            <h3 className="text-xl font-black mb-3">Notre mission</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Démocratiser l'accès aux outils numériques les plus avancés pour les entreprises et les entrepreneurs, partout dans le monde.
            </p>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Eye size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-black mb-3">Notre vision</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Un monde où chaque entreprise, quelle que soit sa taille, dispose des outils logiciels dont elle a besoin pour réussir.
            </p>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <Heart size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-black mb-3">Nos valeurs</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Sur mesure, Accompagnement, Évolutivité. Chaque solution est unique, et nous restons à vos côtés dans la durée.
            </p>
          </div>
        </div>

        {/* Histoire */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950 mb-6 text-center">
            Notre histoire
          </h2>
          <div className="bg-slate-50 rounded-[32px] p-8 md:p-12">
            <div className="space-y-6 text-slate-600 leading-relaxed">
              <p>
                Actoos a été fondé par une équipe d'ingénieurs passionnés par la création de solutions technologiques accessibles et performantes.
              </p>
              <p>
                L'entreprise est née d'un constat simple : trop de PME et d'entrepreneurs sont freinés par l'absence d'outils numériques adaptés à leurs besoins spécifiques. Les solutions existantes sont souvent trop génériques, trop coûteuses, ou trop complexes à mettre en œuvre.
              </p>
              <p>
                Actoos a donc été créé avec une mission claire : concevoir et développer des logiciels sur mesure qui s'adaptent parfaitement aux processus de chaque client, sans compromis sur la qualité ou la performance.
              </p>
              <p>
                Aujourd'hui, Actoos accompagne des entreprises dans des secteurs variés : gestion d'interventions terrain, applications mobiles grand public, plateformes web complexes, et bien plus encore.
              </p>
            </div>
          </div>
        </div>

        {/* Équipe (simplifiée) */}
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950 mb-8">
            L'équipe
          </h2>
          <div className="flex justify-center">
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 max-w-sm">
             <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#F5D78E] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
  <span className="text-3xl font-black text-white">AT</span>
</div>
<h3 className="font-bold text-xl mb-1">L'équipe Actoos</h3>
<p className="text-slate-500 text-sm">Équipe dirigeante</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-6">
            Une équipe de passionnés, prête à relever vos défis technologiques.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-8 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          <p>© Actoos Group. Tous droits réservés.</p>
          <div className="flex space-x-8">
            <a href="/privacy" className="hover:text-black transition-colors">Confidentialité</a>
            <a href="/legal" className="hover:text-black transition-colors">Mentions légales</a>
          </div>
        </div>
      </footer>
    </div>
  );
}