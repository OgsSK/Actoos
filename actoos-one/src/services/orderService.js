// Service Commande - Structure prête pour Supabase
// Pour l'instant mocké, sera connecté au backend plus tard

import { systemConfig } from '../data/mockData';

// Calculer le total côté "serveur" (en production: Supabase Edge Function)
export function calculateOrderTotal(cartItems, deliveryFee) {
  // Recalculer les montants côté serveur (ne jamais faire confiance au client)
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + item.price_at_time * item.quantity;
  }, 0);
  
  const total = subtotal + deliveryFee;
  
  return {
    subtotal,
    deliveryFee,
    total,
    currency: systemConfig.currency,
  };
}

// Créer une commande
export async function createOrder(orderData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Générer un code de livraison (4 chiffres)
      const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Générer un ID de commande
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const order = {
        id: orderId,
        ...orderData,
        delivery_code: deliveryCode,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      console.log('📦 Nouvelle commande créée:', order);

      resolve({
        success: true,
        order,
        message: 'Commande créée avec succès',
      });
    }, 1500);
  });
}

// Obtenir le statut d'une commande
export async function getOrderStatus(orderId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        status: 'pending',
        message: 'En attente de confirmation du restaurant',
      });
    }, 500);
  });
}
