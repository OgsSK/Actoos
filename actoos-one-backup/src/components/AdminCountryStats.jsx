/**
 * ACTOOS ONE - Admin Stats Multi-Pays
 * 
 * Composant affichant les statistiques par pays avec graphiques.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  TrendingUp, 
  Users, 
  Store, 
  Bike, 
  Package,
  DollarSign,
  MapPin,
  ChevronRight,
  Loader2,
  BarChart3,
  PieChart
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { COUNTRIES, getCountryByCode } from '../config/countriesConfig';

export function AdminCountryStats({ onSelectCountry }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('ALL'); // 'ALL' or country code
  const [error, setError] = useState(null);

  // Charger les stats depuis Supabase
  useEffect(() => {
    async function loadStats() {
      if (!isSupabaseConfigured()) {
        setError('Supabase non configuré');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Charger les partenaires (sans country_code si colonne n'existe pas)
        const { data: partners, error: partnersError } = await supabase
          .from('partners')
          .select('id, city, is_active')
          .eq('is_active', true);

        if (partnersError) throw partnersError;

        // Charger les livreurs (peuvent ne pas avoir country_code)
        let drivers = [];
        try {
          const { data, error } = await supabase
            .from('drivers')
            .select('id, city, is_active, is_online');
          if (!error) drivers = data || [];
        } catch (e) {
          console.warn('Erreur chargement drivers:', e);
        }

        // Charger les commandes
        let orders = [];
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('id, total_amount, status, created_at');
          if (!error) orders = data || [];
        } catch (e) {
          console.warn('Erreur chargement orders:', e);
        }

        // Charger les utilisateurs
        let users = [];
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, role, is_active');
          if (!error) users = data || [];
        } catch (e) {
          console.warn('Erreur chargement users:', e);
        }

        // Calculer les stats par pays
        const countryStats = {};
        
        // Initialiser avec les pays connus
        COUNTRIES.forEach(c => {
          countryStats[c.code] = {
            code: c.code,
            name: c.name,
            flag: c.flag,
            partners: 0,
            drivers: 0,
            driversOnline: 0,
            orders: 0,
            revenue: 0,
            users: 0,
          };
        });

        // Calculer les stats partenaires (utiliser city pour détecter le pays)
        (partners || []).forEach(p => {
          const code = detectCountryFromCity(p.city);
          if (countryStats[code]) {
            countryStats[code].partners++;
          }
        });

        // Calculer les stats livreurs
        (drivers || []).forEach(d => {
          const code = detectCountryFromCity(d.city);
          if (countryStats[code]) {
            countryStats[code].drivers++;
            if (d.is_online) countryStats[code].driversOnline++;
          }
        });

        // Calculer les stats commandes (toutes au Mali par défaut)
        (orders || []).forEach(o => {
          const code = 'ML'; // Default Mali car pas de country_code
          if (countryStats[code]) {
            countryStats[code].orders++;
            countryStats[code].revenue += o.total_amount || 0;
          }
        });

        // Calculer les stats utilisateurs
        (users || []).forEach(u => {
          const code = 'ML'; // Default Mali
          if (countryStats[code] && u.role === 'client') {
            countryStats[code].users++;
          }
        });

        // Calculer les totaux
        const totalStats = {
          code: 'ALL',
          name: 'Tous les pays',
          flag: '🌍',
          partners: Object.values(countryStats).reduce((sum, c) => sum + c.partners, 0),
          drivers: Object.values(countryStats).reduce((sum, c) => sum + c.drivers, 0),
          driversOnline: Object.values(countryStats).reduce((sum, c) => sum + c.driversOnline, 0),
          orders: Object.values(countryStats).reduce((sum, c) => sum + c.orders, 0),
          revenue: Object.values(countryStats).reduce((sum, c) => sum + c.revenue, 0),
          users: Object.values(countryStats).reduce((sum, c) => sum + c.users, 0),
        };

        setStats({
          total: totalStats,
          byCountry: countryStats,
        });

      } catch (err) {
        console.error('Erreur chargement stats:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  // Détecter le pays à partir de la ville
  function detectCountryFromCity(city) {
    if (!city) return 'ML';
    const cityLower = city.toLowerCase();
    if (cityLower.includes('bamako') || cityLower.includes('sikasso') || cityLower.includes('segou')) return 'ML';
    if (cityLower.includes('dakar') || cityLower.includes('thies') || cityLower.includes('saint-louis')) return 'SN';
    if (cityLower.includes('abidjan') || cityLower.includes('bouake') || cityLower.includes('yamoussoukro')) return 'CI';
    if (cityLower.includes('ouagadougou') || cityLower.includes('bobo')) return 'BF';
    if (cityLower.includes('conakry')) return 'GN';
    if (cityLower.includes('niamey')) return 'NE';
    if (cityLower.includes('lome')) return 'TG';
    if (cityLower.includes('cotonou') || cityLower.includes('porto-novo')) return 'BJ';
    return 'ML';
  }

  // Formatter le montant
  function formatAmount(amount) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
  }

  // Stats du pays sélectionné
  const currentStats = useMemo(() => {
    if (!stats) return null;
    if (selectedCountry === 'ALL') return stats.total;
    return stats.byCountry[selectedCountry] || stats.total;
  }, [stats, selectedCountry]);

  // Pays avec activité (au moins 1 partenaire ou commande)
  const activeCountries = useMemo(() => {
    if (!stats) return [];
    return Object.values(stats.byCountry)
      .filter(c => c.partners > 0 || c.orders > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCountry('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            selectedCountry === 'ALL'
              ? 'bg-[#FF5A00] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Globe size={18} />
          <span className="font-medium">Tous</span>
        </button>
        
        {activeCountries.map(country => (
          <button
            key={country.code}
            onClick={() => setSelectedCountry(country.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              selectedCountry === country.code
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-lg">{country.flag}</span>
            <span className="font-medium">{country.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selectedCountry === country.code ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {country.partners}
            </span>
          </button>
        ))}
        
        {/* Pays sans activité */}
        {COUNTRIES.filter(c => !activeCountries.find(ac => ac.code === c.code)).slice(0, 3).map(country => (
          <button
            key={country.code}
            onClick={() => setSelectedCountry(country.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all opacity-50 ${
              selectedCountry === country.code
                ? 'bg-[#FF5A00] text-white opacity-100'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-lg">{country.flag}</span>
            <span className="font-medium">{country.name}</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">0</span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {currentStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<Store className="w-5 h-5" />}
            label="Restaurants"
            value={currentStats.partners}
            color="orange"
          />
          <StatCard
            icon={<Bike className="w-5 h-5" />}
            label="Livreurs"
            value={currentStats.drivers}
            subValue={`${currentStats.driversOnline} en ligne`}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Clients"
            value={currentStats.users}
            color="purple"
          />
          <StatCard
            icon={<Package className="w-5 h-5" />}
            label="Commandes"
            value={currentStats.orders}
            color="green"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="CA Total"
            value={formatAmount(currentStats.revenue)}
            isAmount
            color="emerald"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Panier Moyen"
            value={currentStats.orders > 0 
              ? formatAmount(currentStats.revenue / currentStats.orders) 
              : '0 FCFA'}
            isAmount
            color="teal"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Country Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-[#FF5A00]" />
            Chiffre d'Affaires par Pays
          </h3>
          <div className="space-y-3">
            {activeCountries.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune donnée</p>
            ) : (
              activeCountries.map((country, index) => {
                const maxRevenue = Math.max(...activeCountries.map(c => c.revenue));
                const percentage = maxRevenue > 0 ? (country.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={country.code} className="flex items-center gap-3">
                    <span className="text-xl w-8">{country.flag}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{country.name}</span>
                        <span className="text-sm text-gray-900 font-semibold">
                          {formatAmount(country.revenue)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#FF5A00] to-orange-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-[#FF5A00]" />
            Répartition Partenaires
          </h3>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-48 h-48">
              {/* Simple pie chart visualization */}
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {activeCountries.length > 0 ? (
                  (() => {
                    const total = activeCountries.reduce((sum, c) => sum + c.partners, 0);
                    let currentAngle = 0;
                    const colors = ['#FF5A00', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
                    
                    return activeCountries.map((country, index) => {
                      const percentage = total > 0 ? (country.partners / total) * 100 : 0;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      currentAngle += angle;
                      
                      const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                      const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                      const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                      const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      return (
                        <path
                          key={country.code}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={colors[index % colors.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      );
                    });
                  })()
                ) : (
                  <circle cx="50" cy="50" r="40" fill="#E5E7EB" />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats?.total.partners || 0}
                  </div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {activeCountries.slice(0, 5).map((country, index) => {
              const colors = ['bg-[#FF5A00]', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
              return (
                <div key={country.code} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                  <span className="text-xs text-gray-600">{country.flag} {country.partners}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Country List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={20} className="text-[#FF5A00]" />
            Détail par Pays
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {COUNTRIES.slice(0, 6).map(country => {
            const countryStats = stats?.byCountry[country.code] || {
              partners: 0, drivers: 0, orders: 0, revenue: 0, users: 0
            };
            const isActive = countryStats.partners > 0 || countryStats.orders > 0;
            
            return (
              <div 
                key={country.code}
                onClick={() => onSelectCountry?.(country.code)}
                className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{country.flag}</span>
                  <div>
                    <div className="font-medium text-gray-900">{country.name}</div>
                    <div className="text-sm text-gray-500">
                      {isActive 
                        ? `${countryStats.partners} restaurants • ${countryStats.drivers} livreurs`
                        : 'Pas encore lancé'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {isActive ? (
                    <>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatAmount(countryStats.revenue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {countryStats.orders} commandes
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      Bientôt
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, subValue, color, isAmount }) {
  const colorClasses = {
    orange: 'bg-orange-50 text-[#FF5A00] border-orange-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color] || colorClasses.orange}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <div className={`font-bold ${isAmount ? 'text-lg' : 'text-2xl'}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs opacity-70 mt-1">{subValue}</div>
      )}
    </div>
  );
}

export default AdminCountryStats;
