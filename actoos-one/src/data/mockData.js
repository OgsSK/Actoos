// Mock data for ACTOOS ONE Home PWA
// Données simulées pour le feed restaurant Guest-First

export const restaurants = [
  {
    id: 'rest-001',
    name: 'Maquis Chez Tantie',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    cuisine: 'Africain',
    rating: 4.8,
    deliveryTime: '25-35 min',
    deliveryFee: 500,
    distance: '1.2 km',
    isOpen: true,
    isFeatured: true,
  },
  {
    id: 'rest-002',
    name: 'Le Palmier Doré',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    cuisine: 'Ivoirien',
    rating: 4.5,
    deliveryTime: '30-40 min',
    deliveryFee: 750,
    distance: '2.5 km',
    isOpen: true,
    isFeatured: false,
  },
  {
    id: 'rest-003',
    name: 'Fast Food Express',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    cuisine: 'Burgers',
    rating: 4.2,
    deliveryTime: '15-25 min',
    deliveryFee: 500,
    distance: '0.8 km',
    isOpen: true,
    isFeatured: true,
  },
  {
    id: 'rest-004',
    name: 'Saveurs du Sahel',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    cuisine: 'Sénégalais',
    rating: 4.6,
    deliveryTime: '35-45 min',
    deliveryFee: 1000,
    distance: '3.8 km',
    isOpen: false,
    isFeatured: false,
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
  },
  {
    id: 'rest-006',
    name: 'Grillades du Marché',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    cuisine: 'Grillades',
    rating: 4.7,
    deliveryTime: '20-30 min',
    deliveryFee: 500,
    distance: '1.0 km',
    isOpen: true,
    isFeatured: true,
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
  { id: 'health', label: 'Health', icon: 'Heart', active: false, enabled: false },
  { id: 'wallet', label: 'Wallet', icon: 'Wallet', active: false, enabled: false },
  { id: 'black', label: 'Black', icon: 'Car', active: false, enabled: false },
  { id: 'profil', label: 'Profil', icon: 'User', active: false, enabled: false },
];

export const systemConfig = {
  appName: 'ACTOOS ONE',
  slogan: 'Commande. Paye. Vis.',
  defaultAddress: 'Abidjan, Cocody',
  currency: 'FCFA',
  featureFlags: {
    eats: true,
    health: false,
    wallet: false,
    black: false,
  },
};
