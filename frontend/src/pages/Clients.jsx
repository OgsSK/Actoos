import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClients } from '../lib/supabaseHooks';
import { clientsApi, interventionsApi, devisApi, facturesApi, sitesApi } from '../lib/supabaseApi';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { formatDate, formatCurrency, getStatusLabel } from '../lib/utils';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import {
  Plus, Search, Phone, Mail, MapPin, User, Building2, ChevronLeft, 
  Edit, Trash2, FileText, Receipt, Calendar, Loader2, ExternalLink, Copy, Check,
  MapPinned, Clock, Info, X, Crown, AlertTriangle, Archive, ArchiveRestore
} from 'lucide-react';
import { toast } from 'sonner';

// Client List Component
export const ClientsList = () => {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { user, api } = useAuth();
  const navigate = useNavigate();
  
  const { data: clients, loading, archivedCount, refetch } = useClients(user?.entreprise_id, { 
    archivedOnly: showArchived,
    search: search 
  });

  const fetchClients = () => refetch();

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className="space-y-6" data-testid="clients-list">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Clients</h1>
          <p className="text-slate-500">Gérez votre portefeuille clients</p>
        </div>
        <Button onClick={() => navigate('/dashboard/clients/new')} data-testid="new-client-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="client-search"
                />
              </div>
              <Button type="submit" variant="secondary">Rechercher</Button>
            </form>
            
            {/* Archive toggle */}
            {archivedCount > 0 && (
              <Button 
                variant={showArchived ? "default" : "outline"}
                onClick={() => setShowArchived(!showArchived)}
                className={showArchived ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchived ? `Archivés (${archivedCount})` : `Voir archivés (${archivedCount})`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Archive notice */}
      {showArchived && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Vous consultez les clients archivés. Ces clients n'apparaissent pas dans les autres sections de l'application.
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2 text-amber-700 underline"
              onClick={() => setShowArchived(false)}
            >
              Revenir aux clients actifs
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucun client trouvé</p>
              <Button variant="link" onClick={() => navigate('/dashboard/clients/new')}>
                Créer votre premier client
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/dashboard/clients/${client.id}`)}
                    data-testid={`client-row-${client.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          {client.type_client === 'professionnel' ? (
                            <Building2 className="w-5 h-5 text-slate-500" />
                          ) : (
                            <User className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{client.nom} {client.prenom}</p>
                          <p className="text-xs text-slate-500">Créé le {formatDate(client.created_at)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {client.telephone && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-3.5 h-3.5" />
                            {client.telephone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-3.5 h-3.5" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.adresse && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">
                            {client.adresse}, {client.code_postal} {client.ville}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={client.type_client === 'professionnel' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
                        {client.type_client === 'professionnel' ? 'Pro' : 'Particulier'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/clients/${client.id}/edit`);
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

// Client Form Component
export const ClientForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, supabaseApi } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: '',
    type_client: 'particulier',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const data = await supabaseApi.clients.get(id);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await supabaseApi.clients.update(id, formData);
      } else {
        await supabaseApi.clients.create({ ...formData, entreprise_id: user?.entreprise_id });
      }
      navigate('/dashboard/clients');
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="client-form">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {isEdit ? 'Modifier le client' : 'Nouveau client'}
          </h1>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label>Type de client</Label>
              <Select
                value={formData.type_client}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type_client: value }))}
              >
                <SelectTrigger data-testid="client-type">
                  <SelectValue placeholder="Type de client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particulier">Particulier</SelectItem>
                  <SelectItem value="professionnel">Professionnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                  data-testid="client-nom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  data-testid="client-prenom"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  data-testid="client-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  data-testid="client-telephone"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                data-testid="client-adresse"
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
                  data-testid="client-code-postal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  data-testid="client-ville"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                data-testid="client-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving} data-testid="client-submit">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isEdit ? 'Enregistrer' : 'Créer le client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Site Form Component
const SiteForm = ({ initialData, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    nom: initialData?.nom || '',
    adresse: initialData?.adresse || '',
    ville: initialData?.ville || '',
    code_postal: initialData?.code_postal || '',
    contact_nom: initialData?.contact_nom || '',
    contact_telephone: initialData?.contact_telephone || '',
    contact_email: initialData?.contact_email || '',
    horaires_acces: initialData?.horaires_acces || '',
    instructions_acces: initialData?.instructions_acces || '',
    notes: initialData?.notes || ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nom.trim()) newErrors.nom = 'Le nom du site est requis';
    if (!formData.adresse.trim()) newErrors.adresse = 'L\'adresse est requise';
    if (!formData.ville.trim()) newErrors.ville = 'La ville est requise';
    if (!formData.code_postal.trim()) newErrors.code_postal = 'Le code postal est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto px-1">
      {/* Site Name */}
      <div className="space-y-2">
        <Label htmlFor="site-nom" className="text-sm font-medium">
          Nom du site <span className="text-red-500">*</span>
        </Label>
        <Input
          id="site-nom"
          value={formData.nom}
          onChange={(e) => { setFormData({ ...formData, nom: e.target.value }); setErrors({...errors, nom: ''}); }}
          placeholder="Ex: Entrepôt Nord, Siège social..."
          className={errors.nom ? 'border-red-500' : ''}
          data-testid="site-nom-input"
        />
        {errors.nom && <p className="text-red-500 text-xs">{errors.nom}</p>}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="site-adresse" className="text-sm font-medium">
          Adresse <span className="text-red-500">*</span>
        </Label>
        <Input
          id="site-adresse"
          value={formData.adresse}
          onChange={(e) => { setFormData({ ...formData, adresse: e.target.value }); setErrors({...errors, adresse: ''}); }}
          placeholder="123 rue de l'Industrie"
          className={errors.adresse ? 'border-red-500' : ''}
        />
        {errors.adresse && <p className="text-red-500 text-xs">{errors.adresse}</p>}
      </div>

      {/* City / Postal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="site-code_postal" className="text-sm font-medium">
            Code postal <span className="text-red-500">*</span>
          </Label>
          <Input
            id="site-code_postal"
            value={formData.code_postal}
            onChange={(e) => { setFormData({ ...formData, code_postal: e.target.value }); setErrors({...errors, code_postal: ''}); }}
            placeholder="75001"
            className={errors.code_postal ? 'border-red-500' : ''}
          />
          {errors.code_postal && <p className="text-red-500 text-xs">{errors.code_postal}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-ville" className="text-sm font-medium">
            Ville <span className="text-red-500">*</span>
          </Label>
          <Input
            id="site-ville"
            value={formData.ville}
            onChange={(e) => { setFormData({ ...formData, ville: e.target.value }); setErrors({...errors, ville: ''}); }}
            placeholder="Paris"
            className={errors.ville ? 'border-red-500' : ''}
          />
          {errors.ville && <p className="text-red-500 text-xs">{errors.ville}</p>}
        </div>
      </div>

      <Separator className="my-4" />
      <p className="text-sm text-slate-500 font-medium">Contact sur site (optionnel)</p>

      {/* Contact */}
      <div className="space-y-2">
        <Label htmlFor="site-contact_nom" className="text-sm font-medium">Nom du contact</Label>
        <Input
          id="site-contact_nom"
          value={formData.contact_nom}
          onChange={(e) => setFormData({ ...formData, contact_nom: e.target.value })}
          placeholder="Jean Dupont"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="site-contact_telephone" className="text-sm font-medium">Téléphone</Label>
          <Input
            id="site-contact_telephone"
            value={formData.contact_telephone}
            onChange={(e) => setFormData({ ...formData, contact_telephone: e.target.value })}
            placeholder="06 12 34 56 78"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-contact_email" className="text-sm font-medium">Email</Label>
          <Input
            id="site-contact_email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            placeholder="contact@site.fr"
          />
        </div>
      </div>

      <Separator className="my-4" />
      <p className="text-sm text-slate-500 font-medium">Accès (optionnel)</p>

      {/* Access */}
      <div className="space-y-2">
        <Label htmlFor="site-horaires_acces" className="text-sm font-medium">Horaires d'accès</Label>
        <Input
          id="site-horaires_acces"
          value={formData.horaires_acces}
          onChange={(e) => setFormData({ ...formData, horaires_acces: e.target.value })}
          placeholder="Lun-Ven 8h-18h"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-instructions_acces" className="text-sm font-medium">Instructions d'accès</Label>
        <Textarea
          id="site-instructions_acces"
          value={formData.instructions_acces}
          onChange={(e) => setFormData({ ...formData, instructions_acces: e.target.value })}
          placeholder="Code portail: 1234, Badge à récupérer..."
          rows={2}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-notes" className="text-sm font-medium">Notes internes</Label>
        <Textarea
          id="site-notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notes pour les techniciens..."
          rows={2}
          className="resize-none"
        />
      </div>

      <DialogFooter className="pt-4 sticky bottom-0 bg-white">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading} data-testid="site-submit-btn">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {initialData ? 'Mettre à jour' : 'Créer le site'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Client Detail Component
export const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canUseMultiSites, currentPlan, user } = useAuth();
  const [client, setClient] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSiteDialog, setShowSiteDialog] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [siteFormLoading, setSiteFormLoading] = useState(false);
  const [portalLink, setPortalLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [clientData, interventionsData, devisData, facturesData, sitesData] = await Promise.all([
        clientsApi.get(id),
        interventionsApi.list(user?.entreprise_id, { client_id: id }),
        devisApi.list(user?.entreprise_id, { client_id: id }),
        facturesApi.list(user?.entreprise_id, { client_id: id }),
        sitesApi.list(id),
      ]);
      setClient(clientData);
      setInterventions(interventionsData);
      setDevis(devisData);
      setFactures(facturesData);
      setSites(sitesData);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await clientsApi.update(id, { statut: 'archive' });
      toast.success('Client archivé');
      navigate('/dashboard/clients');
    } catch (error) {
      console.error('Error archiving client:', error);
      toast.error(error.message || 'Erreur lors de l\'archivage');
    }
  };

  const handleRestore = async () => {
    try {
      await clientsApi.update(id, { statut: 'actif' });
      toast.success('Client restauré');
      fetchData();
    } catch (error) {
      console.error('Error restoring client:', error);
      toast.error(error.message || 'Erreur lors de la restauration');
    }
  };

  const handlePermanentDelete = async () => {
    try {
      await clientsApi.delete(id);
      toast.success('Client supprimé définitivement');
      navigate('/dashboard/clients');
    } catch (error) {
      console.error('Error permanently deleting client:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Site management
  const handleSiteSubmit = async (siteData) => {
    setSiteFormLoading(true);
    try {
      if (editingSite) {
        await sitesApi.update(editingSite.id, siteData);
        toast.success('Site mis à jour');
      } else {
        await sitesApi.create({ ...siteData, client_id: id });
        toast.success('Site créé');
      }
      setShowSiteDialog(false);
      setEditingSite(null);
      // Refresh sites
      const sitesData = await sitesApi.list(id);
      setSites(sitesData);
    } catch (error) {
      console.error('Error saving site:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSiteFormLoading(false);
    }
  };

  const handleDeleteSite = async (siteId) => {
    try {
      await sitesApi.delete(siteId);
      toast.success('Site supprimé');
      setSites(sites.filter(s => s.id !== siteId));
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const openEditSite = (site) => {
    setEditingSite(site);
    setShowSiteDialog(true);
  };

  const openNewSite = () => {
    setEditingSite(null);
    setShowSiteDialog(true);
  };

  const getPortalLink = async () => {
    try {
      // Generate portal link using client's portal_token or create one
      if (client?.portal_token) {
        const fullUrl = `${window.location.origin}/portal/client/${client.portal_token}`;
        setPortalLink(fullUrl);
      } else {
        // Generate a new token and save it
        const newToken = crypto.randomUUID();
        await clientsApi.update(id, { portal_token: newToken });
        const fullUrl = `${window.location.origin}/portal/client/${newToken}`;
        setPortalLink(fullUrl);
      }
    } catch (error) {
      console.error('Error getting portal link:', error);
    }
  };

  const copyPortalLink = () => {
    if (portalLink) {
      navigator.clipboard.writeText(portalLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!client) {
    return <div>Client non trouvé</div>;
  }

  return (
    <div className="space-y-6" data-testid="client-detail">
      {/* Archived Banner */}
      {client.archived && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Ce client est archivé. Il n'apparaît plus dans la liste principale.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/clients')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Clients
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">
              {client.nom} {client.prenom}
            </h1>
            <Badge variant="secondary" className={client.type_client === 'professionnel' ? 'bg-blue-100 text-blue-700' : ''}>
              {client.type_client === 'professionnel' ? 'Professionnel' : 'Particulier'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/dashboard/clients/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          {isAdmin && !client.archived && (
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archiver ce client ?</DialogTitle>
                </DialogHeader>
                <p className="text-slate-600">
                  Le client sera archivé et masqué de la liste principale. Vous pourrez le restaurer ou le supprimer définitivement ultérieurement.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => { handleDelete(); setShowDeleteDialog(false); }}
                  >
                    Archiver
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {isAdmin && client.archived && (
            <>
              <Button 
                variant="outline" 
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={handleRestore}
              >
                Restaurer
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer définitivement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">Supprimer définitivement ?</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-slate-600">
                      Cette action est <strong>irréversible</strong>. Toutes les données associées seront supprimées :
                    </p>
                    <ul className="text-sm text-slate-500 list-disc pl-5 space-y-1">
                      <li>Interventions et photos</li>
                      <li>Devis et factures</li>
                      <li>Sites et contacts</li>
                      <li>Historique de communications</li>
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Annuler</Button>
                    <Button 
                      variant="destructive"
                      onClick={handlePermanentDelete}
                    >
                      Supprimer définitivement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.telephone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <a href={`tel:${client.telephone}`} className="text-blue-600 hover:underline">{client.telephone}</a>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>
              </div>
            )}
            {client.adresse && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <span>{client.adresse}, {client.code_postal} {client.ville}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Activité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-slate-900">{interventions.length}</p>
                <p className="text-xs text-slate-500">Interventions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{devis.length}</p>
                <p className="text-xs text-slate-500">Devis</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{factures.length}</p>
                <p className="text-xs text-slate-500">Factures</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(factures.filter(f => f.statut === 'payee').reduce((sum, f) => sum + f.total_ttc, 0))}
                </p>
                <p className="text-xs text-slate-500">CA total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/interventions/new', { state: { client_id: id } })}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Nouvelle intervention
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/devis/new', { state: { client_id: id } })}
            >
              <FileText className="w-4 h-4 mr-2" />
              Nouveau devis
            </Button>
            <hr className="my-2" />
            {!portalLink ? (
              <Button
                variant="outline"
                className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={getPortalLink}
                data-testid="get-portal-link-btn"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Obtenir lien portail client
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input 
                    value={portalLink} 
                    readOnly 
                    className="text-xs font-mono"
                    data-testid="portal-link-input"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPortalLink}
                    data-testid="copy-portal-link-btn"
                  >
                    {linkCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <a href={portalLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="link" size="sm" className="text-blue-600 p-0">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Ouvrir le portail
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sites Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPinned className="w-4 h-4 text-slate-500" />
              Sites / Adresses d'intervention
              {!canUseMultiSites && (
                <Badge variant="outline" className="text-xs ml-2 bg-purple-50 text-purple-700 border-purple-200">
                  Entreprise
                </Badge>
              )}
            </CardTitle>
            {canUseMultiSites ? (
              <Button variant="outline" size="sm" onClick={openNewSite} data-testid="add-site-btn">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter un site
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard/settings?tab=subscription')}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Crown className="w-4 h-4 mr-1" />
                Passer à Entreprise
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!canUseMultiSites ? (
            <div className="text-center py-6 text-slate-500">
              <MapPinned className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">Fonctionnalité Multi-sites</p>
              <p className="text-sm mt-1">Gérez plusieurs adresses par client avec le plan Entreprise</p>
            </div>
          ) : sites.length > 0 ? (
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className={`p-4 rounded-lg border ${site.actif ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}
                  data-testid={`site-${site.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900">{site.nom}</h4>
                        {!site.actif && (
                          <Badge variant="secondary" className="bg-slate-200 text-slate-600">Inactif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="w-3 h-3" />
                        {site.adresse}, {site.code_postal} {site.ville}
                      </div>
                      {site.contact_nom && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <User className="w-3 h-3" />
                          {site.contact_nom}
                          {site.contact_telephone && (
                            <span className="ml-2">
                              <Phone className="w-3 h-3 inline mr-1" />
                              {site.contact_telephone}
                            </span>
                          )}
                        </div>
                      )}
                      {site.horaires_acces && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {site.horaires_acces}
                        </div>
                      )}
                      {site.instructions_acces && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">
                          <Info className="w-3 h-3" />
                          {site.instructions_acces}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditSite(site)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteSite(site.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : canUseMultiSites ? (
            <div className="text-center py-8 text-slate-500">
              <MapPinned className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Aucun site enregistré</p>
              <p className="text-xs text-slate-400 mt-1">
                Ajoutez des sites si ce client a plusieurs adresses d'intervention
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Site Form Dialog */}
      <Dialog open={showSiteDialog} onOpenChange={(open) => { setShowSiteDialog(open); if (!open) setEditingSite(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPinned className="w-5 h-5" />
              {editingSite ? 'Modifier le site' : 'Nouveau site'}
            </DialogTitle>
            <DialogDescription>
              {editingSite ? "Modifiez les informations du site" : "Ajoutez une nouvelle adresse d'intervention pour ce client"}
            </DialogDescription>
          </DialogHeader>
          <SiteForm
            initialData={editingSite}
            onSubmit={handleSiteSubmit}
            onCancel={() => { setShowSiteDialog(false); setEditingSite(null); }}
            loading={siteFormLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Devis */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Devis récents</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/devis', { state: { client_id: id } })}>
                Voir tous
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {devis.length > 0 ? (
              <div className="space-y-2">
                {devis.slice(0, 3).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 -mx-4 px-4"
                    onClick={() => navigate(`/dashboard/devis/${d.id}`)}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{d.numero_devis}</p>
                      <p className="text-xs text-slate-500">{formatDate(d.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(d.total_ttc)}</p>
                      <Badge variant="secondary" className={`status-${d.statut}`}>
                        {getStatusLabel(d.statut)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Aucun devis</p>
            )}
          </CardContent>
        </Card>

        {/* Factures */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Factures récentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/factures', { state: { client_id: id } })}>
                Voir toutes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {factures.length > 0 ? (
              <div className="space-y-2">
                {factures.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 -mx-4 px-4"
                    onClick={() => navigate(`/dashboard/factures/${f.id}`)}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{f.numero_facture}</p>
                      <p className="text-xs text-slate-500">{formatDate(f.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(f.total_ttc)}</p>
                      <Badge variant="secondary" className={`status-${f.statut}`}>
                        {getStatusLabel(f.statut)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Aucune facture</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
