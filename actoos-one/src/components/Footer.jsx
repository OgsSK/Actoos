import { Store, Bike } from 'lucide-react';

export function Footer({ onPartnerClick, onDriverClick }) {
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

      <p className="text-center text-[10px] text-gray-400 mt-6">
        © 2024 ACTOOS ONE. Tous droits réservés.
      </p>
    </footer>
  );
}
