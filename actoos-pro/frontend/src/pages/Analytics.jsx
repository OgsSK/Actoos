import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  TrendingUp, TrendingDown, Users, FileText, Wrench,
  Loader2, BarChart3, PieChart, ArrowUp, ArrowDown, Minus,
  Calendar, Target, Clock, CheckCircle, Coins, Download
} from 'lucide-react';
import { toast } from 'sonner';

const Analytics = () => {
  const { user, formatAmount, formatAmountCompact, currencySymbol } = useAuth();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    if (!user?.entreprise_id) return;
    setLoading(true);
    try {
      const entrepriseId = user.entreprise_id;
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      const startISO = startDate.toISOString();
      
      // Fetch data from Supabase directly
      const [interventions, devis, factures, techs] = await Promise.all([
        supabase.from('interventions').select('*').eq('entreprise_id', entrepriseId).gte('created_at', startISO),
        supabase.from('devis').select('*').eq('entreprise_id', entrepriseId).gte('created_at', startISO),
        supabase.from('factures').select('*').eq('entreprise_id', entrepriseId).gte('created_at', startISO),
        supabase.from('users').select('*').eq('entreprise_id', entrepriseId).in('role', ['tech', 'technicien'])
      ]);
      
      // Calculate stats
      const totalInterventions = interventions.data?.length || 0;
      const termineeInterventions = interventions.data?.filter(i => i.statut === 'terminee').length || 0;
      const totalDevis = devis.data?.length || 0;
      const signeDevis = devis.data?.filter(d => d.statut === 'signe').length || 0;
      const totalFactures = factures.data?.length || 0;
      const payeFactures = factures.data?.filter(f => f.statut === 'payee').length || 0;
      const caTotal = factures.data?.filter(f => f.statut === 'payee').reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;
      
      setData({
        interventions: {
          total: totalInterventions,
          completed: termineeInterventions,
          completion_rate: totalInterventions > 0 ? Math.round((termineeInterventions / totalInterventions) * 100) : 0
        },
        devis: {
          total: totalDevis,
          signed: signeDevis,
          conversion_rate: totalDevis > 0 ? Math.round((signeDevis / totalDevis) * 100) : 0
        },
        factures: {
          total: totalFactures,
          paid: payeFactures,
          payment_rate: totalFactures > 0 ? Math.round((payeFactures / totalFactures) * 100) : 0
        },
        revenue: {
          total: caTotal,
          growth: 0 // Would need previous period comparison
        }
      });
      
      // Technicians performance
      const techsWithStats = (techs.data || []).map(t => {
        const techInterventions = interventions.data?.filter(i => i.technicien_id === t.id) || [];
        const completed = techInterventions.filter(i => i.statut === 'terminee').length;
        return {
          ...t,
          interventions: techInterventions.length,
          completed,
          completion_rate: techInterventions.length > 0 ? Math.round((completed / techInterventions.length) * 100) : 0
        };
      });
      setTechnicians(techsWithStats);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (p) => {
    const labels = {
      week: 'Cette semaine',
      month: 'Ce mois',
      quarter: 'Ce trimestre',
      year: 'Cette année'
    };
    return labels[p] || p;
  };

  const GrowthIndicator = ({ value }) => {
    if (value > 0) {
      return (
        <span className="flex items-center text-emerald-600 text-sm">
          <ArrowUp className="w-4 h-4" />
          {value}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <ArrowDown className="w-4 h-4" />
          {Math.abs(value)}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-slate-400 text-sm">
        <Minus className="w-4 h-4" />
        0%
      </span>
    );
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Build CSV from current data
      let csv = 'Métrique,Valeur\n';
      if (data) {
        csv += `Chiffre d'affaires,${data.revenue?.current || 0}\n`;
        csv += `Clients,${data.clients?.total || 0}\n`;
        csv += `Interventions terminées,${data.interventions?.completed || 0}\n`;
        csv += `Devis signés,${data.devis?.signed || 0}\n`;
        csv += `Factures payées,${data.factures?.paid || 0}\n`;
      }
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export CSV téléchargé');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      // Export current data as JSON
      const exportData = {
        period,
        generated_at: new Date().toISOString(),
        data: data,
        trends: trends,
        technicians: technicians
      };
      
      // Create download link
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${period}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export JSON téléchargé');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Génération du rapport...');
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Rapport Analytics - ${period}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #1e293b; }
              .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
              .stat-card { padding: 20px; background: #f8fafc; border-radius: 8px; }
              .stat-value { font-size: 24px; font-weight: bold; color: #10b981; }
              .stat-label { color: #64748b; }
            </style>
          </head>
          <body>
            <h1>Rapport Analytics - ${period}</h1>
            <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-value">${data?.revenue?.total?.toFixed(2) || 0} €</div>
                <div class="stat-label">Chiffre d'affaires</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data?.interventions?.total || 0}</div>
                <div class="stat-label">Interventions</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data?.devis?.total || 0}</div>
                <div class="stat-label">Devis créés</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data?.clients?.total || 0}</div>
                <div class="stat-label">Clients actifs</div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      toast.dismiss();
      toast.success('Rapport généré');
    } catch (err) {
      toast.dismiss();
      toast.error('Erreur lors de la génération');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const { revenue, interventions, clients, devis } = data || {};

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports & Analytics</h1>
          <p className="text-slate-500">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Export Dropdown */}
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting || loading}
              data-testid="export-pdf-btn"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exporting || loading}
              data-testid="export-csv-btn"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={exporting || loading}
              data-testid="export-json-btn"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              JSON
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatAmount(revenue?.current_revenue || 0)}
                </p>
                <GrowthIndicator value={revenue?.growth_percent || 0} />
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Coins className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invoices */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Factures en attente</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatAmount(revenue?.pending_amount || 0)}
                </p>
                <p className="text-sm text-slate-400">
                  {revenue?.pending_count || 0} factures
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interventions */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Interventions</p>
                <p className="text-2xl font-bold text-slate-900">
                  {interventions?.completed || 0} / {interventions?.total || 0}
                </p>
                <p className="text-sm text-slate-400">
                  {interventions?.completion_rate || 0}% terminées
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Devis Conversion */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Taux de conversion</p>
                <p className="text-2xl font-bold text-slate-900">
                  {devis?.conversion_rate || 0}%
                </p>
                <p className="text-sm text-slate-400">
                  {devis?.signed_count || 0} devis signés
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-400" />
              Évolution du CA (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {trends.map((day, index) => {
                const maxValue = Math.max(...trends.map(t => t.value), 1);
                const height = (day.value / maxValue) * 100;
                return (
                  <div 
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${day.label}: ${formatAmount(day.value)}`}
                  >
                    <div 
                      className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    {index % 5 === 0 && (
                      <span className="text-xs text-slate-400 -rotate-45 origin-left">
                        {day.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Interventions by Status */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-slate-400" />
              Interventions par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(interventions?.by_status || {}).map(([status, count]) => {
                const total = interventions?.total || 1;
                const percent = (count / total) * 100;
                const colors = {
                  planifie: 'bg-blue-500',
                  en_cours: 'bg-amber-500',
                  terminee: 'bg-emerald-500',
                  facturee: 'bg-purple-500',
                  annulee: 'bg-red-500'
                };
                const labels = {
                  planifie: 'Planifiées',
                  en_cours: 'En cours',
                  terminee: 'Terminées',
                  facturee: 'Facturées',
                  annulee: 'Annulées'
                };
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{labels[status] || status}</span>
                      <span className="font-medium">{count} ({Math.round(percent)}%)</span>
                    </div>
                    <Progress value={percent} className={`h-2 ${colors[status] || 'bg-slate-500'}`} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technician Performance */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Performance des techniciens</CardTitle>
            <CardDescription>Classement par interventions terminées</CardDescription>
          </CardHeader>
          <CardContent>
            {technicians.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucun technicien</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technicien</TableHead>
                    <TableHead className="text-center">Terminées</TableHead>
                    <TableHead className="text-center">Taux</TableHead>
                    <TableHead className="text-right">Durée moy.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech, index) => (
                    <TableRow key={tech.technician_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index === 0 && <Badge className="bg-amber-500">🏆</Badge>}
                          <span className="font-medium">{tech.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {tech.interventions_completed} / {tech.interventions_assigned}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={
                          tech.completion_rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          tech.completion_rate >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {tech.completion_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {tech.avg_duration_minutes ? `${tech.avg_duration_minutes} min` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Top Clients</CardTitle>
            <CardDescription>Par chiffre d'affaires généré</CardDescription>
          </CardHeader>
          <CardContent>
            {clients?.top_clients?.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-4">
                {clients?.top_clients?.map((client, index) => (
                  <div key={client.client_id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-amber-500' : 
                      index === 1 ? 'bg-slate-400' : 
                      index === 2 ? 'bg-amber-700' : 'bg-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.invoice_count} facture(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatAmount(client.total_revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Devis Stats */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Total créés</span>
                <span className="font-medium">{devis?.total_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Montant total</span>
                <span className="font-medium">{formatAmount(devis?.total_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Signés</span>
                <span className="font-medium text-emerald-600">{devis?.signed_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Délai moyen signature</span>
                <span className="font-medium">
                  {devis?.avg_days_to_sign ? `${devis.avg_days_to_sign} jours` : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Stats */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Total clients</span>
                <span className="font-medium">{clients?.total_clients || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Nouveaux ({getPeriodLabel(period).toLowerCase()})</span>
                <span className="font-medium text-emerald-600">+{clients?.new_clients || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Particuliers</span>
                <span className="font-medium">{clients?.by_type?.particulier || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Professionnels</span>
                <span className="font-medium">{clients?.by_type?.professionnel || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Factures Stats */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Payées ({getPeriodLabel(period).toLowerCase()})</span>
                <span className="font-medium text-emerald-600">{revenue?.current_invoices_paid || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">En attente</span>
                <span className="font-medium text-amber-600">{revenue?.pending_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">En retard</span>
                <span className="font-medium text-red-600">{revenue?.overdue_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Montant moyen</span>
                <span className="font-medium">{formatAmount(revenue?.average_invoice || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
