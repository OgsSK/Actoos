import { Search, MapPin, ChevronDown, Navigation, Heart, User, ShoppingBag, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Header({ 
  address, 
  onAddressClick, 
  onSearchClick, 
  onProfileClick, 
  onFavoritesClick,
  onCartClick,
  onBasketsClick
}) {
  const { getTotalItemCount, getAllCarts } = useCart();
  const { isAuthenticated, user, profile } = useAuth();
  const totalCount = getTotalItemCount();
  const allCarts = getAllCarts();
  const basketCount = allCarts.length;
  
  // Ne jamais afficher "null" - utiliser une chaîne vide par défaut
  const displayAddress = address && address !== 'null' ? address : '';
  const showAddPrompt = !displayAddress;

  // Décider quelle action prendre au clic sur panier
  const handleCartClick = () => {
    if (basketCount > 1 && onBasketsClick) {
      // Plusieurs paniers → écran Baskets (style Deliveroo)
      onBasketsClick();
    } else {
      // Un seul panier ou aucun → CartSheet classique
      onCartClick();
    }
  };

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
                onClick={handleCartClick}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors relative"
                title={basketCount > 1 ? `${basketCount} paniers` : 'Panier'}
              >
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF5A00] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalCount > 9 ? '9+' : totalCount}
                  </span>
                )}
                {/* Indicateur multi-paniers */}
                {basketCount > 1 && (
                  <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {basketCount}
                  </span>
                )}
              </button>
              <button
                onClick={onProfileClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  isAuthenticated 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                    : 'bg-[#FF5A00] hover:bg-[#E55100] text-white'
                }`}
                data-testid="desktop-profile-btn"
              >
                {isAuthenticated ? (
                  <>
                    <div className="w-7 h-7 bg-[#FF5A00] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {(profile?.name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium max-w-[100px] truncate">
                      {profile?.name || user?.email?.split('@')[0] || 'Profil'}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Connexion</span>
                  </>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Header - Redesigned to match desktop */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100" data-testid="header">
        {/* Top Row: Logo + Icons */}
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <span className="text-xl font-black text-[#FF5A00]">ACTOOS</span>
          </a>
          
          {/* Icons Row */}
          <div className="flex items-center gap-1">
            <button
              onClick={onFavoritesClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="mobile-favorites-btn"
            >
              <Heart className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleCartClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
              data-testid="mobile-cart-btn"
            >
              <ShoppingBag className="w-5 h-5 text-gray-600" />
              {totalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FF5A00] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
              )}
              {/* Indicateur multi-paniers */}
              {basketCount > 1 && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-gray-800 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white">
                  {basketCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Address Selector Row */}
        <button
          onClick={onAddressClick}
          className="w-full px-4 py-2 flex items-center gap-2 active:bg-gray-50 transition-colors border-t border-gray-50"
          data-testid="address-selector"
        >
          <MapPin className="w-4 h-4 text-[#FF5A00] flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate flex-1 text-left">
            {displayAddress || 'Ajouter une adresse'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        {/* Search Bar */}
        <div className="px-4 pb-3 pt-2">
          <button
            onClick={onSearchClick}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 active:bg-gray-200 transition-colors"
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
