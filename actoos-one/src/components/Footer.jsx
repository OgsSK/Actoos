import { Store, Bike } from 'lucide-react';

export function Footer({ onPartnerClick, onDriverClick }) {
  return (
    <footer className="bg-gray-900/50 border-t border-gray-800 py-6 px-4 mb-16" data-testid="footer">
      <div className="text-center mb-4">
        <p className="text-xs text-gray-500">Rejoignez la communauté ACTOOS</p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onPartnerClick}
          className="flex-1 bg-gray-800 rounded-2xl p-4 flex items-center gap-3 active:bg-gray-700 transition-colors"
          data-testid="partner-cta"
        >
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Devenir Partenaire</p>
            <p className="text-xs text-gray-400">Inscrivez votre restaurant</p>
          </div>
        </button>

        <button
          onClick={onDriverClick}
          className="flex-1 bg-gray-800 rounded-2xl p-4 flex items-center gap-3 active:bg-gray-700 transition-colors"
          data-testid="driver-cta"
        >
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bike className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Devenir Livreur</p>
            <p className="text-xs text-gray-400">Livrez avec nous</p>
          </div>
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-600 mt-6">
        © 2024 ACTOOS ONE. Tous droits réservés.
      </p>
    </footer>
  );
}
