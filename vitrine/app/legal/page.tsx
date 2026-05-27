'use client';

import { ArrowLeft } from 'lucide-react';

export default function LegalPage() {
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

      {/* Content */}
      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
          Mentions Légales<span className="text-[#D4AF37]">.</span>
        </h1>
        <p className="text-slate-400 text-sm mb-12">Dernière mise à jour : Mai 2025</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">1. Éditeur du Site</h2>
            <p className="text-slate-600 leading-relaxed">
              <strong>ACTOOS Group</strong><br />
              Société par Actions Simplifiée (SAS)<br />
              Email : <a href="mailto:contact@actoos.com" className="text-[#D4AF37] hover:underline">contact@actoos.com</a><br />
              Directeur de la publication : L'équipe Actoos
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">2. Hébergement</h2>
            <p className="text-slate-600 leading-relaxed">
              Ce site est hébergé par :<br /><br />
              <strong>Vercel Inc.</strong><br />
              340 S Lemon Ave #4133<br />
              Walnut, CA 91789, USA<br />
              Site web : <a href="https://vercel.com" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">3. Propriété Intellectuelle</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              L&apos;ensemble du contenu de ce site (textes, images, logos, graphismes, vidéos, marques) 
              est la propriété exclusive d&apos;ACTOOS Group ou de ses partenaires et est protégé par les 
              lois relatives à la propriété intellectuelle.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Toute reproduction, représentation, modification, publication ou adaptation de tout ou 
              partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite 
              sans autorisation écrite préalable d&apos;ACTOOS Group.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">4. Marques Déposées</h2>
            <p className="text-slate-600 leading-relaxed">
              Les marques suivantes sont des marques déposées d&apos;ACTOOS Group :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-4">
              <li>ACTOOS®</li>
              <li>&quot;Empowering Action. Delivering Progress.&quot;®</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">5. Conditions d&apos;Utilisation</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              L&apos;utilisation de ce site implique l&apos;acceptation pleine et entière des conditions 
              générales d&apos;utilisation décrites ci-après. Ces conditions d&apos;utilisation sont 
              susceptibles d&apos;être modifiées ou complétées à tout moment.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Les utilisateurs du site sont invités à les consulter régulièrement.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">6. Limitation de Responsabilité</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              ACTOOS Group s&apos;efforce de fournir sur ce site des informations aussi précises que 
              possible. Toutefois, la société ne pourra être tenue responsable des omissions, 
              inexactitudes ou carences dans la mise à jour, qu&apos;elles soient de son fait ou 
              du fait des tiers partenaires.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Toutes les informations indiquées sur le site sont données à titre indicatif et 
              sont susceptibles d&apos;évoluer.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">7. Liens Hypertextes</h2>
            <p className="text-slate-600 leading-relaxed">
              Le site peut contenir des liens vers d&apos;autres sites internet ou ressources. 
              ACTOOS Group n&apos;exerce aucun contrôle sur ces sites et ressources externes et 
              décline toute responsabilité quant à leur contenu et leur utilisation.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">8. Droit Applicable</h2>
            <p className="text-slate-600 leading-relaxed">
              Le présent site et les présentes mentions légales sont soumis au droit européen. 
              En cas de litige, les tribunaux compétents seront ceux du siège social d&apos;ACTOOS Group.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">9. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question concernant ces mentions légales :<br /><br />
              <strong>ACTOOS Group</strong><br />
              Email : <a href="mailto:contact@actoos.com" className="text-[#D4AF37] hover:underline">contact@actoos.com</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-8 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          <p>© Actoos Group. Tous droits réservés.</p>
          <div className="flex space-x-8">
            <a href="/privacy" className="hover:text-black transition-colors">Confidentialité</a>
            <span className="text-slate-600">Mentions légales</span>
          </div>
        </div>
      </footer>
    </div>
  );
}