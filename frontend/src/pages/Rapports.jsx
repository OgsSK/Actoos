import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { 
  BarChart3, TrendingUp, TrendingDown, Calendar, Users, FileText, 
  Receipt, Euro, Clock, CheckCircle, Loader2, Download, ArrowUpRight,
  ArrowDownRight, Minus
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';

// Simple Chart Bar Component (no external lib needed)
const ChartBar = ({ data, maxValue, label, color = 'bg-blue-500' }) => {
  const percentage = maxValue > 0 ? (data / maxValue) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-8 text-right">{label}</span>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-700 w-20 text-right">
        {formatCurrency(data)}
      </span>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, value, subValue, icon: Icon, trend, trendValue, color = 'text-blue-600' }) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-emerald-600" />;
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-600 bg-emerald-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-slate-500 bg-slate-50';
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subValue && (
              <p className="text-xs text-slate-400 mt-1">{subValue}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            {trendValue && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Stats Table Row
const StatsRow = ({ label, value, percentage, highlight = false }) => (
  <div className={`flex items-center justify-between py-3 ${highlight ? 'bg-slate-50 -mx-4 px-4 rounded-lg' : ''}`}>
    <span className="text-sm text-slate-600">{label}</span>
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-900">{value}</span>
      {percentage !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {percentage}%
        </Badge>
      )}
    </div>
  </div>
);

export const RapportsPage = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topClients, setTopClients] = useState([]);

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load basic stats
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);

      // Load monthly revenue data
      const monthlyRes = await api.get('/rapports/monthly-revenue');
      setMonthlyData(monthlyRes.data || []);

      // Load top clients
      const clientsRes = await api.get('/rapports/top-clients');
      setTopClients(clientsRes.data || []);

    } catch (error) {
      console.error('Error loading stats:', error);
      // Use dashboard stats as fallback
      try {
        const statsRes = await api.get('/dashboard/stats');
        setStats(statsRes.data);
      } catch (e) {
        console.error('Fallback stats also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const response = await api.get(`/rapports/export/${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${type}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Calculate some derived stats
  const tauxConversion = stats?.devis_signes_mois && stats?.devis_en_attente 
    ? Math.round((stats.devis_signes_mois / (stats.devis_signes_mois + stats.devis_en_attente)) * 100)
    : 0;

  const maxMonthlyValue = Math.max(...monthlyData.map(d => d.revenue || 0), stats?.ca_mois || 0);

  return (
    <div className="space-y-6" data-testid="rapports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Rapports</h1>
          <p className="text-slate-500">Analysez les performances de votre activité</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]" data-testid="period-select">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => loadStats()}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Chiffre d'affaires"
          value={formatCurrency(stats?.ca_mois || 0)}
          subValue="Ce mois"
          icon={Euro}
          color="text-emerald-600"
          trend="up"
          trendValue="+12%"
        />
        <KPICard
          title="Devis signés"
          value={stats?.devis_signes_mois || 0}
          subValue={`${formatCurrency(stats?.montant_devis_attente || 0)} en attente`}
          icon={FileText}
          color="text-blue-600"
          trend={tauxConversion > 50 ? 'up' : 'down'}
          trendValue={`${tauxConversion}% conv.`}
        />
        <KPICard
          title="Factures impayées"
          value={stats?.factures_impayees || 0}
          subValue={formatCurrency(stats?.montant_factures_impayees || 0)}
          icon={Receipt}
          color={stats?.factures_impayees > 5 ? 'text-red-600' : 'text-amber-600'}
        />
        <KPICard
          title="Interventions"
          value={stats?.interventions_today || 0}
          subValue={`${stats?.interventions_en_retard || 0} en retard`}
          icon={Clock}
          color="text-violet-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Évolution du CA</CardTitle>
                <CardDescription>Chiffre d'affaires mensuel</CardDescription>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.length > 0 ? (
                monthlyData.slice(-6).map((item, idx) => (
                  <ChartBar
                    key={idx}
                    data={item.revenue || 0}
                    maxValue={maxMonthlyValue}
                    label={item.month}
                    color={idx === monthlyData.length - 1 ? 'bg-blue-600' : 'bg-blue-400'}
                  />
                ))
              ) : (
                // Show current month as fallback
                <ChartBar
                  data={stats?.ca_mois || 0}
                  maxValue={stats?.ca_mois || 1}
                  label={format(new Date(), 'MMM', { locale: fr })}
                  color="bg-blue-600"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tunnel de conversion</CardTitle>
                <CardDescription>De l'intervention à la facture</CardDescription>
              </div>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <StatsRow
                label="Interventions terminées"
                value={stats?.interventions_today || 0}
                percentage={100}
              />
              <StatsRow
                label="Devis créés"
                value={(stats?.devis_en_attente || 0) + (stats?.devis_signes_mois || 0)}
                percentage={75}
              />
              <StatsRow
                label="Devis signés"
                value={stats?.devis_signes_mois || 0}
                percentage={tauxConversion}
                highlight
              />
              <StatsRow
                label="Factures émises"
                value={stats?.factures_impayees || 0}
                percentage={Math.round(tauxConversion * 0.9)}
              />
              <StatsRow
                label="Factures payées"
                value={Math.max(0, (stats?.devis_signes_mois || 0) - (stats?.factures_impayees || 0))}
                percentage={Math.round(tauxConversion * 0.8)}
                highlight
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Clients */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Meilleurs clients</CardTitle>
                <CardDescription>Par chiffre d'affaires</CardDescription>
              </div>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="space-y-4">
                {topClients.slice(0, 5).map((client, idx) => (
                  <div key={client.id || idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{client.nom} {client.prenom || ''}</p>
                        <p className="text-xs text-slate-500">{client.interventions || 0} interventions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(client.total_ca || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Pas encore de données</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Résumé</CardTitle>
            <CardDescription>Statistiques globales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Total clients</span>
                <span className="font-semibold">{stats?.total_clients || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Techniciens actifs</span>
                <span className="font-semibold">{stats?.total_techniciens || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Devis en attente</span>
                <span className="font-semibold">{stats?.devis_en_attente || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Taux de conversion</span>
                <Badge className={tauxConversion > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                  {tauxConversion}%
                </Badge>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-3">Exporter les données</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('devis')} className="flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Devis
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('factures')} className="flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Factures
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RapportsPage;
