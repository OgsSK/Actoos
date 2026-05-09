import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Package, 
  Wallet,
  Star,
  Tag,
  ShoppingBag,
  Calendar,
  ChevronRight,
  BarChart3,
  PieChart,
  Clock,
  Users,
  Percent,
  Loader2
} from 'lucide-react';
import { 
  getPartnerAnalyticsLive, 
  getTopProducts, 
  getPeakHours, 
  getDailyAnalytics 
} from '../services/analyticsService';

export function PartnerAnalytics({ partnerId, partnerName }) {
  const [period, setPeriod] = useState('week'); // today, week, month
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [peakHours, setPeakHours] = useState([]);

  // Charger les données depuis Supabase
  useEffect(() => {
    async function loadAnalytics() {
      if (!partnerId) return;
      
      setLoading(true);
      try {
        // Charger toutes les données en parallèle
        const [analyticsRes, dailyRes, productsRes, peakRes] = await Promise.all([
          getPartnerAnalyticsLive(partnerId),
          getDailyAnalytics(partnerId, 7),
          getTopProducts(partnerId, 5),
          getPeakHours(partnerId)
        ]);

        if (analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
        if (dailyRes.data) {
          setDailyData(dailyRes.data);
        }
        if (productsRes.data) {
          setTopProducts(productsRes.data);
        }
        if (peakRes.data) {
          setPeakHours(peakRes.data);
        }
      } catch (error) {
        console.error('Erreur chargement analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [partnerId]);

  // Calculer les stats dérivées
  const weekTotal = dailyData.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const weekOrders = dailyData.reduce((sum, d) => sum + (d.orders || 0), 0);
  const today = dailyData.length > 0 ? dailyData[dailyData.length - 1] : { revenue: 0, orders: 0 };
  const maxRevenue = Math.max(...dailyData.map(d => d.revenue || 0), 1);

  // Données formatées pour l'affichage
  const displayData = {
    today: {
      revenue: today.revenue || 0,
      orders: today.orders || 0,
      avgBasket: today.orders > 0 ? Math.round(today.revenue / today.orders) : 0,
      rating: analytics?.avg_rating || 0,
    },
    week: {
      revenue: weekTotal,
      orders: weekOrders,
      avgBasket: weekOrders > 0 ? Math.round(weekTotal / weekOrders) : 0,
      promoUsages: 0, // TODO: ajouter quand promo stats disponible
    },
    month: {
      revenue: analytics?.total_revenue || 0,
      orders: analytics?.total_orders || 0,
      avgBasket: analytics?.avg_order_value || 0,
      growth: 0, // TODO: calculer croissance vs mois précédent
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-500">{partnerName}</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[
            { key: 'today', label: "Aujourd'hui" },
            { key: 'week', label: 'Semaine' },
            { key: 'month', label: 'Mois' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-white text-[#FF5A00] shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          icon={Wallet}
          label="Chiffre d'affaires"
          value={`${displayData[period].revenue.toLocaleString()}`}
          unit="FCFA"
          trend={period === 'month' ? displayData.month.growth : null}
          color="orange"
        />
        <KPICard
          icon={Package}
          label="Commandes"
          value={displayData[period].orders}
          trend={period === 'month' ? 8 : null}
          color="blue"
        />
        <KPICard
          icon={ShoppingBag}
          label="Panier moyen"
          value={`${displayData[period].avgBasket.toLocaleString()}`}
          unit="FCFA"
          color="green"
        />
        <KPICard
          icon={period === 'today' ? Star : Tag}
          label={period === 'today' ? 'Note moyenne' : 'Promos utilisées'}
          value={period === 'today' ? displayData.today.rating : displayData[period].promoUsages || '-'}
          unit={period === 'today' ? '/5' : ''}
          color="purple"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#FF5A00]" />
            Ventes des 7 derniers jours
          </h3>
          <span className="text-sm text-gray-500">
            Total: {weekTotal.toLocaleString()} FCFA
          </span>
        </div>
        
        {/* Simple Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-32">
          {dailyData.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-[#FF5A00]/20 rounded-t-lg relative overflow-hidden"
                style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: '8px' }}
              >
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-[#FF5A00] rounded-t-lg transition-all"
                  style={{ height: '100%' }}
                />
              </div>
              <span className="text-xs text-gray-500">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Promo Performance - TODO: Connect when promo stats available */}
      {/* Temporairement masqué jusqu'à ce que les données soient disponibles
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-[#FF5A00]" />
          Performance des promotions
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">
          Bientôt disponible
        </p>
      </div>
      */}

      {/* Top Products */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-[#FF5A00]" />
          Top 5 Produits
        </h3>
        
        {topProducts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucune donnée disponible
          </p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div 
                key={index}
                className="flex items-center gap-3"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.quantity} vendus</p>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FF5A00] rounded-full"
                      style={{ width: `${topProducts[0]?.quantity ? (product.quantity / topProducts[0].quantity) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#FF5A00]" />
          Heures de pointe
        </h3>
        
        {peakHours.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucune donnée disponible
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-2 h-20">
              {peakHours.map((hour, index) => {
                const maxOrders = Math.max(...peakHours.map(h => h.orders), 1);
                const heightPercent = (hour.orders / maxOrders) * 100;
              
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{hour.orders}</span>
                    <div 
                      className="w-full bg-blue-500 rounded-t-lg"
                      style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                    />
                    <span className="text-xs text-gray-500">{hour.hour?.split(':')[0] || hour.hour}h</span>
                  </div>
                );
              })}
            </div>
            {peakHours[0] && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Pic à {peakHours[0].hour} avec {peakHours[0].orders} commandes
              </p>
            )}
          </>
        )}
      </div>

      {/* Customer Stats - Données réelles du nombre de commandes */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#FF5A00]" />
          Statistiques
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{analytics?.total_ratings || 0}</p>
            <p className="text-xs text-gray-600">Avis</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">{analytics?.avg_rating || 0}</p>
            <p className="text-xs text-gray-600">Note moy.</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <p className="text-2xl font-bold text-purple-600">{analytics?.cancellation_rate || 0}%</p>
            <p className="text-xs text-gray-600">Annulations</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-[#FF5A00] to-[#FF8C00] rounded-2xl p-4 text-white">
        <h3 className="font-semibold mb-3">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 py-3 bg-white/20 rounded-xl text-sm font-medium">
            <Tag className="w-4 h-4" />
            Créer une promo
          </button>
          <button className="flex items-center justify-center gap-2 py-3 bg-white/20 rounded-xl text-sm font-medium">
            <Calendar className="w-4 h-4" />
            Voir historique
          </button>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ icon: Icon, label, value, unit, trend, color }) {
  const colorClasses = {
    orange: 'bg-[#FF5A00]/10 text-[#FF5A00]',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500 mb-0.5">{unit}</span>}
      </div>
      {trend !== null && trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${
          trend >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend >= 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{trend >= 0 ? '+' : ''}{trend}% vs période préc.</span>
        </div>
      )}
    </div>
  );
}
