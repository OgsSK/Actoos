'use client';

import { ArrowLeft, Smartphone, Globe, Code, CheckCircle2 } from 'lucide-react';

export default function ExpertisePage() {
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
            Notre expertise
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 mb-6">
            Des solutions logicielles<br/>conçues pour durer<span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Nous maîtrisons l'ensemble du cycle de vie d'un logiciel : de la conception à la maintenance, en passant par le développement et le déploiement.
          </p>
        </div>

        {/* Domaines d'expertise */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-50 rounded-[32px] p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#F5D78E] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Smartphone size={28} className="text-slate-900" />
            </div>
            <h3 className="text-xl font-black mb-3">Applications mobiles</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              iOS, Android ou cross-platform (React Native, Flutter). Des apps performantes, avec ou sans mode hors-ligne, pour vos clients et vos équipes.
            </p>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Globe size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black mb-3">Plateformes web</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Dashboards, back-offices, portails clients, sites vitrines… Des interfaces modernes, rapides et sécurisées.
            </p>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-[#10B981] to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <Code size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black mb-3">Logiciels sur mesure</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Vous avez un besoin unique ? Nous créons un logiciel entièrement personnalisé, adapté à vos processus métier.
            </p>
          </div>
        </div>

        {/* Notre processus */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950 mb-10 text-center">
            Notre processus de travail
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Découverte', desc: 'Nous analysons vos besoins, vos objectifs et vos contraintes.' },
              { step: '02', title: 'Conception', desc: 'Nous concevons l\'architecture et l\'interface de votre solution.' },
              { step: '03', title: 'Développement', desc: 'Nous développons votre logiciel en cycles itératifs et transparents.' },
              { step: '04', title: 'Déploiement', desc: 'Nous mettons en ligne votre solution et assurons le suivi.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 text-center hover:border-[#D4AF37]/30 transition-all">
                <div className="text-2xl font-black text-[#D4AF37] mb-2">{item.step}</div>
                <h4 className="font-bold mb-2">{item.title}</h4>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

                {/* Technologies */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950 mb-10">
            Technologies maîtrisées
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte',
              'React Native', 'Flutter', 'Kotlin', 'Swift',
              'Node.js', 'Python', 'Django', 'FastAPI',
              'Java', 'Spring Boot', 'C#', '.NET',
              'PHP', 'Laravel', 'Ruby', 'Go', 'Rust',
              'PostgreSQL', 'MongoDB', 'MySQL', 'Redis',
              'GraphQL', 'REST', 'WebSockets',
              'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
              'Firebase', 'Supabase', 'Vercel', 'Railway',
              'Tailwind CSS', 'TypeScript', 'Figma',
              'Jenkins', 'GitLab CI/CD', 'GitHub Actions'
            ].map(tech => (
              <span key={tech} className="px-4 py-2 bg-slate-50 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center">
          <a
            href="/contact"
            className="inline-flex items-center space-x-3 bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#D4AF37] transition-all shadow-2xl"
          >
            <span>Discutons de votre projet</span>
            <ArrowLeft size={18} className="rotate-180" />
          </a>
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