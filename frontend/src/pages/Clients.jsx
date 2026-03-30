import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { formatDate, formatCurrency, getStatusLabel } from '../lib/utils';
import {
  Plus, Search, Phone, Mail, MapPin, User, Building2, ChevronLeft, 
  Edit, Trash2, FileText, Receipt, Calendar, Loader2, ExternalLink, Copy, Check
} from 'lucide-react';

// Client List Component
export const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { api } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async (searchQuery = '') => {
    try {
      const params = searchQuery ? { search: searchQuery } : {};
      const response = await api.get('/clients', { params });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClients(search);
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

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
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
        </CardContent>
      </Card>

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
  const { api } = useAuth();
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
      const response = await api.get(`/clients/${id}`);
      setFormData(response.data);
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
        await api.put(`/clients/${id}`, formData);
      } else {
        await api.post('/clients', formData);
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

// Client Detail Component
export const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, isAdmin } = useAuth();
  const [client, setClient] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [portalLink, setPortalLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [clientRes, interventionsRes, devisRes, facturesRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get('/interventions', { params: { client_id: id } }),
        api.get('/devis', { params: { client_id: id } }),
        api.get('/factures', { params: { client_id: id } }),
      ]);
      setClient(clientRes.data);
      setInterventions(interventionsRes.data);
      setDevis(devisRes.data);
      setFactures(facturesRes.data);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/clients/${id}`);
      navigate('/dashboard/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const getPortalLink = async () => {
    try {
      const response = await api.get(`/clients/${id}/portal-link`);
      const fullUrl = `${window.location.origin}${response.data.portal_url}`;
      setPortalLink(fullUrl);
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
          {isAdmin && (
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Supprimer ce client ?</DialogTitle>
                </DialogHeader>
                <p className="text-slate-600">Cette action est irréversible.</p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
                  <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
