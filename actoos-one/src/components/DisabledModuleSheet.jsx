import { BottomSheet } from './BottomSheet';
import { Bell, Clock } from 'lucide-react';

const moduleInfo = {
  health: {
    title: 'ACTOOS Health',
    description: 'Commandez vos médicaments et produits de santé. Ce module sera bientôt disponible.',
    icon: '💊',
  },
  wallet: {
    title: 'ACTOOS Wallet',
    description: 'Payez, transférez et gérez votre argent mobile. Ce module sera bientôt disponible.',
    icon: '💳',
  },
  black: {
    title: 'ACTOOS Black',
    description: 'Réservez un VTC premium pour vos déplacements. Ce module sera bientôt disponible.',
    icon: '🚗',
  },
  profil: {
    title: 'Mon Profil',
    description: 'Connectez-vous pour accéder à votre profil, historique de commandes et préférences.',
    icon: '👤',
  },
};

export function DisabledModuleSheet({ isOpen, onClose, moduleId, onNotifyMe }) {
  const info = moduleInfo[moduleId] || {
    title: 'Module',
    description: 'Ce module sera bientôt disponible.',
    icon: '🔒',
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={info.title}>
      <div className="text-center py-4">
        <div className="text-5xl mb-4">{info.icon}</div>
        <p className="text-gray-400 text-sm mb-6">{info.description}</p>
        
        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs mb-6">
          <Clock className="w-4 h-4" />
          <span>Bientôt disponible</span>
        </div>

        <button
          onClick={() => {
            onNotifyMe(moduleId);
            onClose();
          }}
          className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 active:bg-primary/90 transition-colors"
          data-testid="notify-me-btn"
        >
          <Bell className="w-5 h-5" />
          Me notifier au lancement
        </button>
      </div>
    </BottomSheet>
  );
}
