'use client';

import { useState } from 'react';
import { 
  Code, Smartphone, Globe, ArrowRight, Layers, Menu, X 
} from 'lucide-react';
import ProjectChatBot from './components/ProjectChatBot';
import FadeInSection from './components/FadeInSection';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    if (!name || !email) return;

    try {
      await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, proposal: {}, conversation: [] }),
      });
      alert('Message envoyé !');
      form.reset();
    } catch (error) {
      alert('Erreur lors de l\'envoi.');
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-amber-50">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo-icon.png" 
              alt="Actoos" 
              className="h-16 w-16 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">
                ACTOOS<span className="text-[#D4AF37]">.</span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 hidden sm:block">
                Technology Group
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-10 text-[11px] font-black uppercase tracking-widest text-slate-400">
            <a href="/produits" className="hover:text-black transition-colors">Produits</a>
            <a href="/expertise" className="hover:text-black transition-colors">Expertise</a>
            <a href="/a-propos" className="hover:text-black transition-colors">À propos</a>
            <a href="/philosophie" className="hover:text-black transition-colors">Philosophie</a>
            <a href="/contact" className="hover:text-black transition-colors">Contact</a>
          </div>

          <div className="hidden md:block">
            <a
              href="/produits"
              className="bg-slate-950 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#10B981] transition-all shadow-2xl hover:shadow-emerald-500/20 flex items-center space-x-2"
            >
              <span>Nos solutions</span>
              <ArrowRight size={14} />
            </a>
          </div>

          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-4">
            <a href="/produits" className="hover:text-black transition-colors">Produits</a>
            <a href="/expertise" className="block text-sm font-bold text-slate-600 hover:text-black">Expertise</a>
            <a href="/a-propos" className="block text-sm font-bold text-slate-600 hover:text-black">À propos</a>
            <a href="/philosophie" className="block text-sm font-bold text-slate-600 hover:text-black">Philosophie</a>
            <a href="/contact" className="block text-sm font-bold text-slate-600 hover:text-black">Contact</a>
            <div className="pt-2 border-t border-slate-100">
              <a 
                href="/produits"
                className="flex items-center space-x-3 py-2 text-sm font-bold text-[#10B981]"
              >
                <span>Nos solutions</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <FadeInSection>
        <header className="pt-32 md:pt-48 pb-20 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center space-x-2 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100 mb-8 md:mb-10">
            <Layers size={14} className="text-[#D4AF37]" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Créateur de solutions logicielles
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.9] mb-8 md:mb-12 text-slate-950">
            Nous donnons vie<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5D78E] to-[#D4AF37] italic">
              à vos idées.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-slate-400 font-medium max-w-3xl leading-relaxed px-4">
            Actoos conçoit et développe des logiciels sur mesure – applications mobiles, 
            tableaux de bord, plateformes de gestion… Nous transformons votre vision 
            en un produit numérique puissant, prêt à être déployé.
          </p>

          <div className="mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
            <a 
              href="/expertise"
              className="bg-slate-950 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl text-center"
            >
              Notre expertise
            </a>
            <a 
              href="/contact"
              className="bg-white text-slate-950 border-2 border-slate-100 px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all text-center"
            >
              Parlez-nous de votre projet
            </a>
          </div>
        </header>
      </FadeInSection>

      {/* CHATBOT */}
      <FadeInSection>
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-950 mb-4">
              Votre logiciel sur mesure commence ici.
            </h2>
            <p className="text-slate-500 text-lg">
              Décrivez votre projet, notre IA vous répond avec une proposition concrète.
            </p>
          </div>
          <ProjectChatBot />
        </section>
      </FadeInSection>

      {/* SECTION EXPERTISE */}
      <FadeInSection>
        <section id="expertise" className="py-16 md:py-32 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
                Ce que nous faisons
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-950 mb-6">
                Des solutions logicielles<br/>conçues pour durer.
              </h2>
              <p className="text-slate-500 text-base md:text-xl max-w-3xl mx-auto leading-relaxed">
                Nous maîtrisons tout le cycle de vie d'un logiciel : conception, développement, 
                maintenance. De l'application mobile grand public à la plateforme métier complexe, 
                nous créons des outils fiables, évolutifs et sécurisés.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-100 hover:border-[#D4AF37]/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#F5D78E] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20">
                  <Smartphone size={24} className="text-slate-900" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-slate-950 mb-3">
                  Applications mobiles
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Des apps iOS et Android performantes, avec ou sans mode hors-ligne, 
                  pour vos clients, vos équipes terrain ou vos partenaires.
                </p>
              </div>

              <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-100 hover:border-[#D4AF37]/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Globe size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-slate-950 mb-3">
                  Plateformes web
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Dashboards, back-offices, portails clients… Des interfaces complètes 
                  et intuitives pour piloter votre activité en temps réel.
                </p>
              </div>

              <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-100 hover:border-[#D4AF37]/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                  <Code size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-slate-950 mb-3">
                  Logiciels sur mesure
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Vous avez un besoin unique ? Nous créons un logiciel entièrement 
                  personnalisé, adapté à vos processus et à votre secteur d'activité.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-slate-400 mb-4">
                Un exemple concret ? Découvrez notre logiciel de gestion d'interventions terrain, déjà utilisé par des entreprises.
              </p>
              <a
                href="/produits"
                className="inline-flex items-center space-x-2 text-[#10B981] font-bold text-sm hover:underline"
              >
                <span>Découvrir</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* SECTION À PROPOS / PHILOSOPHIE */}
      <FadeInSection>
        <section id="about" className="py-16 md:py-32 px-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
                  Notre philosophie
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-slate-950 mb-6">
                  Le logiciel doit<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5D78E]">
                    servir votre métier,
                  </span>
                  <br/>pas l'inverse.
                </h2>
                <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-8">
                  Trop de solutions vous imposent de changer votre façon de travailler. 
                  Nous faisons le contraire : nous comprenons votre activité et concevons 
                  un outil qui s'y adapte parfaitement. Simple, efficace, et conçu pour durer.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-[#D4AF37] rounded-full mt-2 flex-shrink-0" />
                    <p className="text-slate-600 text-sm md:text-base">
                      <strong className="text-slate-900">Sur mesure</strong> — Chaque solution est unique, développée pour vos besoins spécifiques.
                    </p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                    <p className="text-slate-600 text-sm md:text-base">
                      <strong className="text-slate-900">Accompagnement</strong> — De la conception à la maintenance, nous restons à vos côtés.
                    </p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-slate-600 text-sm md:text-base">
                      <strong className="text-slate-900">Évolutivité</strong> — Votre logiciel grandit avec votre entreprise, sans refonte.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-[32px] md:rounded-[48px] p-8 md:p-12 shadow-2xl border border-slate-100 relative overflow-hidden">
                  <img 
                    src="/logo-actoos-slogan.png" 
                    alt="Actoos - Empowering Action. Delivering Progress."
                    className="w-full max-w-sm mx-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

            {/* SECTION CONTACT */}
      <FadeInSection>
        <section id="contact" className="py-16 md:py-24 px-6 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
              Contact
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-950 mb-6">
              Prêt à démarrer votre projet ?
            </h2>
            <p className="text-slate-500 text-base md:text-lg mb-10 max-w-2xl mx-auto">
              Discutons de vos besoins et voyons comment Actoos peut vous aider à concrétiser votre vision.
            </p>
            <a 
              href="/contact"
              className="inline-flex items-center space-x-3 bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#D4AF37] transition-all shadow-2xl"
            >
              <span>Nous contacter</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </FadeInSection>

      {/* FOOTER */}
      <FadeInSection>
        <footer className="bg-white py-16 md:py-20 px-6 border-t border-slate-100">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16">
            <div className="sm:col-span-2 space-y-6 md:space-y-8">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo-icon.png" 
                  alt="Actoos" 
                  className="h-12 w-12 object-contain"
                />
                <span className="font-black text-xl tracking-tighter uppercase">
                  ACTOOS GROUP<span className="text-[#D4AF37]">.</span>
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                Créateur de logiciels sur mesure pour les entreprises et les entrepreneurs.
                Nous transformons vos idées en solutions numériques performantes.
              </p>
            </div>
            <div>
              <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-950 mb-6 md:mb-8">
                Navigation
              </h5>
              <ul className="space-y-3 md:space-y-4 text-sm font-bold text-slate-500">
                <li>
                  <a href="/expertise" className="hover:text-black transition-colors">
                    Expertise
                  </a>
                </li>
                <li>
                  <a href="/philosophie" className="hover:text-black transition-colors">
                    Philosophie
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-black transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-950 mb-6 md:mb-8">
                Légal
              </h5>
              <ul className="space-y-3 md:space-y-4 text-sm font-bold text-slate-400">
                <li>
                  <a href="/privacy" className="hover:text-black transition-colors">
                    Confidentialité
                  </a>
                </li>
                <li>
                  <a href="/legal" className="hover:text-black transition-colors">
                    Mentions légales
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-16 md:mt-20 pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
            <p>© 2026 Actoos Group. Tous droits réservés.</p>
          </div>
        </footer>
      </FadeInSection>
    </div>
  );
}