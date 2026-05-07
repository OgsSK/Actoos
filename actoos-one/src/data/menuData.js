// Mock data pour les menus des restaurants
// Données simulées pour Mission 3

export const restaurantMenus = {
  'rest-001': {
    id: 'rest-001',
    name: 'Maquis Chez Tanti',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    cuisine: 'Africain',
    rating: 4.8,
    deliveryTime: '25-35 min',
    deliveryFee: 500,
    categories: [
      {
        id: 'cat-plats',
        name: 'Plats principaux',
        items: [
          {
            id: 'item-001',
            name: 'Poulet Braisé',
            description: 'Poulet mariné grillé au feu de bois, servi avec alloco et attiéké',
            price: 3500,
            image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 5,
          },
          {
            id: 'item-002',
            name: 'Riz au Gras',
            description: 'Riz cuit dans une sauce tomate épicée avec viande de bœuf',
            price: 2500,
            image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 10,
          },
          {
            id: 'item-003',
            name: 'Tiep Bou Dien',
            description: 'Riz au poisson sénégalais avec légumes',
            price: 4000,
            image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop',
            is_available: false,
            max_per_order: 5,
          },
          {
            id: 'item-004',
            name: 'Sauce Arachide',
            description: 'Sauce onctueuse aux arachides avec poulet, servi avec riz ou foutou',
            price: 3000,
            image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 5,
          },
        ],
      },
      {
        id: 'cat-accomp',
        name: 'Accompagnements',
        items: [
          {
            id: 'item-005',
            name: 'Alloco',
            description: 'Bananes plantains frites dorées',
            price: 500,
            image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 10,
          },
          {
            id: 'item-006',
            name: 'Attiéké',
            description: 'Semoule de manioc traditionnelle',
            price: 300,
            image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 10,
          },
        ],
      },
      {
        id: 'cat-boissons',
        name: 'Boissons',
        items: [
          {
            id: 'item-007',
            name: 'Bissap',
            description: 'Jus d\'hibiscus frais maison',
            price: 500,
            image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 10,
          },
          {
            id: 'item-008',
            name: 'Gingembre',
            description: 'Jus de gingembre frais pimenté',
            price: 500,
            image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=300&h=200&fit=crop',
            is_available: false,
            max_per_order: 10,
          },
        ],
      },
    ],
  },
  'rest-003': {
    id: 'rest-003',
    name: 'Fast Food Bamako',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    cuisine: 'Burgers',
    rating: 4.2,
    deliveryTime: '15-25 min',
    deliveryFee: 500,
    categories: [
      {
        id: 'cat-burgers',
        name: 'Burgers',
        items: [
          {
            id: 'item-101',
            name: 'Classic Burger',
            description: 'Steak haché, salade, tomate, oignon, sauce maison',
            price: 2500,
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 5,
          },
          {
            id: 'item-102',
            name: 'Cheese Burger',
            description: 'Steak haché, double cheddar, sauce burger',
            price: 3000,
            image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 5,
          },
        ],
      },
      {
        id: 'cat-sides',
        name: 'Accompagnements',
        items: [
          {
            id: 'item-103',
            name: 'Frites',
            description: 'Frites croustillantes maison',
            price: 800,
            image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop',
            is_available: true,
            max_per_order: 10,
          },
        ],
      },
    ],
  },
};

// Fonction pour récupérer le menu d'un restaurant
export function getRestaurantMenu(restaurantId) {
  return restaurantMenus[restaurantId] || null;
}
