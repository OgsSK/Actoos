import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { RestaurantFeed } from './components/RestaurantFeed';
import { RestaurantScreen } from './components/RestaurantScreen';
import { CheckoutScreen } from './components/CheckoutScreen';
import { DriverOnboardingScreen } from './components/DriverOnboardingScreen';
import { PartnerOnboardingScreen } from './components/PartnerOnboardingScreen';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { OfflineBanner } from './components/OfflineBanner';
import { DisabledModuleSheet } from './components/DisabledModuleSheet';
import { BottomSheet } from './components/BottomSheet';
import { CookieConsentSheet } from './components/CookieConsentSheet';
import { PrivacySettingsSheet } from './components/PrivacySettingsSheet';
import { CartProvider } from './context/CartContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { restaurants, categories, navItems } from './data/mockData';
import { getRestaurantMenu } from './data/menuData';

// Screens enum
const SCREENS = {
  HOME: 'home',
  RESTAURANT: 'restaurant',
  CHECKOUT: 'checkout',
  DRIVER_ONBOARDING: 'driver_onboarding',
  PARTNER_ONBOARDING: 'partner_onboarding',
};

function AppContent() {
  const isOnline = useOnlineStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('cat-1');
  const [activeTab, setActiveTab] = useState('eats');
  const [address, setAddress] = useState('Bamako, Hamdallaye');
  
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState(SCREENS.HOME);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  
  // Bottom Sheet states
  const [disabledModuleSheet, setDisabledModuleSheet] = useState({ open: false, moduleId: null });
  const [searchSheet, setSearchSheet] = useState(false);
  const [addressSheet, setAddressSheet] = useState(false);
  const [privacySheet, setPrivacySheet] = useState(false);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Filter restaurants by category
  const filteredRestaurants = activeCategory === 'cat-1'
    ? restaurants
    : restaurants.filter(r => {
        const catName = categories.find(c => c.id === activeCategory)?.name.toLowerCase();
        return r.cuisine.toLowerCase().includes(catName || '');
      });

  const handleRestaurantClick = (restaurant) => {
    const menuData = getRestaurantMenu(restaurant.id);
    if (menuData) {
      setSelectedRestaurant(menuData);
    } else {
      setSelectedRestaurant({
        ...restaurant,
        accepts_cash: false,
        categories: [
          {
            id: 'cat-default',
            name: 'Menu',
            items: [
              {
                id: 'item-default-1',
                name: 'Plat du jour',
                description: 'Délicieux plat préparé avec soin',
                price: 2500,
                image: restaurant.image,
                is_available: true,
                max_per_order: 5,
              },
            ],
          },
        ],
      });
    }
    setCurrentScreen(SCREENS.RESTAURANT);
  };

  const handleBackToHome = () => {
    setCurrentScreen(SCREENS.HOME);
    setSelectedRestaurant(null);
  };

  const handleGoToCheckout = () => {
    setCurrentScreen(SCREENS.CHECKOUT);
  };

  const handleBackFromCheckout = () => {
    setCurrentScreen(SCREENS.RESTAURANT);
  };

  const handleOrderComplete = () => {
    setCurrentScreen(SCREENS.HOME);
    setSelectedRestaurant(null);
  };

  const handleDisabledTabClick = (item) => {
    setDisabledModuleSheet({ open: true, moduleId: item.id });
  };

  const handleNotifyMe = (moduleId) => {
    console.log('User wants notification for:', moduleId);
    alert(`✅ Vous serez notifié dès que ${moduleId.toUpperCase()} sera disponible !`);
  };

  // Cookie consent handlers
  const handleCookieAccept = () => {
    console.log('Cookies accepted');
  };

  const handleCookieCustomize = () => {
    setPrivacySheet(true);
  };

  const handleCookieDecline = () => {
    console.log('Cookies declined - essential only');
  };

  // Render based on current screen
  if (currentScreen === SCREENS.DRIVER_ONBOARDING) {
    return (
      <DriverOnboardingScreen
        onBack={handleBackToHome}
        onSuccess={handleBackToHome}
      />
    );
  }

  if (currentScreen === SCREENS.PARTNER_ONBOARDING) {
    return (
      <PartnerOnboardingScreen
        onBack={handleBackToHome}
        onSuccess={handleBackToHome}
      />
    );
  }

  if (currentScreen === SCREENS.CHECKOUT && selectedRestaurant) {
    return (
      <CheckoutScreen
        restaurant={selectedRestaurant}
        onBack={handleBackFromCheckout}
        onOrderComplete={handleOrderComplete}
      />
    );
  }

  if (currentScreen === SCREENS.RESTAURANT && selectedRestaurant) {
    return (
      <RestaurantScreen
        restaurant={selectedRestaurant}
        onBack={handleBackToHome}
        onCheckout={handleGoToCheckout}
      />
    );
  }

  // Home screen
  return (
    <div className="min-h-screen bg-white">
      {/* Cookie Consent */}
      <CookieConsentSheet
        onAccept={handleCookieAccept}
        onCustomize={handleCookieCustomize}
        onDecline={handleCookieDecline}
      />

      {/* Offline Banner */}
      {!isOnline && <OfflineBanner />}

      {/* Header */}
      <Header
        address={address}
        onAddressClick={() => setAddressSheet(true)}
        onSearchClick={() => setSearchSheet(true)}
      />

      {/* Categories */}
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Restaurant Feed */}
      <RestaurantFeed
        restaurants={filteredRestaurants}
        isLoading={isLoading}
        onRestaurantClick={handleRestaurantClick}
      />

      {/* Footer */}
      <Footer
        onPartnerClick={() => setCurrentScreen(SCREENS.PARTNER_ONBOARDING)}
        onDriverClick={() => setCurrentScreen(SCREENS.DRIVER_ONBOARDING)}
        onPrivacyClick={() => setPrivacySheet(true)}
      />

      {/* Bottom Navigation */}
      <BottomNav
        items={navItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDisabledTabClick={handleDisabledTabClick}
      />

      {/* Disabled Module Bottom Sheet */}
      <DisabledModuleSheet
        isOpen={disabledModuleSheet.open}
        onClose={() => setDisabledModuleSheet({ open: false, moduleId: null })}
        moduleId={disabledModuleSheet.moduleId}
        onNotifyMe={handleNotifyMe}
      />

      {/* Search Bottom Sheet */}
      <BottomSheet
        isOpen={searchSheet}
        onClose={() => setSearchSheet(false)}
        title="Rechercher"
      >
        <div className="py-2">
          <input
            type="text"
            placeholder="Rechercher un restaurant, une cuisine..."
            className="w-full bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            data-testid="search-input"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-3 text-center">
            Tapez pour rechercher parmi nos partenaires
          </p>
        </div>
      </BottomSheet>

      {/* Address Bottom Sheet */}
      <BottomSheet
        isOpen={addressSheet}
        onClose={() => setAddressSheet(false)}
        title="Adresse de livraison"
      >
        <div className="space-y-3">
          {['Bamako, Hamdallaye', 'Bamako, ACI 2000', 'Bamako, Badalabougou', 'Bamako, Kalaban Coura', 'Bamako, Magnambougou'].map((addr) => (
            <button
              key={addr}
              onClick={() => {
                setAddress(addr);
                setAddressSheet(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-2xl transition-colors ${
                address === addr
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
              data-testid={`address-option-${addr}`}
            >
              {addr}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Privacy Settings Sheet */}
      <PrivacySettingsSheet
        isOpen={privacySheet}
        onClose={() => setPrivacySheet(false)}
      />
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;
