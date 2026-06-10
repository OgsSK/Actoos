import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Bell,
  Plus,
  Loader2,
  Trash2,
  Edit,
  EyeOff,
  Eye,
  MapPin,
  Briefcase,
  Clock,
} from 'lucide-react';
import { cn, CONTRACT_TYPES } from '../lib/utils';

const FREQUENCIES = [
  { value: 'instant', label: 'Instantannée' },
  { value: 'daily', label: 'Quotidienne' },
  { value: 'weekly', label: 'Hebdomadaire' },
];

const JobAlertsPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);

  const [form, setForm] = useState({
    name: '',
    keywords: '',
    category_id: '',
    city_id: '',
    contract_types: [],
    salary_min: '',
    frequency: 'daily',
  });

  useEffect(() => {
    fetchAlerts();
    fetchReferenceData();
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setAlerts(data || []);
    else toast.error('Erreur lors du chargement des alertes');
    setLoading(false);
  };

  const fetchReferenceData = async () => {
    const [{ data: cats }, { data: cts }] = await Promise.all([
      supabase.from('job_categories').select('id, name').eq('is_active', true).order('name'),
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
    ]);
    setCategories(cats || []);
    setCities(cts || []);
  };

  const resetForm = () => {
    setForm({
      name: '',
      keywords: '',
      category_id: '',
      city_id: '',
      contract_types: [],
      salary_min: '',
      frequency: 'daily',
    });
    setEditingAlert(null);
    setShowCreate(false);
  };

  const handleEdit = (alert) => {
    setForm({
      name: alert.name || '',
      keywords: alert.keywords || '',
      category_id: alert.category_id || '',
      city_id: alert.city_id || '',
      contract_types: alert.contract_types || [],
      salary_min: alert.salary_min || '',
      frequency: alert.frequency || 'daily',
    });
    setEditingAlert(alert);
    setShowCreate(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.keywords.trim() && !form.category_id && !form.city_id && !form.salary_min) {
      toast.error('Ajoutez au moins un critère (mots-clés, catégorie, ville, salaire)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: form.name || form.keywords,
        keywords: form.keywords,
        category_id: form.category_id || null,
        city_id: form.city_id || null,
        contract_types: form.contract_types.length > 0 ? form.contract_types : null,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        frequency: form.frequency,
      };

      if (editingAlert) {
        const { error } = await supabase.from('job_alerts').update(payload).eq('id', editingAlert.id);
        if (error) throw error;
        toast.success('Alerte modifiée');
      } else {
        const { error } = await supabase.from('job_alerts').insert(payload);
        if (error) throw error;
        toast.success('Alerte créée avec succès');
      }

      resetForm();
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (alert) => {
    const newStatus = !alert.is_active;
    const { error } = await supabase
      .from('job_alerts')
      .update({ is_active: newStatus })
      .eq('id', alert.id);
    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_active: newStatus } : a))
      );
      toast.success(newStatus ? 'Alerte activée' : 'Alerte désactivée');
    } else {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette alerte ?')) return;
    const { error } = await supabase.from('job_alerts').delete().eq('id', id);
    if (!error) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Alerte supprimée');
    } else {
      toast.error('Erreur');
    }
  };

  const handleContractTypeChange = (type) => {
    setForm((prev) => {
      const types = prev.contract_types || [];
      if (types.includes(type)) {
        return { ...prev, contract_types: types.filter((t) => t !== type) };
      } else {
        return { ...prev, contract_types: [...types, type] };
      }
    });
  };

  if (loading) {
    return (
      <div className="pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Alertes emploi</h1>
            <p className="text-slate-600">Recevez des offres correspondant à vos critères</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle alerte
          </Button>
        </div>

        {showCreate && (
          <Card className="mb-8 border-blue-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                {editingAlert ? "Modifier l'alerte" : 'Créer une alerte'}
              </CardTitle>
              <CardDescription>
                Définissez vos critères pour recevoir des notifications par email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom (optionnel)</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Offres tech à Bamako"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mots-clés *</label>
                  <Input
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="Ex: développeur, comptable, Bamako"
                    required={!form.category_id && !form.city_id}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Séparez les mots par des espaces. Ex: "dev Bamako"
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Toutes les catégories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                    <select
                      value={form.city_id}
                      onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Toutes les villes</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Types de contrat</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CONTRACT_TYPES).map(([key, val]) => (
                      <Badge
                        key={key}
                        onClick={() => handleContractTypeChange(key)}
                        className={cn(
                          'cursor-pointer border',
                          (form.contract_types || []).includes(key)
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        {val.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Salaire minimum (FCFA)
                    </label>
                    <Input
                      type="number"
                      value={form.salary_min}
                      onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                      placeholder="Ex: 300000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fréquence</label>
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button variant="outline" type="button" onClick={resetForm} className="min-h-[44px]">
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingAlert ? 'Modifier' : "Créer l'alerte"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Mes alertes ({alerts.length})</h2>
          {alerts.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-300 bg-transparent">
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">Vous n'avez aucune alerte pour le moment.</p>
                <Button onClick={() => setShowCreate(true)} className="min-h-[44px]">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer ma première alerte
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className="border border-slate-200">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {alert.name || alert.keywords}
                          </h3>
                          <Badge className={alert.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                            {alert.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-700">
                            <Clock className="w-3 h-3 mr-1" />
                            {FREQUENCIES.find(f => f.value === alert.frequency)?.label || alert.frequency}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-slate-600">
                          {alert.keywords && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {alert.keywords}
                            </span>
                          )}
                          {alert.city?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {alert.city.name}
                            </span>
                          )}
                          {alert.category?.name && (
                            <span>{alert.category.name}</span>
                          )}
                          {alert.salary_min && (
                            <span>≥ {alert.salary_min.toLocaleString('fr-FR')} FCFA</span>
                          )}
                          {alert.contract_types?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {alert.contract_types.map((ct) => (
                                <Badge key={ct} className="bg-blue-50 text-blue-700 text-xs">
                                  {CONTRACT_TYPES[ct]?.label || ct}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {alert.last_sent_at && (
                          <p className="text-xs text-slate-400 mt-2">
                            Dernier envoi : {new Date(alert.last_sent_at).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(alert)}
                          className="min-h-[44px] w-full sm:w-auto"
                        >
                          {alert.is_active ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                          {alert.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(alert)}
                          className="min-h-[44px] w-full sm:w-auto"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(alert.id)}
                          className="min-h-[44px] w-full sm:w-auto text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobAlertsPage;