import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, Bell, Plus, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatRelative } from '../lib/utils';

const JobAlertsPage = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [fetchingAlerts, setFetchingAlerts] = useState(true);

  useEffect(() => {
    if (user) fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    setFetchingAlerts(true);
    const { data } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setAlerts(data || []);
    setFetchingAlerts(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!email.trim() || !keywords.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('job_alerts').insert({
        user_id: user.id,
        keywords,
        is_active: true,
        frequency: 'daily',
      });
      if (error) throw error;
      toast.success('Alerte créée avec succès !');
      setKeywords('');
      fetchAlerts();
    } catch (err) {
      toast.error('Erreur lors de la création de l\'alerte');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (alertId, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('job_alerts')
      .update({ is_active: newStatus })
      .eq('id', alertId);
    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, is_active: newStatus } : a))
    );
    toast.success(newStatus ? 'Alerte activée' : 'Alerte désactivée');
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('Supprimer cette alerte ?')) return;
    const { error } = await supabase
      .from('job_alerts')
      .delete()
      .eq('id', alertId);
    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    toast.success('Alerte supprimée');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard"><Button variant="ghost"><ChevronLeft className="w-4 h-4 mr-2" />Retour</Button></Link>
          <h1 className="text-2xl font-bold text-slate-900">Alertes emploi</h1>
        </div>

        {/* Formulaire de création */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mots-clés</label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Ex: développeur, comptable, Bamako"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 text-white ">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                Créer l'alerte
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Liste des alertes existantes */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Mes alertes</h2>
          {fetchingAlerts ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : alerts.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              Aucune alerte configurée. Créez votre première alerte ci-dessus.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <Card key={alert.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={alert.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                          {alert.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.frequency === 'daily' ? 'Quotidienne' : 'Hebdomadaire'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 truncate">{alert.keywords}</p>
                      <p className="text-xs text-slate-500 mt-1">Envoyée à {alert.email}</p>
                      {alert.last_sent_at && (
                        <p className="text-xs text-slate-400 mt-1">Dernier envoi : {formatRelative(alert.last_sent_at)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(alert.id, alert.is_active)}
                      >
                        {alert.is_active ? (
                          <><XCircle className="w-4 h-4 mr-1" /> Désactiver</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-1" /> Activer</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(alert.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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