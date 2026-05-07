import { UtensilsCrossed, Heart, Wallet, Car, User } from 'lucide-react';

const iconMap = {
  UtensilsCrossed,
  Heart,
  Wallet,
  Car,
  User,
};

export function BottomNav({ items, activeTab, onTabChange, onDisabledTabClick }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 safe-area-bottom z-50"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = activeTab === item.id;
          const isDisabled = !item.enabled;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isDisabled) {
                  onDisabledTabClick(item);
                } else {
                  onTabChange(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive
                  ? 'text-primary'
                  : isDisabled
                  ? 'text-gray-300'
                  : 'text-gray-500 active:text-gray-700'
              }`}
              data-testid={`nav-${item.id}`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
