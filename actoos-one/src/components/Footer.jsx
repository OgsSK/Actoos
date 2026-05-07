import { Store, Bike, ChevronRight } from 'lucide-react';

export function Footer({ onPartnerClick, onDriverClick, onPrivacyClick, onTermsClick, onLegalClick }) {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 px-4 mb-16" data-testid="footer">
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
        <button
          onClick={onPrivacyClick}
          className="text-gray-500 active:text-[#FF5A00] transition-colors"
          data-testid="privacy-settings-btn"
        >
          Confidentialité
        </button>
        <span className="text-gray-300">•</span>
        <button 
          onClick={onTermsClick}
          className="text-gray-500 active:text-[#FF5A00] transition-colors"
          data-testid="terms-btn"
        >
          CGU
        </button>
        <span className="text-gray-300">•</span>
        <button 
          onClick={onLegalClick}
          className="text-gray-500 active:text-[#FF5A00] transition-colors"
          data-testid="legal-btn"
        >
          Mentions légales
        </button>
      </div>

      {/* Copyright */}
      <div className="text-center mt-6">
        <p className="text-[11px] text-gray-400">
          © ACTOOS ONE • Bamako, Mali
        </p>
      </div>
    </footer>
  );
}
