import { Store, Bike, Shield, ChefHat, Truck, ShieldAlert } from 'lucide-react';

export function Footer({ onPartnerClick, onDriverClick, onPrivacyClick, onTermsClick, onLegalClick, onKDSClick, onDriverAppClick, onAdminClick }) {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 px-4 mb-16" data-testid="footer">
      <div className="text-center mb-4">
        <p className="text-xs text-gray-500">Rejoignez la communauté ACTOOS</p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onPartnerClick}
          className="flex-1 bg-white rounded-2xl p-4 flex items-center gap-3 active:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
          data-testid="partner-cta"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">Devenir Partenaire</p>
            <p className="text-xs text-gray-500">Inscrivez votre restaurant</p>
          </div>
        </button>

        <button
          onClick={onDriverClick}
          className="flex-1 bg-white rounded-2xl p-4 flex items-center gap-3 active:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
          data-testid="driver-cta"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bike className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">Devenir Livreur</p>
            <p className="text-xs text-gray-500">Livrez avec nous</p>
          </div>
        </button>
      </div>

      {/* Demo Access Buttons */}
      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-400 text-center mb-2">Accès Démo (Dev)</p>
        
        <div className="grid grid-cols-3 gap-2">
          {/* KDS Access */}
          <button
            onClick={onKDSClick}
            className="bg-gray-900 rounded-xl p-3 flex flex-col items-center gap-1 active:bg-gray-800 transition-colors"
            data-testid="kds-access-btn"
          >
            <ChefHat className="w-5 h-5 text-primary" />
            <span className="text-white text-xs font-medium">KDS</span>
          </button>

          {/* Driver App Access */}
          <button
            onClick={onDriverAppClick}
            className="bg-green-600 rounded-xl p-3 flex flex-col items-center gap-1 active:bg-green-700 transition-colors"
            data-testid="driver-app-btn"
          >
            <Truck className="w-5 h-5 text-white" />
            <span className="text-white text-xs font-medium">Livreur</span>
          </button>

          {/* Admin Access */}
          <button
            onClick={onAdminClick}
            className="bg-red-600 rounded-xl p-3 flex flex-col items-center gap-1 active:bg-red-700 transition-colors"
            data-testid="admin-btn"
          >
            <ShieldAlert className="w-5 h-5 text-white" />
            <span className="text-white text-xs font-medium">Admin</span>
          </button>
        </div>
      </div>

      {/* Legal Links */}
      <div className="flex items-center justify-center gap-4 mt-6 text-xs">
        <button
          onClick={onPrivacyClick}
          className="flex items-center gap-1 text-gray-500 active:text-primary transition-colors"
          data-testid="privacy-settings-btn"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Confidentialité</span>
        </button>
        <span className="text-gray-300">|</span>
        <button 
          onClick={onTermsClick}
          className="text-gray-500 active:text-primary transition-colors"
          data-testid="terms-btn"
        >
          CGU
        </button>
        <span className="text-gray-300">|</span>
        <button 
          onClick={onLegalClick}
          className="text-gray-500 active:text-primary transition-colors"
          data-testid="legal-btn"
        >
          Mentions légales
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-400 mt-4">
        © 2024 ACTOOS ONE. Tous droits réservés.
      </p>
    </footer>
  );
}
