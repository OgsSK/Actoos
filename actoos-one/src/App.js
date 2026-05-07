import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { RestaurantFeed } from './components/RestaurantFeed';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { OfflineBanner } from './components/OfflineBanner';
import { DisabledModuleSheet } from './components/DisabledModuleSheet';
import { BottomSheet } from './components/BottomSheet';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { restaurants, categories, navItems, systemConfig } from './data/mockData';

function App() {
  const isOnline = useOnlineStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('cat-1');
  const [activeTab, setActiveTab] = useState('eats');
  const [address, setAddress] = useState(systemConfig.defaultAddress);
  
  // Bottom Sheet states
  const [disabledModuleSheet, setDisabledModuleSheet] = useState({ open: false, moduleId: null });
  const [searchSheet, setSearchSheet] = useState(false);
  const [addressSheet, setAddressSheet] = useState(false);
  const [partnerSheet, setPartnerSheet] = useState(false);
  const [driverSheet, setDriverSheet] = useState(false);

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
    // Guest-first: allow viewing but prompt login on checkout
    console.log('Restaurant clicked:', restaurant.name);
    alert(`🍽️ ${restaurant.name}\n\nDétails du menu à venir...\n(Guest-First: pas de login requis pour naviguer)`);
  };

  const handleDisabledTabClick = (item) => {
    setDisabledModuleSheet({ open: true, moduleId: item.id });
  };

  const handleNotifyMe = (moduleId) => {
    console.log('User wants notification for:', moduleId);
    alert(`✅ Vous serez notifié dès que ${moduleId.toUpperCase()} sera disponible !`);
  };

  return (
    <div className="min-h-screen bg-dark">
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
        onPartnerClick={() => setPartnerSheet(true)}
        onDriverClick={() => setDriverSheet(true)}
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
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
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
          {['Abidjan, Cocody', 'Abidjan, Plateau', 'Abidjan, Marcory', 'Abidjan, Yopougon'].map((addr) => (
            <button
              key={addr}
              onClick={() => {
                setAddress(addr);
                setAddressSheet(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-2xl transition-colors ${
                address === addr
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-300 active:bg-gray-700'
              }`}
              data-testid={`address-option-${addr}`}
            >
              {addr}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Partner Onboarding Bottom Sheet */}
      <BottomSheet
        isOpen={partnerSheet}
        onClose={() => setPartnerSheet(false)}
        title="Devenir Partenaire"
      >
        <div className="text-center py-4">
          <div className="text-5xl mb-4">🏪</div>
          <p className="text-gray-400 text-sm mb-6">
            Inscrivez votre restaurant sur ACTOOS et touchez des milliers de clients.
          </p>
          <button
            className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-2xl active:bg-primary/90 transition-colors"
            data-testid="partner-register-btn"
            onClick={() => alert('📝 Formulaire partenaire à venir (Mission 3)')}
          >
            Commencer l'inscription
          </button>
        </div>
      </BottomSheet>

      {/* Driver Onboarding Bottom Sheet */}
      <BottomSheet
        isOpen={driverSheet}
        onClose={() => setDriverSheet(false)}
        title="Devenir Livreur"
      >
        <div className="text-center py-4">
          <div className="text-5xl mb-4">🛵</div>
          <p className="text-gray-400 text-sm mb-6">
            Rejoignez notre flotte de livreurs et gagnez de l'argent à votre rythme.
          </p>
          <button
            className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-2xl active:bg-primary/90 transition-colors"
            data-testid="driver-register-btn"
            onClick={() => alert('📝 Formulaire livreur à venir (Mission 3)')}
          >
            Commencer l'inscription
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default App;
