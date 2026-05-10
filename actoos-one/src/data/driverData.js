// Mock data pour Driver App et Admin Dashboard

// Livreurs mockés
export const mockDrivers = [
  {
    id: 'drv-001',
    name: 'Moussa Diallo',
    phone: '+223 76 45 12 89',
    vehicle_type: 'moto',
    is_online: true,
    current_order_id: 'ORD-001',
    location: { lat: 12.6392, lng: -8.0029 },
    rating: 4.8,
    total_deliveries: 127,
  },
  {
    id: 'drv-002',
    name: 'Aminata Traoré',
    phone: '+223 70 23 56 78',
    vehicle_type: 'moto',
    is_online: true,
    current_order_id: null,
    location: { lat: 12.6450, lng: -7.9950 },
    rating: 4.9,
    total_deliveries: 89,
  },
  {
    id: 'drv-003',
    name: 'Ibrahim Coulibaly',
    phone: '+223 66 78 90 12',
    vehicle_type: 'voiture',
    is_online: false,
    current_order_id: null,
    location: { lat: 12.6300, lng: -8.0100 },
    rating: 4.6,
    total_deliveries: 234,
  },
  {
    id: 'drv-004',
    name: 'Fatou Keita',
    phone: '+223 79 11 22 33',
    vehicle_type: 'moto',
    is_online: true,
    current_order_id: 'ORD-003',
    location: { lat: 12.6500, lng: -8.0200 },
    rating: 4.7,
    total_deliveries: 56,
  },
];

// Commandes bloquées (sans livreur assigné)
export const mockBlockedOrders = [
  {
    id: 'ORD-BLK-001',
    orderNumber: '#1250',
    restaurant_name: 'Maquis Chez Tanti',
    restaurant_address: 'Hamdallaye ACI, Bamako',
    client_name: 'Sekou B.',
    client_address: 'Badalabougou, Rue 412',
    client_phone: '+223 70 XX XX 45',
    total_amount: 5500,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min ago
    status: 'ready', // Prête mais pas de livreur
    delivery_code: '7823',
  },
  {
    id: 'ORD-BLK-002',
    orderNumber: '#1251',
    restaurant_name: 'Le Diplomate',
    restaurant_address: 'ACI 2000, Bamako',
    client_name: 'Mariam D.',
    client_address: 'Magnambougou, près du marché',
    client_phone: '+223 66 XX XX 89',
    total_amount: 12000,
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 min ago
    status: 'ready',
    delivery_code: '4156',
  },
  {
    id: 'ORD-BLK-003',
    orderNumber: '#1252',
    restaurant_name: 'Fast Food Bamako',
    restaurant_address: 'Kalaban Coura, Bamako',
    client_name: 'Oumar T.',
    client_address: 'Sotuba ACI, Villa 23',
    client_phone: '+223 79 XX XX 12',
    total_amount: 3500,
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 min ago - URGENT
    status: 'ready',
    delivery_code: '9034',
  },
];

// Demandes d'onboarding en attente
export const mockOnboardingRequests = [
  {
    id: 'ONB-001',
    type: 'driver',
    name: 'Abdoulaye Sanogo',
    phone: '+223 76 99 88 77',
    email: 'a.sanogo@email.com',
    vehicle_type: 'moto',
    submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'pending',
    documents: ['CNI', 'Permis', 'Carte grise'],
  },
  {
    id: 'ONB-002',
    type: 'partner',
    name: 'Restaurant Le Sahel',
    phone: '+223 70 11 22 33',
    email: 'lesahel@email.com',
    address: 'Hamdallaye, Bamako',
    submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: 'pending',
    documents: ['RCCM', 'NIF', 'Photos restaurant'],
  },
  {
    id: 'ONB-003',
    type: 'driver',
    name: 'Kadiatou Diarra',
    phone: '+223 66 55 44 33',
    email: 'k.diarra@email.com',
    vehicle_type: 'vélo',
    submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    status: 'pending',
    documents: ['CNI'],
  },
  {
    id: 'ONB-004',
    type: 'partner',
    name: 'Café Toukouleur',
    phone: '+223 79 22 33 44',
    email: 'toukouleur@email.com',
    address: 'ACI 2000, Bamako',
    submitted_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    status: 'pending',
    documents: ['RCCM', 'NIF'],
  },
];

// Mission courante du livreur (mock)
export const mockCurrentMission = {
  id: 'ORD-001',
  orderNumber: '#1247',
  status: 'picked_up', // pending, picked_up, delivering
  payment_method: 'cash', // 'cash' ou 'mobile_money' - Cash pour démo Zero-Loss
  
  // Point A - Restaurant
  pickup: {
    name: 'Maquis Chez Tanti',
    address: 'Hamdallaye ACI, Bamako',
    phone: '+223 20 22 33 44',
    coordinates: { lat: 12.6392, lng: -8.0029 },
  },
  
  // Point B - Client
  dropoff: {
    name: 'Amadou T.',
    address: 'Badalabougou, Rue 310, Porte 15',
    phone: '+223 70 XX XX 56',
    coordinates: { lat: 12.6250, lng: -7.9850 },
    delivery_code: '#A42', // Code Handshake format #A42
  },
  
  items_summary: '2x Poulet Braisé, 2x Alloco',
  total_amount: 8000,
  delivery_fee: 500,
  estimated_time: '12 min',
  created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
};
