/**
 * ACTOOS ONE - Analytics Service
 * 
 * Récupération des statistiques partenaires depuis Supabase.
 * PRODUCTION MODE
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Récupérer les analytics en temps réel d'un partenaire
 */
export async function getPartnerAnalyticsLive(partnerId, startDate = null, endDate = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  // Par défaut: 30 derniers jours
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const { data, error } = await supabase.rpc('get_partner_analytics_live', {
      p_partner_id: partnerId,
      p_start_date: start,
      p_end_date: end
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur getPartnerAnalyticsLive:', error);
    // Fallback: calcul manuel
    return await calculateAnalyticsManually(partnerId, start, end);
  }
}

/**
 * Calcul manuel des analytics si la fonction RPC n'existe pas
 */
async function calculateAnalyticsManually(partnerId, startDate, endDate) {
  try {
    // Récupérer les commandes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at')
      .eq('partner_id', partnerId)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    if (ordersError) throw ordersError;

    // Récupérer les ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('restaurant_rating, order_id')
      .in('order_id', orders.map(o => o.id))
      .not('restaurant_rating', 'is', null);

    // Calculer les stats
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    const avgRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.restaurant_rating, 0) / ratings.length
      : 0;

    // Grouper par jour
    const revenueByDay = {};
    deliveredOrders.forEach(o => {
      const day = o.created_at.split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + (o.total_amount || 0);
    });

    // Grouper par statut
    const ordersByStatus = {};
    orders.forEach(o => {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
    });

    return {
      data: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_order_value: totalOrders > 0 ? Math.round(totalRevenue / deliveredOrders.length) : 0,
        avg_rating: Math.round(avgRating * 100) / 100,
        total_ratings: ratings?.length || 0,
        cancellation_rate: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100 * 100) / 100 : 0,
        orders_by_status: ordersByStatus,
        revenue_by_day: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue }))
      },
      error: null
    };
  } catch (error) {
    console.error('Erreur calculateAnalyticsManually:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les top produits d'un partenaire
 */
export async function getTopProducts(partnerId, limit = 10) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        name,
        quantity,
        unit_price,
        orders!inner(partner_id, status)
      `)
      .eq('orders.partner_id', partnerId)
      .eq('orders.status', 'delivered');

    if (error) throw error;

    // Agréger par produit
    const productStats = {};
    data?.forEach(item => {
      if (!productStats[item.name]) {
        productStats[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      }
      productStats[item.name].quantity += item.quantity;
      productStats[item.name].revenue += item.quantity * item.unit_price;
    });

    // Trier par quantité et limiter
    const sorted = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return { data: sorted, error: null };
  } catch (error) {
    console.error('Erreur getTopProducts:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer les heures de pointe
 */
export async function getPeakHours(partnerId) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at')
      .eq('partner_id', partnerId)
      .eq('status', 'delivered');

    if (error) throw error;

    // Grouper par heure
    const hourStats = {};
    data?.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
      hourStats[hourLabel] = (hourStats[hourLabel] || 0) + 1;
    });

    // Convertir en array et trier par nombre de commandes
    const sorted = Object.entries(hourStats)
      .map(([hour, orders]) => ({ hour, orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    return { data: sorted, error: null };
  } catch (error) {
    console.error('Erreur getPeakHours:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer les stats promotions d'un partenaire
 */
export async function getPromoStats(partnerId) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data: promos, error: promosError } = await supabase
      .from('promo_codes')
      .select('id, code, description, discount_type, discount_value, usage_count')
      .eq('partner_id', partnerId)
      .eq('is_active', true);

    if (promosError) throw promosError;

    // Pour chaque promo, calculer les revenus générés
    const promoStats = await Promise.all((promos || []).map(async (promo) => {
      const { data: usage } = await supabase
        .from('promo_usage')
        .select('order_id, discount_applied')
        .eq('promo_code_id', promo.id);

      const totalRevenue = (usage || []).reduce((sum, u) => sum + (u.discount_applied || 0), 0);

      return {
        code: promo.code,
        title: promo.description,
        usages: promo.usage_count || 0,
        revenue: totalRevenue,
        conversionRate: 0, // Nécessite plus de données pour calculer
      };
    }));

    return { data: promoStats, error: null };
  } catch (error) {
    console.error('Erreur getPromoStats:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer les données analytics quotidiennes
 */
export async function getDailyAnalytics(partnerId, days = 7) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, created_at, status')
      .eq('partner_id', partnerId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Grouper par jour
    const dailyStats = {};
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 0; i < days; i++) {
      const date = new Date(endDate.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = {
        day: dayNames[date.getDay()],
        date: dateStr,
        orders: 0,
        revenue: 0
      };
    }

    data?.forEach(order => {
      const dateStr = order.created_at.split('T')[0];
      if (dailyStats[dateStr] && order.status === 'delivered') {
        dailyStats[dateStr].orders += 1;
        dailyStats[dateStr].revenue += order.total_amount || 0;
      }
    });

    return { data: Object.values(dailyStats), error: null };
  } catch (error) {
    console.error('Erreur getDailyAnalytics:', error);
    return { data: [], error };
  }
}

export default {
  getPartnerAnalyticsLive,
  getTopProducts,
  getPeakHours,
  getPromoStats,
  getDailyAnalytics
};
