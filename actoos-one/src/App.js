import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { OrderHistoryScreen } from './components/OrderHistoryScreen';
import { OrderTrackingScreen } from './components/OrderTrackingScreen';
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
import { AdminLogin } from './components/AdminLogin';
import { LoginSheet } from './components/LoginSheet';
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
import { SearchSheet } from './components/SearchSheet';
import { PromoBanner } from './components/PromoBanner';
import { FavoritesScreen } from './components/FavoritesScreen';
import { RatingSheet } from './components/RatingSystem';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WalletProvider } from './context/WalletContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { categories, navItems } from './data/mockData';
import { getRestaurantMenu } from './data/menuData';
import { getPharmacyProducts, pharmacyProducts } from './data/healthData';
import { getRestaurants, getRestaurantById } from './services/restaurantService';

// App modes based on URL path
const APP_MODES = {
  CLIENT: 'client',      // / (default)
  PARTNER: 'partner',    // /partner
  DRIVER: 'driver',      // /driver  
  ADMIN: 'admin',        // /admin
};

// Get app mode from URL path
function getAppModeFromPath(pathname) {
  const path = pathname.toLowerCase();
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
  ORDER_TRACKING: 'order_tracking',
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
  ORDER_HISTORY: 'order_history',
  FAVORITES: 'favorites',
};

function AppContent() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user: authUser, profile: authProfile } = useAuth();
  
  const [showSplash, setShowSplash] = useState(true);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('cat-all');
  const [activeFilters, setActiveFilters] = useState([]); // ['pickup', 'offers', 'top_rated']
  const [activeTab, setActiveTab] = useState('eats');
  const [address, setAddress] = useState(null); // null = pas d'adresse définie
  const [userLocation, setUserLocation] = useState(null);
  
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState(SCREENS.HOME);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null); // For order tracking
  
  // Bottom Sheet states
  const [disabledModuleSheet, setDisabledModuleSheet] = useState({ open: false, moduleId: null });
  const [searchSheet, setSearchSheet] = useState(false);
  const [addressSheet, setAddressSheet] = useState(false);

  // Determine app mode from current route
  const appMode = getAppModeFromPath(location.pathname);

  // Deep linking - Handle URL routes
  useEffect(() => {
    const path = location.pathname;
    
    // Restaurant deep link: /restaurant/:id
    const restaurantMatch = path.match(/^\/restaurant\/([^/]+)/);
    if (restaurantMatch) {
      const restaurantId = restaurantMatch[1];
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (restaurant) {
        handleRestaurantClick(restaurant);
      }
      return;
    }
    
    // Pharmacy deep link: /pharmacy/:id
    const pharmacyMatch = path.match(/^\/pharmacy\/([^/]+)/);
    if (pharmacyMatch) {
      const pharmacyId = pharmacyMatch[1];
      const pharmacy = pharmacyProducts.find(p => p.id === pharmacyId);
      if (pharmacy) {
        handlePharmacyClick(pharmacy);
      }
      return;
    }
    
    // Tab routes
    if (path === '/health') {
      // Module Pharmacie désactivé pour MVP - rediriger vers home
      setActiveTab('eats');
      setCurrentScreen(SCREENS.HOME);
    } else if (path === '/wallet') {
      setActiveTab('wallet');
      setCurrentScreen(SCREENS.WALLET);
    } else if (path === '/profile' || path === '/profil') {
      setActiveTab('profil');
      setCurrentScreen(SCREENS.PROFIL);
    } else if (path === '/favorites') {
      setActiveTab('profil');
      setCurrentScreen(SCREENS.FAVORITES);
    } else if (path === '/' || path === '/eats') {
      setActiveTab('eats');
      setCurrentScreen(SCREENS.HOME);
    }
  }, [location.pathname]);

  // Update URL when navigating
  const navigateToRestaurant = (restaurant) => {
    navigate(`/restaurant/${restaurant.id}`);
  };
  
  const navigateToPharmacy = (pharmacy) => {
    navigate(`/pharmacy/${pharmacy.id}`);
  };
  
  const navigateToHome = () => {
    navigate('/');
    setCurrentScreen(SCREENS.HOME);
  };
  
  const navigateToTab = (tab) => {
    const routes = {
      eats: '/',
      health: '/health',
      wallet: '/wallet',
      profil: '/profile',
    };
    navigate(routes[tab] || '/');
  };

  const [privacySheet, setPrivacySheet] = useState(false);
  
  // PRODUCTION: Restaurants loaded from Supabase
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);

  // Load restaurants from Supabase on mount
  useEffect(() => {
    async function loadRestaurants() {
      setRestaurantsLoading(true);
      try {
        const { data, error } = await getRestaurants();
        if (error) {
          console.error('Erreur chargement restaurants:', error);
        }
        setRestaurants(data || []);
      } catch (err) {
        console.error('Erreur:', err);
        setRestaurants([]);
      } finally {
        setRestaurantsLoading(false);
      }
    }
    loadRestaurants();
  }, []);

  // Prepare restaurants with full menus for search
  const restaurantsWithMenus = useMemo(() => {
    return restaurants.map(r => ({
      ...r,
      categories: [], // Will be loaded on click
    }));
  }, [restaurants]);

  // Prepare pharmacies with products for search
  const pharmaciesWithProducts = useMemo(() => {
    return Object.values(pharmacyProducts || {});
  }, []);

  // Load saved address from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('actoos_delivery_address');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  // AUTO-DETECT LOCATION au démarrage (comme Uber Eats)
  // Si permission déjà accordée, rafraîchir la position automatiquement
  useEffect(() => {
    const autoDetectLocation = async () => {
      const locationPermission = localStorage.getItem('actoos_location_permission');
      const savedAddress = localStorage.getItem('actoos_delivery_address');
      
      // Si permission accordée mais pas d'adresse, ou si on veut rafraîchir
      if (locationPermission === 'granted' && !savedAddress) {
        try {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const location = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                setUserLocation(location);
                localStorage.setItem('actoos_user_location', JSON.stringify(location));
                
                // Reverse geocoding pour obtenir l'adresse
                try {
                  const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,
                    {
                      headers: {
                        'Accept-Language': 'fr',
                        'User-Agent': 'ACTOOS-App/1.0'
                      }
                    }
                  );
                  
                  if (response.ok) {
                    const data = await response.json();
                    const addr = data.address;
                    let detectedAddress = '';
                    
                    // Obtenir la ville/commune - SANS préfixer avec Bamako
                    const city = addr.city || addr.town || addr.village || addr.municipality || '';
                    const area = addr.neighbourhood || addr.suburb || addr.district || addr.city_district || '';
                    
                    if (city && area) {
                      detectedAddress = `${city}, ${area}`;
                    } else if (city) {
                      detectedAddress = city;
                    } else if (area) {
                      detectedAddress = area;
                    } else {
                      detectedAddress = data.display_name?.split(',').slice(0, 2).join(', ') || 'Position actuelle';
                    }
                    
                    handleAddressSelect(detectedAddress);
                  }
                } catch (error) {
                  console.error('Auto-detect reverse geocoding error:', error);
                }
              },
              (error) => {
                console.error('Auto-detect geolocation error:', error);
              },
              {
                enableHighAccuracy: false, // Moins précis mais plus rapide pour l'auto-detect
                timeout: 10000,
                maximumAge: 60000 // Accepter une position cachée de 1 minute
              }
            );
          }
        } catch (error) {
          console.error('Auto-detect location error:', error);
        }
      }
    };
    
    // Lancer l'auto-détection après un court délai (après le splash)
    const timeout = setTimeout(autoDetectLocation, 2000);
    return () => clearTimeout(timeout);
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

  // Handle location permission granted - avec REVERSE GEOCODING RÉEL
  const handleLocationAllowed = async (location) => {
    setUserLocation(location);
    setShowLocationPermission(false);
    
    // Reverse geocoding réel avec Nominatim
    if (location) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'fr',
              'User-Agent': 'ACTOOS-App/1.0'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const addr = data.address;
          let detectedAddress = '';
          
          // Obtenir la ville/commune - SANS préfixer avec Bamako
          const city = addr.city || addr.town || addr.village || addr.municipality || '';
          const area = addr.neighbourhood || addr.suburb || addr.district || addr.city_district || '';
          
          if (city && area) {
            detectedAddress = `${city}, ${area}`;
          } else if (city) {
            detectedAddress = city;
          } else if (area) {
            detectedAddress = area;
          } else {
            detectedAddress = data.display_name?.split(',').slice(0, 2).join(', ') || 'Position actuelle';
          }
          
          handleAddressSelect(detectedAddress);
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        handleAddressSelect('Position actuelle');
      }
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

  // Request location from AddressSheet - avec REVERSE GEOCODING RÉEL
  const handleRequestLocation = async () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);
            localStorage.setItem('actoos_location_permission', 'granted');
            localStorage.setItem('actoos_user_location', JSON.stringify(location));
            
            // Reverse geocoding réel avec Nominatim
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,
                {
                  headers: {
                    'Accept-Language': 'fr',
                    'User-Agent': 'ACTOOS-App/1.0'
                  }
                }
              );
              
              if (response.ok) {
                const data = await response.json();
                const addr = data.address;
                let detectedAddress = '';
                
                // Obtenir la ville/commune - SANS préfixer avec Bamako
                const city = addr.city || addr.town || addr.village || addr.municipality || '';
                const area = addr.neighbourhood || addr.suburb || addr.district || addr.city_district || '';
                
                if (city && area) {
                  detectedAddress = `${city}, ${area}`;
                } else if (city) {
                  detectedAddress = city;
                } else if (area) {
                  detectedAddress = area;
                } else {
                  detectedAddress = data.display_name?.split(',').slice(0, 2).join(', ') || 'Position actuelle';
                }
                
                handleAddressSelect(detectedAddress);
              }
            } catch (error) {
              console.error('Reverse geocoding error:', error);
              handleAddressSelect('Position actuelle');
            }
            
            resolve(location);
          },
          (error) => {
            console.error('Geolocation error:', error);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
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

  // Filter restaurants by category and filters
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      // Category filter
      if (activeCategory !== 'cat-all') {
        const catName = categories.find(c => c.id === activeCategory)?.name.toLowerCase();
        if (catName && !r.cuisine?.toLowerCase().includes(catName)) {
          return false;
        }
      }
      
      // Apply active filters
      if (activeFilters.includes('pickup') && !r.acceptsPickup) {
        return false;
      }
      if (activeFilters.includes('offers') && !r.hasOffers) {
        return false;
      }
      if (activeFilters.includes('top_rated') && r.rating < 4.5) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by rating if top_rated filter is active
      if (activeFilters.includes('top_rated')) {
        return b.rating - a.rating;
      }
      return 0;
    });
  }, [restaurants, activeCategory, activeFilters]);

  const handleRestaurantClick = async (restaurant) => {
    // Charger le restaurant avec son menu depuis Supabase
    const { data: restaurantData, error } = await getRestaurantById(restaurant.id);
    
    if (error || !restaurantData) {
      console.error('Erreur chargement restaurant:', error);
      // Fallback: utiliser les données basiques du restaurant
      setSelectedRestaurant({
        ...restaurant,
        accepts_cash: false,
        categories: [],
      });
    } else {
      setSelectedRestaurant({
        ...restaurantData,
        // Carry over scheduling-related properties
        openingHours: restaurant.openingHours,
        acceptOrdersWhenClosed: restaurant.acceptOrdersWhenClosed,
        allowScheduledOrders: restaurant.allowScheduledOrders,
        maxScheduleDays: restaurant.maxScheduleDays,
        selfDelivery: restaurant.selfDelivery || restaurantData.selfDelivery,
        isOpen: restaurant.isOpen,
      });
    }
    
    setCurrentScreen(SCREENS.RESTAURANT);
    navigateToRestaurant(restaurant);
  };

  const handleBackToHome = () => {
    setCurrentScreen(SCREENS.HOME);
    setSelectedRestaurant(null);
    setSelectedPharmacy(null);
    navigate('/');
  };

  const handleGoToCheckout = () => {
    setCurrentScreen(SCREENS.CHECKOUT);
  };

  const handleBackFromCheckout = () => {
    // Return to pharmacy or restaurant based on context
    if (selectedPharmacy) {
      setCurrentScreen(SCREENS.PHARMACY);
      navigate(`/pharmacy/${selectedPharmacy.id}`);
    } else if (selectedRestaurant) {
      setCurrentScreen(SCREENS.RESTAURANT);
      navigate(`/restaurant/${selectedRestaurant.id}`);
    } else {
      navigate('/');
    }
  };

  const handleOrderComplete = (orderData) => {
    // If we have order data, show tracking screen
    if (orderData) {
      setActiveOrder(orderData);
      setCurrentScreen(SCREENS.ORDER_TRACKING);
    } else {
      setCurrentScreen(SCREENS.HOME);
      setSelectedRestaurant(null);
      setSelectedPharmacy(null);
      navigate('/');
    }
  };

  const handleTrackingComplete = () => {
    setActiveOrder(null);
    setCurrentScreen(SCREENS.HOME);
    setSelectedRestaurant(null);
    setSelectedPharmacy(null);
    navigate('/');
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
      // Module Pharmacie désactivé pour MVP
      setDisabledModuleSheet({ open: true, moduleId: 'pharmacy' });
      return;
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
    // Update URL for deep linking
    navigate(`/pharmacy/${pharmacy.id}`);
  };

  const handleBackToHealth = () => {
    setCurrentScreen(SCREENS.HEALTH);
    setSelectedPharmacy(null);
    navigate('/health');
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
  if (currentScreen === SCREENS.ORDER_TRACKING) {
    return (
      <OrderTrackingScreen
        order={activeOrder}
        onBack={handleTrackingComplete}
        onComplete={handleTrackingComplete}
      />
    );
  }

  if (currentScreen === SCREENS.ORDER_HISTORY) {
    return (
      <OrderHistoryScreen
        onBack={() => setCurrentScreen(SCREENS.PROFIL)}
        onReorder={(order) => {
          // Navigate to the restaurant of the order
          const restaurant = restaurants.find(r => r.id === order.restaurant_id);
          if (restaurant) {
            handleRestaurantClick(restaurant);
          }
        }}
        onViewRestaurant={(order) => {
          const restaurant = restaurants.find(r => r.id === order.restaurant_id);
          if (restaurant) {
            handleRestaurantClick(restaurant);
          }
        }}
      />
    );
  }

  if (currentScreen === SCREENS.FAVORITES) {
    return (
      <FavoritesScreen
        onBack={() => setCurrentScreen(SCREENS.PROFIL)}
        onSelectPartner={(partner) => {
          const restaurant = restaurants.find(r => r.id === partner.id);
          if (restaurant) {
            handleRestaurantClick(restaurant);
          }
        }}
      />
    );
  }

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
          onOrderHistory={() => setCurrentScreen(SCREENS.ORDER_HISTORY)}
          onFavorites={() => setCurrentScreen(SCREENS.FAVORITES)}
          isLoggedIn={isAuthenticated}
          currentUser={authProfile}
          onLoginClick={() => setShowLoginSheet(true)}
        />
        {/* Login Sheet - disponible sur le profil */}
        <LoginSheet
          isOpen={showLoginSheet}
          onClose={() => setShowLoginSheet(false)}
          onSuccess={() => {
            setShowLoginSheet(false);
          }}
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
      <>
        <CheckoutScreen
          restaurant={checkoutEntity}
          onBack={handleBackFromCheckout}
          onOrderComplete={handleOrderComplete}
          onLoginRequired={() => setShowLoginSheet(true)}
          savedAddress={address}
        />
        {/* Login Sheet - disponible pendant le checkout */}
        <LoginSheet
          isOpen={showLoginSheet}
          onClose={() => setShowLoginSheet(false)}
          onSuccess={() => {
            setShowLoginSheet(false);
          }}
        />
      </>
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
        onProfileClick={() => setShowLoginSheet(true)}
        onFavoritesClick={() => setCurrentScreen(SCREENS.FAVORITES)}
      />

      {/* Categories */}
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      {/* Promo Banner */}
      <PromoBanner />

      {/* Restaurant Feed */}
      <RestaurantFeed
        restaurants={filteredRestaurants}
        isLoading={isLoading || restaurantsLoading}
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

      {/* Search Sheet */}
      <SearchSheet
        isOpen={searchSheet}
        onClose={() => setSearchSheet(false)}
        restaurants={restaurantsWithMenus}
        pharmacies={pharmaciesWithProducts}
        onSelectRestaurant={async (restaurant) => {
          // Charger le menu complet du restaurant depuis Supabase
          try {
            const { getRestaurantById } = await import('./services/restaurantService');
            const result = await getRestaurantById(restaurant.id);
            if (result.data) {
              setSelectedRestaurant(result.data);
            } else {
              console.error('Erreur chargement menu:', result.error);
              setSelectedRestaurant(restaurant);
            }
          } catch (error) {
            console.error('Erreur chargement menu:', error);
            setSelectedRestaurant(restaurant);
          }
          setCurrentScreen(SCREENS.RESTAURANT);
        }}
        onSelectPharmacy={(pharmacy) => {
          setSelectedPharmacy(pharmacy);
          setCurrentScreen(SCREENS.PHARMACY);
        }}
      />

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

      {/* Login Sheet */}
      <LoginSheet
        isOpen={showLoginSheet}
        onClose={() => setShowLoginSheet(false)}
        onSuccess={() => {
          setShowLoginSheet(false);
          // Optionally navigate to profile or refresh
        }}
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
  const [testPartnerId, setTestPartnerId] = useState(null);

  // Check for existing session or test mode
  useEffect(() => {
    // Check for test mode via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const testMode = urlParams.get('test') === 'true';
    const partnerId = urlParams.get('partner_id');
    
    if (testMode) {
      // Test mode - skip authentication
      console.log('🧪 Partner KDS - Mode Test activé');
      setTestPartnerId(partnerId || null);
      setIsAuthenticated(true);
      return;
    }

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
    window.location.href = '/partner';
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
      partnerId={testPartnerId || user?.partner_id}
      onBack={handleLogout}
    />
  );
}

// Driver Portal App
function DriverApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [testDriverId, setTestDriverId] = useState(null);

  useEffect(() => {
    // Check for test mode via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const testMode = urlParams.get('test') === 'true';
    const driverId = urlParams.get('driver_id');
    
    if (testMode) {
      // Test mode - skip authentication
      // Use a real driver ID from seeded data if not provided
      const realDriverId = driverId || 'a1111111-1111-1111-1111-111111111111'; // Amadou Diallo
      console.log('🧪 Driver App - Mode Test activé avec driver:', realDriverId);
      setTestDriverId(realDriverId);
      setIsAuthenticated(true);
      return;
    }

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
    window.location.href = '/driver';
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
      driverId={testDriverId || user?.driver_id}
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
      <AdminLogin 
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

// Client App wrapped with providers
function ClientApp() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <WalletProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </WalletProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}

// Main App with React Router
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Partner Portal */}
        <Route path="/partner/*" element={<PartnerApp />} />
        
        {/* Driver Portal */}
        <Route path="/driver/*" element={<DriverApp />} />
        
        {/* Admin Portal (GOD MODE) */}
        <Route path="/admin/*" element={<AdminApp />} />
        
        {/* Client App - All other routes */}
        <Route path="/*" element={<ClientApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
