import { Store, Bike, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';

export function Footer({ onPartnerClick, onDriverClick, onPrivacyClick, onTermsClick, onLegalClick }) {
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
            <p className="text-sm text-gray-500">Restaurant, Pharmacie, Commerce</p>
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
          <p className="text-[11px] text-gray-400">© ACTOOS ONE • Bamako, Mali</p>
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
                Livraison rapide, paiement facile. Tout ce dont vous avez besoin, livré chez vous.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-9 h-9 bg-gray-200 hover:bg-[#FF5A00] hover:text-white rounded-full flex items-center justify-center text-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-gray-200 hover:bg-[#FF5A00] hover:text-white rounded-full flex items-center justify-center text-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-gray-200 hover:bg-[#FF5A00] hover:text-white rounded-full flex items-center justify-center text-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </div>
            </div>

            {/* Découvrir */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Découvrir</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors">Restaurants</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors">Pharmacies</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors">Promotions</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#FF5A00] transition-colors">ACTOOS Wallet</a></li>
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
                  <Phone className="w-4 h-4 text-[#FF5A00]" />
                  +223 70 00 00 00
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
            <p className="text-sm text-gray-400">© 2025 ACTOOS ONE. Tous droits réservés.</p>
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
