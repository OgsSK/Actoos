'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, Building2, ArrowRight, 
  Layers, CreditCard, Menu, X, ChevronDown
} from 'lucide-react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPortalDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const portals = [
    { name: 'Actoos Pro', href: 'https://pro.actoos.com', color: '#10B981', desc: 'B2B Europe' },
    { name: 'Actoos One', href: 'https://one.actoos.com', color: '#D4AF37', desc: 'Super-App Afrique' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100/50">
      
      {/* NAVIGATION PREMIUM */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* LOGO ACTOOS GROUP */}
            <img 
              src="/logo-icon.png" 
              alt="Actoos" 
              className="h-14 w-14 object-contain"
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
            <a href="#products" className="hover:text-black transition-colors">Software Suite</a>
            <a href="#vision" className="hover:text-black transition-colors">Philosophy</a>
            <a href="#contact" className="hover:text-black transition-colors">Contact</a>
          </div>

          {/* Global Portal Dropdown */}
          <div className="hidden md:block relative" ref={dropdownRef}>
            <button 
              onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
              className="bg-slate-950 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] transition-all shadow-2xl hover:shadow-yellow-500/20 flex items-center space-x-2"
            >
              <span>Global Portal</span>
              <ChevronDown size={14} className={`transition-transform ${portalDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {portalDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                {portals.map((portal) => (
                  <a
                    key={portal.name}
                    href={portal.href}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: portal.color }}
                    />
                    <div>
                      <p className="font-bold text-sm text-slate-900 group-hover:text-slate-950">{portal.name}</p>
                      <p className="text-[10px] text-slate-400">{portal.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-4">
            <a href="#products" className="block text-sm font-bold text-slate-600 hover:text-black">Software Suite</a>
            <a href="#vision" className="block text-sm font-bold text-slate-600 hover:text-black">Philosophy</a>
            <a href="#contact" className="block text-sm font-bold text-slate-600 hover:text-black">Contact</a>
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accès Portails</p>
              {portals.map((portal) => (
                <a 
                  key={portal.name}
                  href={portal.href}
                  className="flex items-center space-x-3 py-2"
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: portal.color }}
                  />
                  <span className="font-bold text-sm text-slate-700">{portal.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION - SLATE & GOLD */}
      <header className="pt-32 md:pt-48 pb-20 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center space-x-2 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100 mb-8 md:mb-10">
          <Layers size={14} className="text-[#D4AF37]" />
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Multi-Continental Software Factory
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.9] mb-8 md:mb-12 text-slate-950">
          Empowering Action.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5D78E] to-[#D4AF37] italic">
            Delivering Progress.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl lg:text-2xl text-slate-400 font-medium max-w-3xl leading-relaxed px-4">
          Nous bâtissons les infrastructures logicielles qui redéfinissent l&apos;efficacité des entreprises en Europe et la souveraineté financière des citoyens en Afrique.
        </p>

        <div className="mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
          <a 
            href="#products"
            className="bg-slate-950 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl text-center"
          >
            Explorer nos solutions
          </a>
          <a 
            href="#contact"
            className="bg-white text-slate-950 border-2 border-slate-100 px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all text-center"
          >
            Contacter le groupe
          </a>
        </div>
      </header>

      {/* SECTION PRODUITS - FOND ARDOISE SOMBRE */}
      <section id="products" className="py-16 md:py-32 px-4">
        <div className="max-w-7xl mx-auto bg-[#0F172A] rounded-[32px] md:rounded-[64px] p-6 md:p-12 lg:p-20 relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)]">
          <div className="relative z-10 mb-12 md:mb-20 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white">
              Our Software Suite<span className="text-[#D4AF37]">.</span>
            </h2>
            <p className="text-slate-400 mt-4 md:mt-6 text-base md:text-xl max-w-2xl">
              Un écosystème de produits étanches, interconnectés par une technologie de pointe.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
            
            {/* ACTOOS ONE */}
            <div className="lg:col-span-2 group bg-white/5 backdrop-blur-md p-8 md:p-12 rounded-[32px] md:rounded-[48px] border border-white/10 hover:border-[#D4AF37]/50 transition-all duration-500 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#D4AF37] to-[#F5D78E] rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-lg shadow-yellow-500/20">
                  <Smartphone size={24} className="text-slate-900 md:w-7 md:h-7" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white mb-3 md:mb-4">
                  Actoos One
                </h3>
                <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-4 md:mb-6">
                  La Super-App d&apos;Afrique de l&apos;Ouest. Une interface unique pour la livraison, la santé, le commerce et la finance souveraine via Actoos Pay.
                </p>
                <div className="inline-block px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[#D4AF37] text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-8 md:mb-12">
                  &quot;Tout. Tout de suite. Partout.&quot;
                </div>
              </div>
              <a 
                href="https://one.actoos.com" 
                className="flex items-center space-x-4 text-white font-black text-xs uppercase tracking-widest group-hover:text-[#D4AF37] transition-colors cursor-pointer"
              >
                <span>Accéder au portail One</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* ACTOOS PRO */}
            <div className="group bg-white/5 backdrop-blur-md p-8 md:p-12 rounded-[32px] md:rounded-[48px] border border-white/10 hover:border-[#10B981]/50 transition-all duration-500 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#10B981] rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-lg shadow-emerald-500/20">
                  <Building2 size={24} className="text-white md:w-7 md:h-7" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white mb-3 md:mb-4">
                  Actoos Pro
                </h3>
                <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-4 md:mb-6">
                  SaaS B2B de gestion d&apos;interventions terrain en Europe. Pilotage de flotte et optimisation en temps réel.
                </p>
              </div>
              <a 
                href="https://pro.actoos.com" 
                className="flex items-center space-x-4 text-white font-black text-xs uppercase tracking-widest group-hover:text-[#10B981] transition-colors cursor-pointer mt-8 md:mt-12"
              >
                <span>Espace B2B</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* ACTOOS PAY - Infrastructure financière */}
            <div className="lg:col-span-3 group bg-gradient-to-r from-white/5 to-white/[0.02] backdrop-blur-md p-8 md:p-12 rounded-[32px] md:rounded-[48px] border border-white/10 hover:border-[#D4AF37]/30 transition-all duration-500">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center space-x-4 md:space-x-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
                    <CreditCard size={24} className="text-[#D4AF37] md:w-7 md:h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black italic tracking-tighter text-white">
                      Actoos Pay
                    </h3>
                    <p className="text-slate-500 text-sm md:text-base">
                      Infrastructure financière souveraine intégrée
                    </p>
                  </div>
                </div>
                <div className="inline-block px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                  Intégré dans Actoos One
                </div>
              </div>
            </div>

          </div>

          {/* DÉCORATION ARRIÈRE-PLAN */}
          <div className="absolute top-[-100px] right-[-100px] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#D4AF37]/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-50px] left-[-50px] w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-[#10B981]/5 blur-[100px] rounded-full" />
        </div>
      </section>

      {/* SECTION VISION / PHILOSOPHY */}
      <section id="vision" className="py-16 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
                Notre philosophie
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-slate-950 mb-6">
                Construire pour<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5D78E]">
                  l&apos;économie réelle
                </span>
              </h2>
              <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-8">
                Chez Actoos, nous croyons que la technologie doit servir l&apos;économie réelle. 
                Nos solutions sont conçues pour les entrepreneurs, les artisans, les PME et 
                les citoyens qui font tourner l&apos;économie au quotidien.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full mt-2 flex-shrink-0" />
                  <p className="text-slate-600 text-sm md:text-base">
                    <strong className="text-slate-900">Souveraineté</strong> — Des infrastructures conçues 
                    pour l&apos;indépendance technologique
                  </p>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                  <p className="text-slate-600 text-sm md:text-base">
                    <strong className="text-slate-900">Efficacité</strong> — Des outils qui simplifient 
                    le quotidien des professionnels
                  </p>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-slate-600 text-sm md:text-base">
                    <strong className="text-slate-900">Accessibilité</strong> — La technologie de pointe 
                    accessible à tous
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-50 rounded-[32px] md:rounded-[48px] p-8 md:p-12 relative overflow-hidden">
                <img 
                  src="/logo-actoos-slogan.png" 
                  alt="Actoos - Empowering Action. Delivering Progress."
                  className="w-full max-w-sm mx-auto"
                />
              </div>
              {/* Stats */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-100">
                <p className="text-2xl md:text-3xl font-black text-slate-950">3</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Continents</p>
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-100">
                <p className="text-2xl md:text-3xl font-black text-[#D4AF37]">2026</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fondation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION CONTACT */}
      <section id="contact" className="py-16 md:py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
            Contact
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-950 mb-6">
            Parlons de votre projet
          </h2>
          <p className="text-slate-500 text-base md:text-lg mb-10 max-w-2xl mx-auto">
            Que vous soyez une entreprise européenne cherchant à optimiser vos opérations 
            ou un acteur africain souhaitant intégrer notre écosystème.
          </p>
          <a 
            href="mailto:contact@actoos.com"
            className="inline-flex items-center space-x-3 bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#D4AF37] transition-all shadow-2xl"
          >
            <span>contact@actoos.com</span>
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* FOOTER PREMIUM */}
      <footer className="bg-white py-16 md:py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16">
          <div className="sm:col-span-2 space-y-6 md:space-y-8">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo-icon.png" 
                alt="Actoos" 
                className="h-14 w-14 object-contain"
              />
              <span className="font-black text-xl tracking-tighter uppercase">
                ACTOOS GROUP<span className="text-[#D4AF37]">.</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
              Concepteur d&apos;écosystèmes numériques souverains. Nous développons les outils 
              qui propulsent l&apos;économie réelle vers le futur.
            </p>
          </div>
          <div>
            <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-950 mb-6 md:mb-8">
              Navigation
            </h5>
            <ul className="space-y-3 md:space-y-4 text-sm font-bold text-slate-500">
              <li>
                <a href="https://one.actoos.com" className="hover:text-[#D4AF37] transition-colors">
                  Actoos One
                </a>
              </li>
              <li>
                <a href="https://pro.actoos.com" className="hover:text-[#10B981] transition-colors">
                  Actoos Pro
                </a>
              </li>
              <li>
                <a href="#vision" className="hover:text-black transition-colors">
                  Philosophy
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-950 mb-6 md:mb-8">
              Hubs
            </h5>
            <ul className="space-y-3 md:space-y-4 text-sm font-bold text-slate-400">
              <li>Bruxelles, Belgique</li>
              <li>Paris, France</li>
              <li>Bamako, Mali</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 md:mt-20 pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
          <p>© 2026 Actoos Group. All rights reserved.</p>
          <div className="flex space-x-8">
            <a href="/privacy" className="hover:text-black cursor-pointer transition-colors">Privacy</a>
            <a href="/legal" className="hover:text-black cursor-pointer transition-colors">Legal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
