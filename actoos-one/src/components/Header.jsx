import { Search, MapPin, ChevronDown } from 'lucide-react';
import { systemConfig } from '../data/mockData';

export function Header({ address, onAddressClick, onSearchClick }) {
  return (
    <header className="sticky top-0 z-40 bg-dark/95 backdrop-blur-md border-b border-gray-800" data-testid="header">
      {/* Logo & Slogan */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary" data-testid="app-logo">
              {systemConfig.appName}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5" data-testid="app-slogan">
              {systemConfig.slogan}
            </p>
          </div>
        </div>
      </div>

      {/* Address Selector */}
      <button
        onClick={onAddressClick}
        className="w-full px-4 py-2 flex items-center gap-2 active:bg-gray-800/50 transition-colors"
        data-testid="address-selector"
      >
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm text-white truncate flex-1 text-left">
          {address || systemConfig.defaultAddress}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <button
          onClick={onSearchClick}
          className="w-full bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 active:bg-gray-700 transition-colors"
          data-testid="search-bar"
        >
          <Search className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 text-sm">Rechercher un restaurant...</span>
        </button>
      </div>
    </header>
  );
}
