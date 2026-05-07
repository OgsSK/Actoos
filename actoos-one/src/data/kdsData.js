// Mock data pour les commandes KDS
// Données simulées pour le Kitchen Display System

export const mockOrders = [
  {
    id: 'ORD-001',
    orderNumber: '#1247',
    clientName: 'Amadou T.',
    clientPhone: '+223 70 XX XX 56',
    status: 'pending',
    payment_method: 'mobile_money',
    delivery_mode: 'delivery', // 'delivery' ou 'pickup'
    delivery_code: '#A42', // Code Handshake
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    items: [
      {
        id: 'item-001',
        name: 'Poulet Braisé',
        quantity: 2,
        price_at_time: 3500,
        special_instructions: 'Sans piment, bien cuit',
      },
      {
        id: 'item-005',
        name: 'Alloco',
        quantity: 2,
        price_at_time: 500,
        special_instructions: null,
      },
    ],
    total_amount: 8000,
    delivery_fee: 500,
  },
  {
    id: 'ORD-002',
    orderNumber: '#1248',
    clientName: 'Fatou K.',
    clientPhone: '+223 76 XX XX 12',
    status: 'pending',
    payment_method: 'cash',
    delivery_mode: 'pickup', // À emporter
    delivery_code: '#B17',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    items: [
      {
        id: 'item-002',
        name: 'Riz au Gras',
        quantity: 1,
        price_at_time: 2500,
        special_instructions: null,
      },
      {
        id: 'item-007',
        name: 'Bissap',
        quantity: 2,
        price_at_time: 500,
        special_instructions: null,
      },
    ],
    total_amount: 3500,
    delivery_fee: 0,
  },
  {
    id: 'ORD-003',
    orderNumber: '#1249',
    clientName: 'Ibrahim D.',
    clientPhone: '+223 66 XX XX 89',
    status: 'preparing',
    payment_method: 'mobile_money',
    delivery_mode: 'delivery',
    delivery_code: '#C89',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 min ago
    items: [
      {
        id: 'item-004',
        name: 'Sauce Arachide',
        quantity: 3,
        price_at_time: 3000,
        special_instructions: 'Extra sauce, portion généreuse',
      },
      {
        id: 'item-006',
        name: 'Attiéké',
        quantity: 3,
        price_at_time: 300,
        special_instructions: null,
      },
    ],
    total_amount: 9900,
    delivery_fee: 500,
  },
  {
    id: 'ORD-004',
    orderNumber: '#1250',
    clientName: 'Mariam S.',
    clientPhone: '+223 79 XX XX 34',
    status: 'ready',
    payment_method: 'mobile_money',
    delivery_mode: 'pickup',
    delivery_code: '#D56',
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min ago
    items: [
      {
        id: 'item-001',
        name: 'Poulet Braisé',
        quantity: 1,
        price_at_time: 3500,
        special_instructions: null,
      },
    ],
    total_amount: 3500,
    delivery_fee: 0,
  },
];

export const mockMenuItems = [
  {
    id: 'item-001',
    name: 'Poulet Braisé',
    price: 3500,
    is_available: true,
    max_per_order: 5,
    category: 'Plats principaux',
  },
  {
    id: 'item-002',
    name: 'Riz au Gras',
    price: 2500,
    is_available: true,
    max_per_order: 10,
    category: 'Plats principaux',
  },
  {
    id: 'item-003',
    name: 'Tiep Bou Dien',
    price: 4000,
    is_available: false,
    max_per_order: 5,
    category: 'Plats principaux',
  },
  {
    id: 'item-004',
    name: 'Sauce Arachide',
    price: 3000,
    is_available: true,
    max_per_order: 5,
    category: 'Plats principaux',
  },
  {
    id: 'item-005',
    name: 'Alloco',
    price: 500,
    is_available: true,
    max_per_order: 10,
    category: 'Accompagnements',
  },
  {
    id: 'item-006',
    name: 'Attiéké',
    price: 300,
    is_available: true,
    max_per_order: 10,
    category: 'Accompagnements',
  },
  {
    id: 'item-007',
    name: 'Bissap',
    price: 500,
    is_available: true,
    max_per_order: 10,
    category: 'Boissons',
  },
  {
    id: 'item-008',
    name: 'Gingembre',
    price: 500,
    is_available: false,
    max_per_order: 10,
    category: 'Boissons',
  },
];
