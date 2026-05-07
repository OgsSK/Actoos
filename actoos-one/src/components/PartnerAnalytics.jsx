import { useState, useMemo } from 'react';
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
  Percent
} from 'lucide-react';

// Mock analytics data - En production, viendra de Supabase
const generateMockAnalytics = (partnerId) => {
  // Données des 7 derniers jours
  const dailyData = [
    { day: 'Lun', orders: 8, revenue: 24000, date: '2025-05-05' },
    { day: 'Mar', orders: 12, revenue: 36500, date: '2025-05-06' },
    { day: 'Mer', orders: 6, revenue: 18000, date: '2025-05-07' },
    { day: 'Jeu', orders: 15, revenue: 45000, date: '2025-05-08' },
    { day: 'Ven', orders: 22, revenue: 68000, date: '2025-05-09' },
    { day: 'Sam', orders: 28, revenue: 85000, date: '2025-05-10' },
    { day: 'Dim', orders: 18, revenue: 54000, date: '2025-05-11' },
  ];

  const today = dailyData[dailyData.length - 1];
  const weekTotal = dailyData.reduce((sum, d) => sum + d.revenue, 0);
  const weekOrders = dailyData.reduce((sum, d) => sum + d.orders, 0);

  return {
    today: {
      revenue: today.revenue,
      orders: today.orders,
      avgBasket: Math.round(today.revenue / today.orders),
      rating: 4.8,
    },
    week: {
      revenue: weekTotal,
      orders: weekOrders,
      avgBasket: Math.round(weekTotal / weekOrders),
      promoUsages: 23,
    },
    month: {
      revenue: 340000,
      orders: 128,
      avgBasket: 2656,
      growth: 12, // +12% vs mois précédent
    },
    dailyData,
    promoPerformance: [
      { 
        code: 'TANTI15', 
        title: '-15% sur tout', 
        usages: 23, 
        revenue: 45000,
        conversionRate: 68,
      },
      { 
        code: 'LIVRAISON', 
        title: 'Livraison offerte', 
        usages: 8, 
        revenue: 18000,
        conversionRate: 42,
      },
    ],
    topProducts: [
      { name: 'Riz au Gras', quantity: 42, revenue: 105000 },
      { name: 'Poulet braisé', quantity: 38, revenue: 114000 },
      { name: 'Alloco', quantity: 35, revenue: 17500 },
      { name: 'Attiéké poisson', quantity: 28, revenue: 98000 },
      { name: 'Jus de bissap', quantity: 45, revenue: 22500 },
    ],
    peakHours: [
      { hour: '12:00', orders: 15 },
      { hour: '13:00', orders: 22 },
      { hour: '19:00', orders: 28 },
      { hour: '20:00', orders: 35 },
      { hour: '21:00', orders: 18 },
    ],
    customerStats: {
      newCustomers: 24,
      returningCustomers: 104,
      avgOrdersPerCustomer: 2.3,
    },
  };
};

export function PartnerAnalytics({ partnerId, partnerName }) {
  const [period, setPeriod] = useState('week'); // today, week, month
  const analytics = useMemo(() => generateMockAnalytics(partnerId), [partnerId]);

  const maxRevenue = Math.max(...analytics.dailyData.map(d => d.revenue));

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
          value={`${analytics[period].revenue.toLocaleString()}`}
          unit="FCFA"
          trend={period === 'month' ? analytics.month.growth : null}
          color="orange"
        />
        <KPICard
          icon={Package}
          label="Commandes"
          value={analytics[period].orders}
          trend={period === 'month' ? 8 : null}
          color="blue"
        />
        <KPICard
          icon={ShoppingBag}
          label="Panier moyen"
          value={`${analytics[period].avgBasket.toLocaleString()}`}
          unit="FCFA"
          color="green"
        />
        <KPICard
          icon={period === 'today' ? Star : Tag}
          label={period === 'today' ? 'Note moyenne' : 'Promos utilisées'}
          value={period === 'today' ? analytics.today.rating : analytics[period].promoUsages || '-'}
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
            Total: {analytics.week.revenue.toLocaleString()} FCFA
          </span>
        </div>
        
        {/* Simple Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-32">
          {analytics.dailyData.map((day, index) => (
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

      {/* Promo Performance */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-[#FF5A00]" />
          Performance des promotions
        </h3>
        
        {analytics.promoPerformance.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucune promotion active
          </p>
        ) : (
          <div className="space-y-3">
            {analytics.promoPerformance.map((promo, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-xl flex items-center justify-center">
                    <Percent className="w-5 h-5 text-[#FF5A00]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{promo.code}</p>
                    <p className="text-xs text-gray-500">{promo.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{promo.usages} utilisations</p>
                  <p className="text-xs text-green-600">+{promo.revenue.toLocaleString()} FCFA</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-[#FF5A00]" />
          Top 5 Produits
        </h3>
        
        <div className="space-y-3">
          {analytics.topProducts.map((product, index) => (
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
                    style={{ width: `${(product.quantity / analytics.topProducts[0].quantity) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#FF5A00]" />
          Heures de pointe
        </h3>
        
        <div className="flex items-end justify-between gap-2 h-20">
          {analytics.peakHours.map((hour, index) => {
            const maxOrders = Math.max(...analytics.peakHours.map(h => h.orders));
            const heightPercent = (hour.orders / maxOrders) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{hour.orders}</span>
                <div 
                  className="w-full bg-blue-500 rounded-t-lg"
                  style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                />
                <span className="text-xs text-gray-500">{hour.hour.split(':')[0]}h</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Pic à 20h00 avec 35 commandes
        </p>
      </div>

      {/* Customer Stats */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#FF5A00]" />
          Clients
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{analytics.customerStats.newCustomers}</p>
            <p className="text-xs text-gray-600">Nouveaux</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">{analytics.customerStats.returningCustomers}</p>
            <p className="text-xs text-gray-600">Fidèles</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <p className="text-2xl font-bold text-purple-600">{analytics.customerStats.avgOrdersPerCustomer}</p>
            <p className="text-xs text-gray-600">Cmd/client</p>
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
