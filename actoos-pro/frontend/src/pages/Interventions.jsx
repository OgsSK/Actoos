import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useInterventions, useClients, useTechniciens, useCategories } from '../lib/supabaseHooks';
import { interventionsApi } from '../lib/supabaseApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { ClientSelect, TechnicianSelect, CategorySelect } from '../components/ui/searchable-select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatDate, formatTime, formatCurrency, getStatusLabel, getPriorityLabel, priorityColors } from '../lib/utils';
import {
  Plus, Search, ChevronLeft, Edit, Calendar as CalendarIcon, Clock, MapPin,
  User, Phone, Play, CheckCircle, FileText, Loader2, Camera, XCircle, Trash2, Download
} from 'lucide-react';
import { toast } from 'sonner';

// Intervention List Component
export const InterventionsList = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: interventions, loading, refetch } = useInterventions(user?.entreprise_id, { statut: statusFilter });

  return (
    <div className="space-y-6" data-testid="interventions-list">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Interventions</h1>
          <p className="text-slate-500">Planifiez et suivez vos interventions</p>
        </div>
        <Button onClick={() => navigate('/dashboard/interventions/new')} data-testid="new-intervention-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle intervention
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="planifie">Planifiée</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="en_validation">En validation</SelectItem>
                <SelectItem value="terminee">Terminée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : interventions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucune intervention trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Intervention</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventions.map((intervention) => (
                  <TableRow
                    key={intervention.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/dashboard/interventions/${intervention.id}`)}
                    data-testid={`intervention-row-${intervention.id}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatDate(intervention.date_prevue)}</p>
                        <p className="text-xs text-slate-500">{formatTime(intervention.date_prevue)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">{intervention.titre}</p>
                      {intervention.adresse && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {intervention.ville}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{intervention.client?.nom || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={priorityColors[intervention.priorite]}>
                        {getPriorityLabel(intervention.priorite)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`status-${intervention.statut}`}>
                        {getStatusLabel(intervention.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/interventions/${intervention.id}/edit`);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Intervention Form Component
export const InterventionForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, supabaseApi } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [techniciens, setTechniciens] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    client_id: location.state?.client_id || '',
    site_id: '',
    technicien_id: '',
    categorie_id: '',
    titre: '',
    description: '',
    adresse: '',
    ville: '',
    code_postal: '',
    date_prevue: new Date(),
    duree_estimee: 60,
    priorite: 'normale',
    notes_internes: '',
  });

  useEffect(() => {
    loadFormData();
  }, [id]);

  const loadFormData = async () => {
    try {
      const [clientsData, techsData, catsData] = await Promise.all([
        supabaseApi.clients.list(user?.entreprise_id),
        supabaseApi.users.getTechniciens(user?.entreprise_id),
        supabaseApi.categories.list(user?.entreprise_id)
      ]);
      setClients(clientsData);
      setTechniciens(techsData.filter(t => t.statut === 'actif'));
      setCategories(catsData);
      
      if (isEdit) {
        setLoading(true);
        const intervention = await supabaseApi.interventions.get(id);
        setFormData({
          ...intervention,
          date_prevue: new Date(intervention.date_prevue),
        });
        if (intervention.client_id) {
          const sitesData = await supabaseApi.sites.list(intervention.client_id);
          setSites(sitesData);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      setLoading(false);
    }
  };

  // Fetch sites when client changes
  const fetchSites = async (clientId) => {
    if (!clientId) {
      setSites([]);
      return;
    }
    try {
      const sitesData = await supabaseApi.sites.list(clientId);
      setSites(sitesData);
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    }
  };

  // Load sites when client_id changes
  useEffect(() => {
    if (formData.client_id) {
      fetchSites(formData.client_id);
    } else {
      setSites([]);
    }
  }, [formData.client_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        entreprise_id: user?.entreprise_id,
        date_prevue: formData.date_prevue.toISOString(),
        duree_estimee: parseInt(formData.duree_estimee),
        statut: formData.statut || 'planifie'
      };
      
      if (isEdit) {
        await supabaseApi.interventions.update(id, payload);
      } else {
        await supabaseApi.interventions.create(payload);
      }
      navigate('/dashboard/interventions');
    } catch (error) {
      console.error('Error saving intervention:', error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-fill address from client or site
  useEffect(() => {
    if (!isEdit) {
      // If a site is selected, use its address
      if (formData.site_id) {
        const site = sites.find(s => s.id === formData.site_id);
        if (site) {
          setFormData(prev => ({
            ...prev,
            adresse: site.adresse || '',
            ville: site.ville || '',
            code_postal: site.code_postal || '',
          }));
          return;
        }
      }
      // Otherwise, use client address
      if (formData.client_id) {
        const client = clients.find(c => c.id === formData.client_id);
        if (client) {
          setFormData(prev => ({
            ...prev,
            adresse: client.adresse || '',
            ville: client.ville || '',
            code_postal: client.code_postal || '',
          }));
        }
      }
    }
  }, [formData.client_id, formData.site_id, clients, sites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="intervention-form">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {isEdit ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
          </h1>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client */}
            <div className="space-y-2">
              <Label>Client *</Label>
              <ClientSelect
                clients={clients}
                value={formData.client_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value, site_id: '' }))}
                data-testid="intervention-client"
              />
            </div>

            {/* Site (if client has multiple sites) */}
            {sites.length > 0 && (
              <div className="space-y-2">
                <Label>Site d'intervention</Label>
                <Select
                  value={formData.site_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, site_id: value === 'default' ? '' : value }))}
                >
                  <SelectTrigger data-testid="intervention-site">
                    <SelectValue placeholder="Adresse par défaut du client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <span className="text-slate-500">Adresse par défaut du client</span>
                    </SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{site.nom}</span>
                          <span className="text-xs text-slate-500">{site.adresse}, {site.ville}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Ce client a {sites.length} site(s) enregistré(s)
                </p>
              </div>
            )}

            {/* Categorie */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <CategorySelect
                  categories={categories}
                  value={formData.categorie_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categorie_id: value || null }))}
                  data-testid="intervention-categorie"
                />
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                required
                placeholder="Ex: Réparation fuite"
                data-testid="intervention-titre"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                data-testid="intervention-description"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="intervention-date">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date_prevue, 'PPP', { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date_prevue}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, date_prevue: date }))}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Heure</Label>
                <Input
                  id="time"
                  type="time"
                  value={format(formData.date_prevue, 'HH:mm')}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(formData.date_prevue);
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setFormData(prev => ({ ...prev, date_prevue: newDate }));
                  }}
                  data-testid="intervention-time"
                />
              </div>
            </div>

            {/* Duration & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duree_estimee">Durée estimée (min)</Label>
                <Input
                  id="duree_estimee"
                  name="duree_estimee"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duree_estimee}
                  onChange={handleChange}
                  data-testid="intervention-duree"
                />
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select
                  value={formData.priorite}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priorite: value }))}
                >
                  <SelectTrigger data-testid="intervention-priorite">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Technician */}
            <div className="space-y-2">
              <Label>Technicien assigné</Label>
              <TechnicianSelect
                technicians={techniciens}
                value={formData.technicien_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, technicien_id: value || null }))}
                data-testid="intervention-technicien"
              />
            </div>

            {/* Address */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900">Lieu d'intervention</h3>
              
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  data-testid="intervention-adresse"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input
                    id="code_postal"
                    name="code_postal"
                    value={formData.code_postal}
                    onChange={handleChange}
                    data-testid="intervention-code-postal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    name="ville"
                    value={formData.ville}
                    onChange={handleChange}
                    data-testid="intervention-ville"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes_internes">Notes internes</Label>
              <Textarea
                id="notes_internes"
                name="notes_internes"
                value={formData.notes_internes}
                onChange={handleChange}
                rows={2}
                placeholder="Notes visibles uniquement par l'équipe"
                data-testid="intervention-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving} data-testid="intervention-submit">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isEdit ? 'Enregistrer' : 'Créer l\'intervention'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Intervention Detail Component
export const InterventionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [intervention, setIntervention] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchIntervention();
  }, [id]);

  const fetchIntervention = async () => {
    try {
      const data = await interventionsApi.get(id);
      setIntervention(data);
    } catch (error) {
      console.error('Error fetching intervention:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      await interventionsApi.updateStatut(id, 'en_cours', { date_debut: new Date().toISOString() });
      fetchIntervention();
    } catch (error) {
      console.error('Error starting intervention:', error);
    }
  };

  const handleComplete = async () => {
    try {
      await interventionsApi.updateStatut(id, 'termine');
      toast.success('Intervention terminée');
      fetchIntervention();
    } catch (error) {
      console.error('Error completing intervention:', error);
      toast.error('Erreur lors de la clôture');
    }
  };

  const handleCancel = async () => {
    try {
      await interventionsApi.updateStatut(id, 'annulee');
      toast.success('Intervention annulée');
      fetchIntervention();
    } catch (error) {
      console.error('Error canceling intervention:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleDelete = async () => {
    try {
      await interventionsApi.delete(id);
      toast.success('Intervention supprimée');
      navigate('/dashboard/interventions');
    } catch (error) {
      console.error('Error deleting intervention:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Download intervention report PDF
  const handleDownloadReport = async () => {
    if (!intervention) return;
    
    try {
      toast.loading('Génération du rapport...');
      const { generateInterventionPDF, downloadPDF: savePDF } = await import('../lib/pdfService');
      const doc = await generateInterventionPDF(intervention, intervention.entreprise || {}, intervention.client);
      savePDF(doc, `rapport_intervention_${intervention.titre?.replace(/\s+/g, '_') || id.slice(0, 8)}.pdf`);
      toast.dismiss();
      toast.success('Rapport téléchargé');
    } catch (err) {
      toast.dismiss();
      console.error('PDF error:', err);
      toast.error('Erreur lors de la génération');
    }
  };

  // Validate intervention (admin only - for Startup plan)
  const handleValidateIntervention = async () => {
    try {
      await interventionsApi.update(id, { 
        statut: 'termine', 
        validation_admin: true,
        date_validation: new Date().toISOString()
      });
      toast.success('Intervention validée avec succès');
      fetchIntervention();
    } catch (error) {
      console.error('Error validating intervention:', error);
      toast.error(error.message || 'Erreur lors de la validation');
    }
  };

  // Reject validation (admin only - sends back to en_cours)
  const handleRejectValidation = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez indiquer un motif de rejet');
      return;
    }
    try {
      await interventionsApi.update(id, { 
        statut: 'en_cours', 
        motif_rejet: rejectionReason,
        validation_admin: false
      });
      toast.success('Validation rejetée - intervention remise en cours');
      setRejectionReason('');
      fetchIntervention();
    } catch (error) {
      console.error('Error rejecting validation:', error);
      toast.error(error.message || 'Erreur lors du rejet');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!intervention) {
    return <div>Intervention non trouvée</div>;
  }

  return (
    <div className="space-y-6" data-testid="intervention-detail">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/interventions')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Interventions
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">{intervention.titre}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={`status-${intervention.statut}`}>
                {getStatusLabel(intervention.statut)}
              </Badge>
              <Badge variant="secondary" className={priorityColors[intervention.priorite]}>
                {getPriorityLabel(intervention.priorite)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {intervention.statut === 'planifie' && (
            <>
              <Button onClick={handleStart} className="bg-blue-600 hover:bg-blue-700" data-testid="start-intervention">
                <Play className="w-4 h-4 mr-2" />
                Démarrer
              </Button>
              <Button variant="outline" onClick={handleCancel} className="text-amber-600 hover:text-amber-700" data-testid="cancel-intervention">
                <XCircle className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </>
          )}
          {intervention.statut === 'en_cours' && (
            <Button onClick={handleComplete} className="bg-emerald-600 hover:bg-emerald-700" data-testid="complete-intervention">
              <CheckCircle className="w-4 h-4 mr-2" />
              Terminer
            </Button>
          )}
          {intervention.statut === 'en_validation' && isAdmin && (
            <>
              <Button 
                onClick={handleValidateIntervention}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="validate-intervention"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-amber-600 hover:text-amber-700 border-amber-300">
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rejeter la validation ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'intervention sera remise "en cours" et le technicien devra obtenir une nouvelle signature.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="rejection-reason">Motif du rejet</Label>
                    <Input
                      id="rejection-reason"
                      placeholder="Ex: Photos manquantes, travaux incomplets..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRejectionReason('')}>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRejectValidation} 
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={!rejectionReason.trim()}
                    >
                      Rejeter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {intervention.statut === 'termine' && (
            <Button 
              variant="outline" 
              onClick={handleDownloadReport}
              data-testid="download-intervention-report"
            >
              <Download className="w-4 h-4 mr-2" />
              Rapport PDF
            </Button>
          )}
          {intervention.statut === 'annulee' && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              <XCircle className="w-3 h-3 mr-1" />
              Annulée
            </Badge>
          )}
          {!['en_cours', 'termine'].includes(intervention.statut) && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer l'intervention ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. L'intervention sera définitivement supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => navigate(`/dashboard/interventions/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Date prévue</p>
                <p className="font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  {formatDate(intervention.date_prevue)} à {formatTime(intervention.date_prevue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Durée estimée</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {intervention.duree_estimee} min
                </p>
              </div>
            </div>

            {intervention.description && (
              <div>
                <p className="text-sm text-slate-500">Description</p>
                <p className="text-slate-700">{intervention.description}</p>
              </div>
            )}

            {intervention.adresse && (
              <div>
                <p className="text-sm text-slate-500">Adresse</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {intervention.adresse}, {intervention.code_postal} {intervention.ville}
                </p>
              </div>
            )}

            {intervention.heure_debut && (
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">Temps réel</p>
                <p className="font-medium">
                  Démarré à {formatTime(intervention.heure_debut)}
                  {intervention.heure_fin && ` - Terminé à ${formatTime(intervention.heure_fin)}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {intervention.client ? (
              <>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{intervention.client.nom} {intervention.client.prenom}</span>
                </div>
                {intervention.client.telephone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${intervention.client.telephone}`} className="text-blue-600 hover:underline">
                      {intervention.client.telephone}
                    </a>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => navigate(`/dashboard/clients/${intervention.client_id}`)}
                >
                  Voir le client
                </Button>
              </>
            ) : (
              <p className="text-slate-500">Client non trouvé</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/devis/new', { state: { client_id: intervention.client_id, intervention_id: id } })}
          >
            <FileText className="w-4 h-4 mr-2" />
            Créer un devis
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
