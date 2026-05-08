import { Search, MapPin, ChevronDown, Navigation, Heart, User, ShoppingBag } from 'lucide-react';

export function Header({ address, onAddressClick, onSearchClick, onProfileClick, onFavoritesClick }) {
  // Ne jamais afficher "null" - utiliser une chaîne vide par défaut
  const displayAddress = address && address !== 'null' ? address : '';
  const showAddPrompt = !displayAddress;

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-40 bg-white border-b border-gray-200" data-testid="desktop-header">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-4">
          <div className="flex items-center gap-6">
            {/* Logo - Just text, clean */}
            <a href="/" className="flex-shrink-0">
              <span className="text-2xl font-black text-[#FF5A00]">ACTOOS</span>
            </a>

            {/* Address Selector */}
            <button
              onClick={onAddressClick}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <MapPin className="w-4 h-4 text-[#FF5A00]" />
              <span className="text-sm font-medium text-gray-700 max-w-[200px] truncate">
                {displayAddress || 'Ajouter une adresse'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <button
                onClick={onSearchClick}
                className="w-full bg-gray-100 hover:bg-gray-200 rounded-full px-5 py-3 flex items-center gap-3 transition-colors"
              >
                <Search className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 text-sm">Rechercher un restaurant, une cuisine...</span>
              </button>
            </div>

            {/* Desktop Nav */}
            <nav className="flex items-center gap-2">
              <button
                onClick={onFavoritesClick}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                title="Favoris"
              >
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
              <button
                className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                title="Panier"
              >
                <ShoppingBag className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF5A00] hover:bg-[#E55100] text-white rounded-full transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Connexion</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100" data-testid="header">
        {/* Address Selector */}
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
    </>
  );
}
