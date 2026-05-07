import { Store, Bike, Shield, ChevronRight, Sparkles } from 'lucide-react';

export function Footer({ onPartnerClick, onDriverClick, onPrivacyClick, onTermsClick, onLegalClick }) {
  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200 py-8 px-4 mb-16" data-testid="footer">
      {/* Professional CTA Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#FF5A00]" />
          <h3 className="text-lg font-bold text-gray-900">Rejoignez ACTOOS</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Développez votre activité et touchez plus de clients
        </p>
      </div>

      {/* Partner CTA - Premium Design */}
      <button
        onClick={onPartnerClick}
        className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 active:bg-gray-50 transition-all border border-gray-200 shadow-sm hover:shadow-md mb-3 group"
        data-testid="partner-cta"
      >
        <div className="w-14 h-14 bg-gradient-to-br from-[#FF5A00] to-orange-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-200">
          <Store className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-base font-bold text-gray-900">Devenir Partenaire</p>
          <p className="text-sm text-gray-500">Restaurant, Pharmacie, Commerce</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#FF5A00] font-medium">Inscription gratuite</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-400">Commission compétitive</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-active:translate-x-1 transition-transform" />
      </button>

      {/* Driver CTA */}
      <button
        onClick={onDriverClick}
        className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 active:bg-gray-50 transition-all border border-gray-200 shadow-sm hover:shadow-md group"
        data-testid="driver-cta"
      >
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
          <Bike className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-base font-bold text-gray-900">Devenir Livreur</p>
          <p className="text-sm text-gray-500">Moto, Vélo, Voiture</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-blue-500 font-medium">Horaires flexibles</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-400">Paiement hebdomadaire</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-active:translate-x-1 transition-transform" />
      </button>

      {/* Legal Links */}
      <div className="flex items-center justify-center gap-4 mt-8 text-xs">
        <button
          onClick={onPrivacyClick}
          className="flex items-center gap-1 text-gray-500 active:text-[#FF5A00] transition-colors"
          data-testid="privacy-settings-btn"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Confidentialité</span>
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
          © 2025 ACTOOS ONE • Bamako, Mali
        </p>
      </div>
    </footer>
  );
}
