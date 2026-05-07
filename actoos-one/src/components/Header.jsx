import { Search, MapPin, ChevronDown, Navigation } from 'lucide-react';

export function Header({ address, onAddressClick, onSearchClick }) {
  // Determine what to display
  const displayAddress = address || null;
  const showAddPrompt = !displayAddress;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100" data-testid="header">
      {/* Address Selector - Directly at top, no logo/slogan */}
      <button
        onClick={onAddressClick}
        className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
        data-testid="address-selector"
      >
        {showAddPrompt ? (
          <>
            <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation className="w-5 h-5 text-[#FF5A00]" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-base text-[#FF5A00] font-semibold block">
                Ajouter une adresse
              </span>
              <span className="text-xs text-gray-400">Pour voir les restaurants près de vous</span>
            </div>
            <ChevronDown className="w-5 h-5 text-[#FF5A00] flex-shrink-0" />
          </>
        ) : (
          <>
            <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#FF5A00]" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <span className="text-xs text-gray-400 block">Livrer à</span>
              <span className="text-sm text-gray-900 font-semibold truncate block">
                {displayAddress}
              </span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </>
        )}
      </button>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <button
          onClick={onSearchClick}
          className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-3 active:bg-gray-200 transition-colors"
          data-testid="search-bar"
        >
          <Search className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 text-sm">Rechercher un restaurant...</span>
        </button>
      </div>
    </header>
  );
}
