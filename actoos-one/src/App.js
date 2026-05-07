import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { RestaurantFeed } from './components/RestaurantFeed';
import { RestaurantScreen } from './components/RestaurantScreen';
import { CheckoutScreen } from './components/CheckoutScreen';
import { DriverOnboardingScreen } from './components/DriverOnboardingScreen';
import { PartnerOnboardingScreen } from './components/PartnerOnboardingScreen';
import { TermsScreen } from './components/TermsScreen';
import { LegalScreen } from './components/LegalScreen';
import { PartnerKDSScreen } from './components/PartnerKDSScreen';
import { DriverAppScreen } from './components/DriverAppScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { PortalLogin } from './components/PortalLogin';
import { WalletScreen } from './components/WalletScreen';
import { HealthScreen } from './components/HealthScreen';
import { PharmacyScreen } from './components/PharmacyScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SplashScreen } from './components/SplashScreen';
import { LocationPermissionSheet } from './components/LocationPermissionSheet';
import { AddressSheet } from './components/AddressSheet';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { OfflineBanner } from './components/OfflineBanner';
import { DisabledModuleSheet } from './components/DisabledModuleSheet';
import { BottomSheet } from './components/BottomSheet';
import { CookieConsentSheet } from './components/CookieConsentSheet';
import { PrivacySettingsSheet } from './components/PrivacySettingsSheet';
import { CartProvider } from './context/CartContext';
import { WalletProvider } from './context/WalletContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { restaurants, categories, navItems } from './data/mockData';
import { getRestaurantMenu } from './data/menuData';
import { getPharmacyProducts } from './data/healthData';

// App modes based on URL path
const APP_MODES = {
  CLIENT: 'client',      // / (default)
  PARTNER: 'partner',    // /partner
  DRIVER: 'driver',      // /driver  
  ADMIN: 'admin',        // /admin
};

// Get app mode from URL
function getAppMode() {
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/partner')) return APP_MODES.PARTNER;
  if (path.startsWith('/driver')) return APP_MODES.DRIVER;
  if (path.startsWith('/admin')) return APP_MODES.ADMIN;
  return APP_MODES.CLIENT;
}

// Screens enum
const SCREENS = {
  HOME: 'home',
  RESTAURANT: 'restaurant',
  CHECKOUT: 'checkout',
  DRIVER_ONBOARDING: 'driver_onboarding',
  PARTNER_ONBOARDING: 'partner_onboarding',
  TERMS: 'terms',
  LEGAL: 'legal',
  PARTNER_KDS: 'partner_kds',
  DRIVER_APP: 'driver_app',
  ADMIN_DASHBOARD: 'admin_dashboard',
  WALLET: 'wallet',
  HEALTH: 'health',
  PHARMACY: 'pharmacy',
  PROFIL: 'profil',
};

function AppContent() {
  const isOnline = useOnlineStatus();
  const [showSplash, setShowSplash] = useState(true);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('cat-1');
  const [activeTab, setActiveTab] = useState('eats');
  const [address, setAddress] = useState(null); // null = pas d'adresse définie
  const [userLocation, setUserLocation] = useState(null);
  
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState(SCREENS.HOME);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  
  // Bottom Sheet states
  const [disabledModuleSheet, setDisabledModuleSheet] = useState({ open: false, moduleId: null });
  const [searchSheet, setSearchSheet] = useState(false);
  const [addressSheet, setAddressSheet] = useState(false);
  const [privacySheet, setPrivacySheet] = useState(false);

  // Load saved address from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('actoos_delivery_address');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
    
    // Vérifier si on a déjà demandé la permission de localisation
    const locationPermission = localStorage.getItem('actoos_location_permission');
    if (!locationPermission) {
      // Première visite - montrer la demande de localisation après les cookies
      // On attend que le cookie consent soit géré d'abord
      setTimeout(() => {
        const cookieConsent = localStorage.getItem('actoos_cookie_consent');
        if (cookieConsent) {
          setShowLocationPermission(true);
        }
      }, 500);
    } else if (locationPermission === 'granted') {
      // Permission déjà accordée - charger la position sauvegardée
      const savedLocation = localStorage.getItem('actoos_user_location');
      if (savedLocation) {
        setUserLocation(JSON.parse(savedLocation));
      }
    }
  };

  // Handle location permission granted
  const handleLocationAllowed = (location) => {
    setUserLocation(location);
    setShowLocationPermission(false);
    // Auto-détecter le quartier basé sur GPS (mock pour l'instant)
    // En production, on utiliserait reverse geocoding
    if (location) {
      const detectedAddress = 'Bamako, Hamdallaye'; // Mock - serait déterminé par GPS
      handleAddressSelect(detectedAddress);
    }
  };

  // Handle location permission denied
  const handleLocationDenied = () => {
    setShowLocationPermission(false);
  };

  // Handle address selection
  const handleAddressSelect = (newAddress) => {
    setAddress(newAddress);
    localStorage.setItem('actoos_delivery_address', newAddress);
  };

  // Request location from AddressSheet
  const handleRequestLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);
            localStorage.setItem('actoos_location_permission', 'granted');
            localStorage.setItem('actoos_user_location', JSON.stringify(location));
            // Mock: detect neighborhood from GPS
            const detectedAddress = 'Bamako, Hamdallaye';
            handleAddressSelect(detectedAddress);
            resolve(location);
          },
          (error) => {
            console.error('Geolocation error:', error);
            reject(error);
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  };

  // Vérifier le cookie consent pour afficher la localisation
  useEffect(() => {
    const checkLocationPrompt = () => {
      const cookieConsent = localStorage.getItem('actoos_cookie_consent');
      const locationPermission = localStorage.getItem('actoos_location_permission');
      
      if (cookieConsent && !locationPermission && !showSplash) {
        setShowLocationPermission(true);
      }
    };

    // Écouter les changements de localStorage (pour détecter quand les cookies sont acceptés)
    window.addEventListener('storage', checkLocationPrompt);
    
    // Vérifier aussi périodiquement (pour le même onglet)
    const interval = setInterval(checkLocationPrompt, 1000);
    
    return () => {
      window.removeEventListener('storage', checkLocationPrompt);
      clearInterval(interval);
    };
  }, [showSplash]);

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
    setSelectedPharmacy(null);
  };

  const handleGoToCheckout = () => {
    setCurrentScreen(SCREENS.CHECKOUT);
  };

  const handleBackFromCheckout = () => {
    // Return to pharmacy or restaurant based on context
    if (selectedPharmacy) {
      setCurrentScreen(SCREENS.PHARMACY);
    } else {
      setCurrentScreen(SCREENS.RESTAURANT);
    }
  };

  const handleOrderComplete = () => {
    setCurrentScreen(SCREENS.HOME);
    setSelectedRestaurant(null);
    setSelectedPharmacy(null);
  };

  const handleDisabledTabClick = (item) => {
    setDisabledModuleSheet({ open: true, moduleId: item.id });
  };

  // Handle tab change with navigation
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'wallet') {
      setCurrentScreen(SCREENS.WALLET);
    } else if (tabId === 'health') {
      setCurrentScreen(SCREENS.HEALTH);
      setSelectedPharmacy(null);
    } else if (tabId === 'profil') {
      setCurrentScreen(SCREENS.PROFIL);
    } else if (tabId === 'eats') {
      setCurrentScreen(SCREENS.HOME);
      setSelectedRestaurant(null);
      setSelectedPharmacy(null);
    }
  };

  // Health / Pharmacy handlers
  const handlePharmacyClick = (pharmacy) => {
    const pharmacyData = getPharmacyProducts(pharmacy.id);
    if (pharmacyData) {
      setSelectedPharmacy(pharmacyData);
    } else {
      setSelectedPharmacy({
        ...pharmacy,
        categories: [],
      });
    }
    setCurrentScreen(SCREENS.PHARMACY);
  };

  const handleBackToHealth = () => {
    setCurrentScreen(SCREENS.HEALTH);
    setSelectedPharmacy(null);
  };

  const handleNotifyMe = (moduleId) => {
    console.log('User wants notification for:', moduleId);
    alert(`✅ Vous serez notifié dès que ${moduleId.toUpperCase()} sera disponible !`);
  };

  // Cookie consent handlers
  const handleCookieAccept = () => {
    console.log('Cookies accepted');
    // Après acceptation des cookies, vérifier si on doit demander la localisation
    const locationPermission = localStorage.getItem('actoos_location_permission');
    if (!locationPermission) {
      setTimeout(() => setShowLocationPermission(true), 500);
    }
  };

  const handleCookieCustomize = () => {
    setPrivacySheet(true);
  };

  const handleCookieDecline = () => {
    console.log('Cookies declined - essential only');
    // Même si refusé, on peut demander la localisation
    const locationPermission = localStorage.getItem('actoos_location_permission');
    if (!locationPermission) {
      setTimeout(() => setShowLocationPermission(true), 500);
    }
  };

  // Splash Screen
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Render based on current screen
  if (currentScreen === SCREENS.PROFIL) {
    return (
      <>
        <ProfileScreen
          onBack={handleBackToHome}
          onDriverOnboarding={() => setCurrentScreen(SCREENS.DRIVER_ONBOARDING)}
          onPartnerOnboarding={() => setCurrentScreen(SCREENS.PARTNER_ONBOARDING)}
          onSwitchToDriver={() => setCurrentScreen(SCREENS.DRIVER_APP)}
          onSwitchToPartner={() => setCurrentScreen(SCREENS.PARTNER_KDS)}
          onSwitchToAdmin={() => setCurrentScreen(SCREENS.ADMIN_DASHBOARD)}
          onPrivacyClick={() => setPrivacySheet(true)}
          onTermsClick={() => setCurrentScreen(SCREENS.TERMS)}
        />
        <LocationPermissionSheet
          isOpen={showLocationPermission}
          onAllow={handleLocationAllowed}
          onDeny={handleLocationDenied}
        />
      </>
    );
  }

  if (currentScreen === SCREENS.HEALTH) {
    return (
      <HealthScreen
        onBack={handleBackToHome}
        onPharmacyClick={handlePharmacyClick}
      />
    );
  }

  if (currentScreen === SCREENS.PHARMACY && selectedPharmacy) {
    return (
      <PharmacyScreen
        pharmacy={selectedPharmacy}
        onBack={handleBackToHealth}
        onCheckout={handleGoToCheckout}
      />
    );
  }

  if (currentScreen === SCREENS.WALLET) {
    return <WalletScreen onBack={handleBackToHome} />;
  }

  if (currentScreen === SCREENS.ADMIN_DASHBOARD) {
    return <AdminDashboard onBack={handleBackToHome} />;
  }

  if (currentScreen === SCREENS.DRIVER_APP) {
    return <DriverAppScreen onBack={handleBackToHome} />;
  }

  if (currentScreen === SCREENS.PARTNER_KDS) {
    return <PartnerKDSScreen onBack={handleBackToHome} />;
  }

  if (currentScreen === SCREENS.TERMS) {
    return <TermsScreen onBack={handleBackToHome} />;
  }

  if (currentScreen === SCREENS.LEGAL) {
    return <LegalScreen onBack={handleBackToHome} />;
  }

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

  if (currentScreen === SCREENS.CHECKOUT && (selectedRestaurant || selectedPharmacy)) {
    // Use pharmacy or restaurant data
    const checkoutEntity = selectedPharmacy || selectedRestaurant;
    return (
      <CheckoutScreen
        restaurant={checkoutEntity}
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
        onTermsClick={() => setCurrentScreen(SCREENS.TERMS)}
        onLegalClick={() => setCurrentScreen(SCREENS.LEGAL)}
      />

      {/* Bottom Navigation */}
      <BottomNav
        items={navItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
      <AddressSheet
        isOpen={addressSheet}
        onClose={() => setAddressSheet(false)}
        currentAddress={address}
        onSelectAddress={handleAddressSelect}
        userLocation={userLocation}
        onRequestLocation={handleRequestLocation}
      />

      {/* Privacy Settings Sheet */}
      <PrivacySettingsSheet
        isOpen={privacySheet}
        onClose={() => setPrivacySheet(false)}
      />

      {/* Location Permission Sheet */}
      <LocationPermissionSheet
        isOpen={showLocationPermission}
        onAllow={handleLocationAllowed}
        onDeny={handleLocationDenied}
      />
    </div>
  );
}

// Partner Portal App
function PartnerApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Check for existing session
  useEffect(() => {
    const session = localStorage.getItem('actoos_partner_session');
    if (session) {
      setUser(JSON.parse(session));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('actoos_partner_session', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('actoos_partner_session');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return (
      <PortalLogin 
        portalType="partner" 
        onSuccess={handleLoginSuccess}
        onBack={() => window.location.href = '/'}
      />
    );
  }

  return (
    <PartnerKDSScreen 
      onBack={handleLogout}
    />
  );
}

// Driver Portal App
function DriverApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem('actoos_driver_session');
    if (session) {
      setUser(JSON.parse(session));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('actoos_driver_session', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('actoos_driver_session');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return (
      <PortalLogin 
        portalType="driver" 
        onSuccess={handleLoginSuccess}
        onBack={() => window.location.href = '/'}
      />
    );
  }

  return (
    <DriverAppScreen 
      onBack={handleLogout}
    />
  );
}

// Admin Portal App
function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem('actoos_admin_session');
    if (session) {
      setUser(JSON.parse(session));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('actoos_admin_session', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('actoos_admin_session');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return (
      <PortalLogin 
        portalType="admin" 
        onSuccess={handleLoginSuccess}
        onBack={() => window.location.href = '/'}
      />
    );
  }

  return (
    <AdminDashboard 
      onBack={handleLogout}
    />
  );
}

// Main App Router
function App() {
  const [appMode] = useState(getAppMode());

  // Route to appropriate portal based on URL
  switch (appMode) {
    case APP_MODES.PARTNER:
      return <PartnerApp />;
    case APP_MODES.DRIVER:
      return <DriverApp />;
    case APP_MODES.ADMIN:
      return <AdminApp />;
    default:
      // Client app with full providers
      return (
        <WalletProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </WalletProvider>
      );
  }
}

export default App;
