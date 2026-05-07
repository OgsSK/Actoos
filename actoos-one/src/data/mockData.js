// Mock data for ACTOOS ONE Home PWA
// Données simulées pour le feed restaurant Guest-First

// Horaires d'ouverture par défaut (style Uber Eats)
const DEFAULT_OPENING_HOURS = {
  monday: { closed: false, periods: [{ open: '11:00', close: '14:30' }, { open: '18:00', close: '23:00' }] },
  tuesday: { closed: false, periods: [{ open: '11:00', close: '14:30' }, { open: '18:00', close: '23:00' }] },
  wednesday: { closed: false, periods: [{ open: '11:00', close: '14:30' }, { open: '18:00', close: '23:00' }] },
  thursday: { closed: false, periods: [{ open: '11:00', close: '14:30' }, { open: '18:00', close: '23:00' }] },
  friday: { closed: false, periods: [{ open: '11:00', close: '14:30' }, { open: '18:00', close: '00:00' }] },
  saturday: { closed: false, periods: [{ open: '11:00', close: '00:00' }] },
  sunday: { closed: false, periods: [{ open: '12:00', close: '22:00' }] },
};

const FAST_FOOD_HOURS = {
  monday: { closed: false, periods: [{ open: '10:00', close: '23:00' }] },
  tuesday: { closed: false, periods: [{ open: '10:00', close: '23:00' }] },
  wednesday: { closed: false, periods: [{ open: '10:00', close: '23:00' }] },
  thursday: { closed: false, periods: [{ open: '10:00', close: '23:00' }] },
  friday: { closed: false, periods: [{ open: '10:00', close: '00:00' }] },
  saturday: { closed: false, periods: [{ open: '10:00', close: '00:00' }] },
  sunday: { closed: false, periods: [{ open: '11:00', close: '22:00' }] },
};

export const restaurants = [
  {
    id: 'rest-001',
    name: 'Maquis Chez Tanti',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    cuisine: 'Africain',
    rating: 4.8,
    deliveryTime: '25-35 min',
    deliveryFee: 500,
    distance: '1.2 km',
    isOpen: true,
    isFeatured: true,
    // Nouvelles propriétés pour Scheduled Orders
    openingHours: DEFAULT_OPENING_HOURS,
    acceptOrdersWhenClosed: true,  // Permet de commander même fermé
    allowScheduledOrders: true,    // Permet les commandes programmées
    maxScheduleDays: 7,            // Jusqu'à 7 jours à l'avance
    selfDelivery: true,            // Livraison par le restaurant
  },
  {
    id: 'rest-002',
    name: 'Le Djoliba',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    cuisine: 'Malien',
    rating: 4.5,
    deliveryTime: '30-40 min',
    deliveryFee: 750,
    distance: '2.5 km',
    isOpen: true,
    isFeatured: false,
    openingHours: DEFAULT_OPENING_HOURS,
    acceptOrdersWhenClosed: true,
    allowScheduledOrders: true,
    maxScheduleDays: 3,
    selfDelivery: false,           // Livraison par ACTOOS
  },
  {
    id: 'rest-003',
    name: 'Fast Food Bamako',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    cuisine: 'Burgers',
    rating: 4.2,
    deliveryTime: '15-25 min',
    deliveryFee: 500,
    distance: '0.8 km',
    isOpen: true,
    isFeatured: true,
    openingHours: FAST_FOOD_HOURS,
    acceptOrdersWhenClosed: true,
    allowScheduledOrders: true,
    maxScheduleDays: 7,
    selfDelivery: true,
  },
  {
    id: 'rest-004',
    name: 'Saveurs du Niger',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    cuisine: 'Sénégalais',
    rating: 4.6,
    deliveryTime: '35-45 min',
    deliveryFee: 1000,
    distance: '3.8 km',
    isOpen: false,
    isFeatured: false,
    openingHours: DEFAULT_OPENING_HOURS,
    acceptOrdersWhenClosed: true,  // Permet de commander même fermé
    allowScheduledOrders: true,
    maxScheduleDays: 5,
    selfDelivery: false,
  },
  {
    id: 'rest-005',
    name: 'Pizza Mama Africa',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    cuisine: 'Pizza',
    rating: 4.4,
    deliveryTime: '25-35 min',
    deliveryFee: 750,
    distance: '1.5 km',
    isOpen: true,
    isFeatured: false,
    openingHours: FAST_FOOD_HOURS,
    acceptOrdersWhenClosed: false, // NE permet PAS de commander quand fermé
    allowScheduledOrders: true,
    maxScheduleDays: 3,
    selfDelivery: true,
  },
  {
    id: 'rest-006',
    name: 'Grillades de Bamako',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    cuisine: 'Grillades',
    rating: 4.7,
    deliveryTime: '20-30 min',
    deliveryFee: 500,
    distance: '1.0 km',
    isOpen: true,
    isFeatured: true,
    openingHours: DEFAULT_OPENING_HOURS,
    acceptOrdersWhenClosed: true,
    allowScheduledOrders: false,   // NE permet PAS les commandes programmées
    maxScheduleDays: 0,
    selfDelivery: true,
  },
];

export const categories = [
  { id: 'cat-1', name: 'Tout', icon: '🍽️', active: true },
  { id: 'cat-2', name: 'Africain', icon: '🥘', active: false },
  { id: 'cat-3', name: 'Burgers', icon: '🍔', active: false },
  { id: 'cat-4', name: 'Pizza', icon: '🍕', active: false },
  { id: 'cat-5', name: 'Poulet', icon: '🍗', active: false },
  { id: 'cat-6', name: 'Healthy', icon: '🥗', active: false },
];

export const navItems = [
  { id: 'eats', label: 'Eats', icon: 'UtensilsCrossed', active: true, enabled: true },
  { id: 'health', label: 'Health', icon: 'Heart', active: false, enabled: true },
  { id: 'wallet', label: 'Wallet', icon: 'Wallet', active: false, enabled: true },
  { id: 'profil', label: 'Profil', icon: 'User', active: false, enabled: true },
];

export const systemConfig = {
  appName: 'ACTOOS ONE',
  slogan: 'Tout. Tout de suite. Partout.',
  defaultAddress: 'Bamako, Hamdallaye',
  countryCode: '+223',
  currency: 'FCFA',
  featureFlags: {
    eats: true,
    health: true,
    wallet: true,
    p2p: true,
    virtual_cards: false, // Bientôt disponible
  },
};
