import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Key, Webhook, Plus, Trash2, Copy, Check, AlertCircle, Play, Eye, EyeOff,
  RefreshCw, Info, Code, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

const APISettings = () => {
  const { user, entreprise } = useAuth();
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [keyForm, setKeyForm] = useState({
    name: '',
    permissions: ['read'],
    expires_in_days: null
  });

  const [webhookForm, setWebhookForm] = useState({
    url: '',
    events: [],
    description: ''
  });

  // Available webhook events
  const defaultWebhookEvents = [
    'intervention.created', 'intervention.updated', 'intervention.completed',
    'devis.created', 'devis.signed', 'facture.created', 'facture.paid',
    'client.created', 'client.updated'
  ];

  useEffect(() => {
    fetchData();
  }, [entreprise?.id]);

  const fetchData = async () => {
    if (!entreprise?.id) return;
    setLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        supabase.from('api_keys').select('*').eq('entreprise_id', entreprise.id),
        supabase.from('webhooks').select('*').eq('entreprise_id', entreprise.id)
      ]);
      setApiKeys(keysRes.data || []);
      setWebhooks(webhooksRes.data || []);
      setWebhookEvents(defaultWebhookEvents);
    } catch (error) {
      console.error('Error fetching API data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'ak_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateKey = async () => {
    try {
      const apiKey = generateApiKey();
      const expiresAt = keyForm.expires_in_days 
        ? new Date(Date.now() + keyForm.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase.from('api_keys').insert({
        entreprise_id: entreprise.id,
        name: keyForm.name,
        key_hash: apiKey, // In production, store hash not plain key
        permissions: keyForm.permissions,
        expires_at: expiresAt,
        created_by: user?.user_id
      }).select().single();

      if (error) throw error;

      setNewKey({ ...data, key: apiKey });
      setShowCreateKey(false);
      setKeyForm({ name: '', permissions: ['read'], expires_in_days: null });
      fetchData();
      toast.success('Clé API créée');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Révoquer cette clé API ?')) return;
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', keyId);
      if (error) throw error;
      fetchData();
      toast.success('Clé API révoquée');
    } catch (error) {
      toast.error('Erreur lors de la révocation');
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookForm.url.startsWith('https://')) {
      toast.error('L\'URL doit commencer par https://');
      return;
    }
    if (webhookForm.events.length === 0) {
      toast.error('Sélectionnez au moins un événement');
      return;
    }
    try {
      const { error } = await supabase.from('webhooks').insert({
        entreprise_id: entreprise.id,
        url: webhookForm.url,
        events: webhookForm.events,
        description: webhookForm.description,
        is_active: true
      });
      if (error) throw error;
      setShowCreateWebhook(false);
      setWebhookForm({ url: '', events: [], description: '' });
      fetchData();
      toast.success('Webhook créé');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm('Supprimer ce webhook ?')) return;
    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', webhookId);
      if (error) throw error;
      fetchData();
      toast.success('Webhook supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleWebhook = async (webhookId) => {
    try {
      const webhook = webhooks.find(w => w.id === webhookId);
      const { error } = await supabase.from('webhooks')
        .update({ is_active: !webhook?.is_active })
        .eq('id', webhookId);
      if (error) throw error;
      fetchData();
      toast.success('Webhook mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleTestWebhook = async (webhookId) => {
    try {
      const webhook = webhooks.find(w => w.id === webhookId);
      if (!webhook) return;
      
      // Send test webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'webhook.test',
          timestamp: new Date().toISOString(),
          data: { message: 'Test webhook from ACTOOS PRO' }
        })
      });
      
      if (response.ok) {
        toast.success('Test réussi!');
      } else {
        toast.error(`Test échoué: ${response.status}`);
      }
    } catch (error) {
      toast.error('Erreur lors du test');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copié!');
  };

  const toggleEventSelection = (event) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const togglePermission = (permission) => {
    setKeyForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" data-testid="api-settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">API & Intégrations</h1>
        <p className="text-slate-500">Gérez vos clés API et webhooks pour les intégrations tierces</p>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Clés API</CardTitle>
                  <CardDescription>
                    Créez des clés pour permettre aux applications externes d'accéder à vos données
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateKey(true)} data-testid="create-api-key-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle clé
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Key className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Aucune clé API créée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Préfixe</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Créée le</TableHead>
                      <TableHead>Dernière utilisation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                            {key.key_prefix}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.permissions?.map(p => (
                              <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDate(key.created_at)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDate(key.last_used_at)}
                        </TableCell>
                        <TableCell>
                          {key.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Révoquée</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {key.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeKey(key.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Webhooks</CardTitle>
                  <CardDescription>
                    Recevez des notifications en temps réel sur vos endpoints
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateWebhook(true)} data-testid="create-webhook-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Webhook className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Aucun webhook configuré</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Événements</TableHead>
                      <TableHead>Dernier envoi</TableHead>
                      <TableHead>Échecs</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {webhook.url}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events?.slice(0, 2).map(e => (
                              <Badge key={e} variant="secondary" className="text-xs">
                                {e.split('.')[0]}
                              </Badge>
                            ))}
                            {webhook.events?.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{webhook.events.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDate(webhook.last_triggered_at)}
                        </TableCell>
                        <TableCell>
                          {webhook.failure_count > 0 ? (
                            <Badge variant="destructive">{webhook.failure_count}</Badge>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {webhook.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Actif</Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestWebhook(webhook.id)}
                              title="Tester"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleWebhook(webhook.id)}
                              title={webhook.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {webhook.is_active ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWebhook(webhook.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-5 h-5" />
                Documentation API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Authentication */}
              <div>
                <h3 className="font-semibold mb-2">Authentification</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Incluez votre clé API dans le header de chaque requête :
                </p>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET "https://votre-domaine/api/public-api/v1/clients" \\
  -H "X-API-Key: actoos_votre_cle_api"`}
                </pre>
              </div>

              {/* Endpoints */}
              <div>
                <h3 className="font-semibold mb-2">Endpoints disponibles</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Clients */}
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/clients</code></TableCell>
                      <TableCell>Liste des clients</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge className="bg-emerald-600">POST</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/clients</code></TableCell>
                      <TableCell>Créer un client</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge className="bg-amber-600">PUT</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/clients/{'{id}'}</code></TableCell>
                      <TableCell>Modifier un client</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/clients/by-external-id/{'{external_id}'}</code></TableCell>
                      <TableCell>Rechercher par ID externe</TableCell>
                    </TableRow>
                    {/* Interventions */}
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/interventions</code></TableCell>
                      <TableCell>Liste des interventions</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge className="bg-emerald-600">POST</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/interventions</code></TableCell>
                      <TableCell>Créer une intervention</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge className="bg-amber-600">PUT</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/interventions/{'{id}'}</code></TableCell>
                      <TableCell>Modifier une intervention</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge className="bg-red-600">DELETE</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/interventions/{'{id}'}</code></TableCell>
                      <TableCell>Annuler une intervention</TableCell>
                    </TableRow>
                    {/* Devis & Factures */}
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/devis</code></TableCell>
                      <TableCell>Liste des devis</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/public-api/v1/factures</code></TableCell>
                      <TableCell>Liste des factures</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* External ID */}
              <div>
                <h3 className="font-semibold mb-2">Synchronisation ERP/CRM</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Utilisez le champ <code>external_id</code> pour lier vos données Actoos à votre système existant :
                </p>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST "https://votre-domaine/api/public-api/v1/clients" \\
  -H "X-API-Key: actoos_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com",
    "telephone": "0612345678",
    "external_id": "CRM-12345"
  }'`}
                </pre>
              </div>

              {/* Webhooks */}
              <div>
                <h3 className="font-semibold mb-2">Événements Webhook</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {webhookEvents.map(event => (
                    <Badge key={event} variant="outline" className="justify-start">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Signature verification */}
              <div>
                <h3 className="font-semibold mb-2">Vérification de signature Webhook</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Chaque webhook inclut une signature HMAC-SHA256 dans le header <code>X-Actoos-Signature</code>.
                </p>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une clé API</DialogTitle>
            <DialogDescription>
              Cette clé permettra d'accéder à votre compte via l'API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom de la clé</Label>
              <Input
                value={keyForm.name}
                onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                placeholder="Ex: Integration ERP"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {['read', 'write', 'webhook', 'admin'].map(perm => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={keyForm.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    <span className="text-sm capitalize">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Expiration</Label>
              <Select
                value={keyForm.expires_in_days?.toString() || 'never'}
                onValueChange={(v) => setKeyForm({ ...keyForm, expires_in_days: v === 'never' ? null : parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Jamais</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                  <SelectItem value="365">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateKey(false)}>Annuler</Button>
            <Button onClick={handleCreateKey} disabled={!keyForm.name}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show New Key Dialog */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clé API créée</DialogTitle>
            <DialogDescription>
              Copiez cette clé maintenant. Elle ne sera plus affichée.
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Conservez cette clé en lieu sûr. Elle ne peut pas être récupérée.
            </AlertDescription>
          </Alert>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={newKey?.key || ''}
              readOnly
              className="pr-20 font-mono text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(newKey?.key)}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>J'ai copié ma clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un webhook</DialogTitle>
            <DialogDescription>
              Recevez des notifications en temps réel sur votre endpoint
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>URL de callback (HTTPS requis)</Label>
              <Input
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                placeholder="https://votre-serveur.com/webhook"
              />
            </div>
            <div>
              <Label>Description (optionnel)</Label>
              <Input
                value={webhookForm.description}
                onChange={(e) => setWebhookForm({ ...webhookForm, description: e.target.value })}
                placeholder="Ex: Synchronisation ERP"
              />
            </div>
            <div>
              <Label>Événements à écouter</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                {webhookEvents.map(event => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={webhookForm.events.includes(event)}
                      onCheckedChange={() => toggleEventSelection(event)}
                    />
                    <span>{event}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>Annuler</Button>
            <Button onClick={handleCreateWebhook}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default APISettings;
