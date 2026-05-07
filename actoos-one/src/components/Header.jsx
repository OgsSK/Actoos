import { Search, MapPin, ChevronDown, Navigation } from 'lucide-react';
import { systemConfig } from '../data/mockData';

export function Header({ address, onAddressClick, onSearchClick, hasLocation }) {
  // Determine what to display
  const displayAddress = address || null;
  const showAddPrompt = !displayAddress;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200" data-testid="header">
      {/* Logo & Slogan */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary" data-testid="app-logo">
              {systemConfig.appName}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5" data-testid="app-slogan">
              {systemConfig.slogan}
            </p>
          </div>
        </div>
      </div>

      {/* Address Selector */}
      <button
        onClick={onAddressClick}
        className="w-full px-4 py-2 flex items-center gap-2 active:bg-gray-100 transition-colors"
        data-testid="address-selector"
      >
        {showAddPrompt ? (
          <>
            <div className="w-8 h-8 bg-[#FF5A00]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation className="w-4 h-4 text-[#FF5A00]" />
            </div>
            <span className="text-sm text-[#FF5A00] font-medium flex-1 text-left">
              Ajouter une adresse de livraison
            </span>
            <ChevronDown className="w-4 h-4 text-[#FF5A00] flex-shrink-0" />
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm text-gray-800 truncate flex-1 text-left font-medium">
              {displayAddress}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </>
        )}
      </button>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <button
          onClick={onSearchClick}
          className="w-full bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 active:bg-gray-200 transition-colors"
          data-testid="search-bar"
        >
          <Search className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 text-sm">Rechercher un restaurant...</span>
        </button>
      </div>
    </header>
  );
}
