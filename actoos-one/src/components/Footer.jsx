import { Store, Bike, ChevronRight, Mail, MapPin } from 'lucide-react';

export function Footer({ onPartnerClick, onDriverClick, onPrivacyClick, onTermsClick, onLegalClick }) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-50 border-t border-gray-200" data-testid="footer">
      {/* Mobile Footer */}
      <div className="md:hidden py-8 px-4 mb-16">
        {/* Partner CTA */}
        <button
          onClick={onPartnerClick}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 active:bg-gray-50 transition-all border border-gray-200 shadow-sm mb-3 group"
          data-testid="partner-cta"
        >
          <div className="w-14 h-14 bg-[#FF5A00] rounded-2xl flex items-center justify-center flex-shrink-0">
            <Store className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-lg font-bold text-gray-900">Devenir Partenaire</p>
            <p className="text-sm text-gray-500">Restaurant, Commerce</p>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400 group-active:translate-x-1 transition-transform" />
        </button>

        {/* Driver CTA */}
        <button
          onClick={onDriverClick}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 active:bg-gray-50 transition-all border border-gray-200 shadow-sm group"
          data-testid="driver-cta"
        >
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Bike className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-lg font-bold text-gray-900">Devenir Livreur</p>
            <p className="text-sm text-gray-500">Moto, Vélo, Voiture</p>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400 group-active:translate-x-1 transition-transform" />
        </button>

        {/* Legal Links */}
        <div className="flex items-center justify-center gap-4 mt-8 text-xs">
          <button onClick={onPrivacyClick} className="text-gray-500 active:text-[#FF5A00] transition-colors">
            Confidentialité
          </button>
          <span className="text-gray-300">•</span>
          <button onClick={onTermsClick} className="text-gray-500 active:text-[#FF5A00] transition-colors">
            CGU
          </button>
          <span className="text-gray-300">•</span>
          <button onClick={onLegalClick} className="text-gray-500 active:text-[#FF5A00] transition-colors">
            Mentions légales
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-[11px] text-gray-400">© {currentYear} ACTOOS • Bamako, Mali</p>
        </div>
      </div>

      {/* Desktop Footer */}
      <div className="hidden md:block py-12 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="mb-4">
                <span className="text-2xl font-black text-[#FF5A00]">ACTOOS</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Tout. Tout de suite. Partout.
              </p>
            </div>

            {/* Découvrir */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Découvrir</h4>
              <ul className="space-y-3">
                <li><a href="/" className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors">Restaurants</a></li>
                <li><a href="/wallet" className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors">ACTOOS Wallet</a></li>
              </ul>
            </div>

            {/* Devenir */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Rejoignez-nous</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={onPartnerClick} className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors flex items-center gap-2">
                    <Store className="w-4 h-4" /> Devenir Partenaire
                  </button>
                </li>
                <li>
                  <button onClick={onDriverClick} className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors flex items-center gap-2">
                    <Bike className="w-4 h-4" /> Devenir Livreur
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-4 h-4 text-[#FF5A00]" />
                  contact@actoos.com
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 text-[#FF5A00]" />
                  Bamako, Mali
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© {currentYear} ACTOOS. Tous droits réservés.</p>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={onPrivacyClick} className="text-gray-500 hover:text-[#FF5A00] transition-colors">
                Confidentialité
              </button>
              <button onClick={onTermsClick} className="text-gray-500 hover:text-[#FF5A00] transition-colors">
                Conditions d'utilisation
              </button>
              <button onClick={onLegalClick} className="text-gray-500 hover:text-[#FF5A00] transition-colors">
                Mentions légales
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
