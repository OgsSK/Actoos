import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';
import { 
  Building2, FileText, Check, Loader2, Bell, MessageSquare, 
  CheckCircle, XCircle, ExternalLink, Info, Palette, Upload, 
  Tags, Plus, Pencil, Trash2, Wrench, Globe, Coins, CreditCard,
  Calendar, Link2, Unlink, DollarSign, Shield, Clock, AlertTriangle,
  Database, Trash, Eye, Lock, Key
} from 'lucide-react';
import { toast } from 'sonner';
import PlanUsageWidget from '../components/PlanUsageWidget';

// Default category icons and colors
const CATEGORY_ICONS = ['wrench', 'zap', 'sparkles', 'thermometer', 'hammer', 'cog', 'droplet', 'wind', 'home', 'tool'];
const CATEGORY_COLORS = [
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Vert', value: '#10B981' },
  { name: 'Jaune', value: '#F59E0B' },
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Gris', value: '#6B7280' },
];

// Categories Manager Component
const CategoriesManager = ({ api }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    icone: 'wrench',
    couleur: '#3B82F6'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      nom: '',
      description: '',
      icone: 'wrench',
      couleur: '#3B82F6'
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const openEditForm = (category) => {
    setFormData({
      code: category.code,
      nom: category.nom,
      description: category.description || '',
      icone: category.icone || 'wrench',
      couleur: category.couleur || '#3B82F6'
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.nom) {
      toast.error('Le code et le nom sont obligatoires');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
        toast.success('Catégorie mise à jour');
      } else {
        await api.post('/categories', formData);
        toast.success('Catégorie créée');
      }
      fetchCategories();
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId, categoryName) => {
    try {
      await api.delete(`/categories/${categoryId}`);
      toast.success(`Catégorie "${categoryName}" supprimée`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const categoryIcons = {
    wrench: '🔧',
    zap: '⚡',
    sparkles: '✨',
    thermometer: '🌡️',
    hammer: '🔨',
    cog: '⚙️',
    droplet: '💧',
    wind: '💨',
    home: '🏠',
    tool: '🛠️'
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Catégories d'interventions</CardTitle>
              <CardDescription>
                Gérez les types d'interventions que vos techniciens peuvent effectuer
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} data-testid="add-category-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Tags className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune catégorie</p>
              <p className="text-sm">Créez votre première catégorie pour commencer</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  data-testid={`category-${cat.code}`}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: cat.couleur }}
                    >
                      {categoryIcons[cat.icone] || '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{cat.nom}</h4>
                      <p className="text-xs text-slate-500 truncate">{cat.code}</p>
                      {cat.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openEditForm(cat)}
                      data-testid={`edit-category-${cat.code}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer {cat.nom} ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette catégorie sera désactivée. Les interventions existantes ne seront pas affectées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(cat.id, cat.nom)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5" />
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="ex: plomberie"
                  disabled={!!editingCategory}
                  data-testid="category-code"
                />
                <p className="text-xs text-slate-500">Identifiant unique (non modifiable)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="ex: Plomberie"
                  data-testid="category-nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description optionnelle de la catégorie"
                rows={2}
                data-testid="category-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icône</Label>
                <div className="grid grid-cols-5 gap-2">
                  {CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icone: icon }))}
                      className={`p-2 rounded-lg text-lg transition-colors ${
                        formData.icone === icon 
                          ? 'bg-blue-100 ring-2 ring-blue-500' 
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                      data-testid={`icon-${icon}`}
                    >
                      {categoryIcons[icon]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, couleur: color.value }))}
                      className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${
                        formData.couleur === color.value 
                          ? 'ring-2 ring-blue-500' 
                          : 'hover:bg-slate-100'
                      }`}
                      data-testid={`color-${color.name}`}
                    >
                      <div 
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-xs">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Aperçu</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: formData.couleur }}
                >
                  {categoryIcons[formData.icone] || '📋'}
                </div>
                <div>
                  <p className="font-medium">{formData.nom || 'Nom de la catégorie'}</p>
                  <p className="text-xs text-slate-500">{formData.code || 'code'}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="save-category-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCategory ? 'Mettre à jour' : 'Créer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Document Settings Component - Conditions générales, footers, etc.
const DocumentSettingsForm = ({ api }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    conditions_generales: '',
    message_client_devis: '',
    message_client_facture: '',
    validite_devis_jours: 30,
    devis_footer: '',
    facture_footer: '',
    conditions_paiement: '',
    delai_paiement_jours: 30,
    mentions_legales: '',
    prefixe_devis: 'D',
    prefixe_facture: 'F'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings/documents');
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading document settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/documents', settings);
      toast.success('Paramètres des documents enregistrés');
    } catch (error) {
      console.error('Error saving document settings:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Conditions générales */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Conditions générales de vente
          </CardTitle>
          <CardDescription>
            Ce texte apparaîtra automatiquement sur tous vos devis et factures (sauf si modifié localement)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={settings.conditions_generales}
              onChange={(e) => handleChange('conditions_generales', e.target.value)}
              rows={6}
              placeholder="Exemple: Tout devis accepté engage le client. Les travaux seront réalisés dans un délai de X jours après acceptation..."
              data-testid="doc-conditions-generales"
            />
            <p className="text-xs text-slate-500">
              Conseils: Incluez vos conditions de paiement, délais, garanties, etc.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Message au client - Devis */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message au client
          </CardTitle>
          <CardDescription>
            Message personnalisé affiché sur vos documents (pré-rempli automatiquement, modifiable par devis/facture)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Message par défaut - Devis</Label>
            <Textarea
              value={settings.message_client_devis}
              onChange={(e) => handleChange('message_client_devis', e.target.value)}
              rows={3}
              placeholder="Exemple: Merci pour votre confiance. N'hésitez pas à nous contacter pour toute question."
              data-testid="doc-message-client-devis"
            />
          </div>
          <div className="space-y-2">
            <Label>Message par défaut - Factures</Label>
            <Textarea
              value={settings.message_client_facture}
              onChange={(e) => handleChange('message_client_facture', e.target.value)}
              rows={3}
              placeholder="Exemple: Merci pour votre confiance. En cas de question, contactez-nous."
              data-testid="doc-message-client-facture"
            />
          </div>
        </CardContent>
      </Card>

      {/* Validité par défaut */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Validité des devis</CardTitle>
          <CardDescription>
            Durée de validité par défaut pour vos nouveaux devis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label>Validité par défaut (jours)</Label>
            <Input
              type="number"
              value={settings.validite_devis_jours}
              onChange={(e) => handleChange('validite_devis_jours', parseInt(e.target.value) || 30)}
              min={1}
              max={365}
              data-testid="doc-validite-devis"
            />
            <p className="text-xs text-slate-500">Cette valeur sera pré-remplie lors de la création d'un nouveau devis</p>
          </div>
        </CardContent>
      </Card>

      {/* Conditions de paiement */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Conditions de paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condition de paiement par défaut</Label>
              <Input
                value={settings.conditions_paiement}
                onChange={(e) => handleChange('conditions_paiement', e.target.value)}
                placeholder="Paiement à réception de facture"
                data-testid="doc-conditions-paiement"
              />
            </div>
            <div className="space-y-2">
              <Label>Délai de paiement (jours)</Label>
              <Input
                type="number"
                value={settings.delai_paiement_jours}
                onChange={(e) => handleChange('delai_paiement_jours', parseInt(e.target.value) || 30)}
                min={0}
                max={365}
                data-testid="doc-delai-paiement"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pieds de page */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Pieds de page des documents</CardTitle>
          <CardDescription>
            Textes affichés en bas de vos devis et factures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pied de page - Devis</Label>
            <Textarea
              value={settings.devis_footer}
              onChange={(e) => handleChange('devis_footer', e.target.value)}
              rows={2}
              placeholder="Devis valable 30 jours. TVA non applicable, art. 293 B du CGI."
              data-testid="doc-devis-footer"
            />
          </div>
          <div className="space-y-2">
            <Label>Pied de page - Factures</Label>
            <Textarea
              value={settings.facture_footer}
              onChange={(e) => handleChange('facture_footer', e.target.value)}
              rows={2}
              placeholder="En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée."
              data-testid="doc-facture-footer"
            />
          </div>
          <div className="space-y-2">
            <Label>Mentions légales additionnelles</Label>
            <Textarea
              value={settings.mentions_legales}
              onChange={(e) => handleChange('mentions_legales', e.target.value)}
              rows={2}
              placeholder="SIRET, RCS, N° TVA Intracommunautaire, etc. (si non déjà dans l'entête)"
              data-testid="doc-mentions-legales"
            />
          </div>
        </CardContent>
      </Card>

      {/* Numérotation */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Numérotation des documents</CardTitle>
          <CardDescription>
            Préfixes pour les numéros de devis et factures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Préfixe devis</Label>
              <Input
                value={settings.prefixe_devis}
                onChange={(e) => handleChange('prefixe_devis', e.target.value.toUpperCase())}
                placeholder="D"
                maxLength={5}
                className="uppercase"
                data-testid="doc-prefixe-devis"
              />
              <p className="text-xs text-slate-500">Ex: D-2024-001</p>
            </div>
            <div className="space-y-2">
              <Label>Préfixe factures</Label>
              <Input
                value={settings.prefixe_facture}
                onChange={(e) => handleChange('prefixe_facture', e.target.value.toUpperCase())}
                placeholder="F"
                maxLength={5}
                className="uppercase"
                data-testid="doc-prefixe-facture"
              />
              <p className="text-xs text-slate-500">Ex: F-2024-001</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} data-testid="save-document-settings">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
};

// SMS Configuration Component - Supports shared Actoos or custom Twilio
const SMSConfiguration = ({ api, smsStatus, onStatusChange }) => {
  const [mode, setMode] = useState(smsStatus?.use_shared !== false ? 'shared' : 'custom');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [customConfig, setCustomConfig] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: ''
  });

  const handleModeChange = async (newMode) => {
    setMode(newMode);
    if (newMode === 'shared') {
      // Switch to shared Actoos Twilio
      setSaving(true);
      try {
        await api.put('/sms/config', { use_shared: true });
        toast.success('Configuration SMS mise à jour - Mode service Actoos');
        onStatusChange?.();
      } catch (error) {
        console.error('Error switching to shared mode:', error);
        toast.error(error.response?.data?.detail || 'Erreur lors du changement de mode');
      } finally {
        setSaving(false);
      }
    } else {
      setShowCustomForm(true);
    }
  };

  const handleCustomConfigSave = async () => {
    if (!customConfig.twilio_account_sid || !customConfig.twilio_auth_token || !customConfig.twilio_phone_number) {
      toast.error('Tous les champs sont obligatoires pour la configuration personnalisée');
      return;
    }
    
    setSaving(true);
    try {
      await api.put('/sms/config', {
        use_shared: false,
        ...customConfig
      });
      toast.success('Configuration Twilio personnalisée enregistrée');
      setShowCustomForm(false);
      onStatusChange?.();
    } catch (error) {
      console.error('Error saving custom config:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde. Vérifiez vos identifiants Twilio.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Veuillez entrer un numéro de téléphone pour le test');
      return;
    }
    
    setTesting(true);
    try {
      const response = await api.post(`/sms/test?phone_number=${encodeURIComponent(testPhone)}`);
      toast.success(`SMS de test envoyé à ${testPhone} (mode: ${response.data.mode})`);
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast.error(error.response?.data?.detail || 'Échec de l\'envoi du SMS de test');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shared Actoos Option */}
        <div 
          onClick={() => handleModeChange('shared')}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            mode === 'shared' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
          data-testid="sms-mode-shared"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              mode === 'shared' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-900">Service Actoos (recommandé)</h4>
              <p className="text-sm text-slate-500 mt-1">
                Utilisez le service SMS partagé d'Actoos. Aucune configuration requise.
              </p>
              {smsStatus?.shared_available ? (
                <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Disponible
                </Badge>
              ) : (
                <Badge className="mt-2 bg-amber-100 text-amber-700">
                  <Clock className="w-3 h-3 mr-1" />
                  Bientôt disponible
                </Badge>
              )}
            </div>
            {mode === 'shared' && (
              <CheckCircle className="w-5 h-5 text-blue-500" />
            )}
          </div>
        </div>

        {/* Custom Twilio Option */}
        <div 
          onClick={() => handleModeChange('custom')}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            mode === 'custom' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
          data-testid="sms-mode-custom"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              mode === 'custom' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-900">Mon propre Twilio</h4>
              <p className="text-sm text-slate-500 mt-1">
                Utilisez votre compte Twilio avec votre propre numéro de téléphone.
              </p>
              {smsStatus?.has_custom_config && (
                <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configuré
                </Badge>
              )}
            </div>
            {mode === 'custom' && (
              <CheckCircle className="w-5 h-5 text-blue-500" />
            )}
          </div>
        </div>
      </div>

      {/* Custom Configuration Form */}
      {showCustomForm && mode === 'custom' && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="w-4 h-4" />
              Configuration Twilio personnalisée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twilio_sid">Account SID</Label>
                <Input
                  id="twilio_sid"
                  value={customConfig.twilio_account_sid}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, twilio_account_sid: e.target.value }))}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="font-mono text-sm"
                  data-testid="twilio-sid-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio_token">Auth Token</Label>
                <Input
                  id="twilio_token"
                  type="password"
                  value={customConfig.twilio_auth_token}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, twilio_auth_token: e.target.value }))}
                  placeholder="Votre Auth Token Twilio"
                  data-testid="twilio-token-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio_phone">Numéro de téléphone</Label>
                <Input
                  id="twilio_phone"
                  value={customConfig.twilio_phone_number}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, twilio_phone_number: e.target.value }))}
                  placeholder="+32470123456"
                  data-testid="twilio-phone-input"
                />
                <p className="text-xs text-slate-500">Format international (ex: +32470123456)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleCustomConfigSave} disabled={saving} data-testid="save-twilio-config">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setShowCustomForm(false)}>
                Annuler
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Console Twilio
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test SMS Section */}
      {smsStatus?.configured && (
        <div className="pt-4 border-t border-slate-200">
          <Label className="text-sm font-medium mb-2 block">Tester la configuration</Label>
          <div className="flex items-center gap-3">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+32470123456"
              className="max-w-xs"
              data-testid="test-phone-input"
            />
            <Button 
              variant="outline" 
              onClick={handleTestSMS} 
              disabled={testing || !testPhone}
              data-testid="send-test-sms"
            >
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              Envoyer un SMS test
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Entrez votre numéro pour recevoir un SMS de test et vérifier la configuration.
          </p>
        </div>
      )}

      {/* Status Info */}
      {smsStatus?.configured && (
        <Alert className="bg-emerald-50 border-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            <strong>SMS actif</strong> — Mode: {smsStatus.mode === 'shared' ? 'Service Actoos' : 'Twilio personnalisé'}
            {smsStatus.phone_number && smsStatus.mode === 'custom' && (
              <span className="block text-sm mt-1">Numéro: {smsStatus.phone_number}</span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// WhatsApp & Integrations Hub Component
const IntegrationsHub = ({ api }) => {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState(null);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [whatsAppMode, setWhatsAppMode] = useState('shared');
  const [showWhatsAppForm, setShowWhatsAppForm] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [whatsAppConfig, setWhatsAppConfig] = useState({
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: ''
  });

  useEffect(() => {
    loadIntegrationsStatus();
  }, []);

  const loadIntegrationsStatus = async () => {
    try {
      const response = await api.get('/integrations/status');
      setIntegrations(response.data);
      setWhatsAppMode(response.data.whatsapp?.use_shared !== false ? 'shared' : 'custom');
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppModeChange = async (newMode) => {
    setWhatsAppMode(newMode);
    if (newMode === 'shared') {
      setSavingWhatsApp(true);
      try {
        await api.put('/integrations/whatsapp/config', { use_shared: true });
        toast.success('WhatsApp configuré en mode service Actoos');
        loadIntegrationsStatus();
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Erreur');
      } finally {
        setSavingWhatsApp(false);
      }
    } else {
      setShowWhatsAppForm(true);
    }
  };

  const handleWhatsAppCustomSave = async () => {
    if (!whatsAppConfig.whatsapp_access_token || !whatsAppConfig.whatsapp_phone_number_id) {
      toast.error('Access Token et Phone Number ID sont requis');
      return;
    }
    
    setSavingWhatsApp(true);
    try {
      await api.put('/integrations/whatsapp/config', {
        use_shared: false,
        ...whatsAppConfig
      });
      toast.success('Configuration WhatsApp personnalisée enregistrée');
      setShowWhatsAppForm(false);
      loadIntegrationsStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la configuration');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }
    
    setTestingWhatsApp(true);
    try {
      const response = await api.post(`/integrations/whatsapp/test?phone_number=${encodeURIComponent(testPhone)}`);
      toast.success(`Message WhatsApp envoyé à ${testPhone}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de l\'envoi');
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const handleMessagingPreference = async (channel) => {
    try {
      await api.put('/integrations/messaging-preference', { preferred_channel: channel });
      toast.success(`Canal préféré: ${channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : 'Email'}`);
      loadIntegrationsStatus();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Intégrations & Messagerie</h3>
        <p className="text-sm text-slate-500 mt-1">
          Configurez WhatsApp Business, SMS et synchronisez vos services externes
        </p>
      </div>

      {/* Messaging Preference */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Canal de notification préféré</CardTitle>
          <CardDescription>
            Choisissez le canal principal pour les notifications clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'green', recommended: true },
              { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'blue', recommended: false },
              { value: 'email', label: 'Email', icon: Bell, color: 'purple', recommended: false }
            ].map(({ value, label, icon: Icon, color, recommended }) => (
              <button
                key={value}
                onClick={() => handleMessagingPreference(value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  integrations?.messaging_preference === value
                    ? `border-${color}-500 bg-${color}-50`
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                data-testid={`messaging-pref-${value}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${integrations?.messaging_preference === value ? `text-${color}-600` : 'text-slate-400'}`} />
                  <span className="font-medium">{label}</span>
                </div>
                {recommended && (
                  <Badge className="bg-green-100 text-green-700 text-xs">Recommandé</Badge>
                )}
                {integrations?.messaging_preference === value && (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-2" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Business */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">WhatsApp Business</CardTitle>
                <CardDescription>
                  Envoyez des notifications via WhatsApp (98% taux d'ouverture)
                </CardDescription>
              </div>
            </div>
            {integrations?.whatsapp?.configured ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                {integrations.whatsapp.mode === 'shared' ? 'Service Actoos' : 'Configuré'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                Non configuré
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => handleWhatsAppModeChange('shared')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                whatsAppMode === 'shared' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
              }`}
              data-testid="whatsapp-mode-shared"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  whatsAppMode === 'shared' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">Service Actoos (recommandé)</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    WhatsApp partagé d'Actoos. Aucune configuration requise.
                  </p>
                  {integrations?.whatsapp?.shared_available ? (
                    <Badge className="mt-2 bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Disponible
                    </Badge>
                  ) : (
                    <Badge className="mt-2 bg-amber-100 text-amber-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Bientôt disponible
                    </Badge>
                  )}
                </div>
                {whatsAppMode === 'shared' && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>

            <div
              onClick={() => handleWhatsAppModeChange('custom')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                whatsAppMode === 'custom' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
              }`}
              data-testid="whatsapp-mode-custom"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  whatsAppMode === 'custom' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Key className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">Mon propre WhatsApp Business</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Utilisez votre propre compte Meta Business / WhatsApp.
                  </p>
                  {integrations?.whatsapp?.has_custom_config && (
                    <Badge className="mt-2 bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configuré
                    </Badge>
                  )}
                </div>
                {whatsAppMode === 'custom' && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>
          </div>

          {/* Custom WhatsApp Form */}
          {showWhatsAppForm && whatsAppMode === 'custom' && (
            <Card className="border-slate-200 mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Configuration WhatsApp Business
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>Prérequis:</strong>
                    <ol className="list-decimal ml-4 mt-2 space-y-1">
                      <li>Créez un compte Meta Business sur <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">business.facebook.com</a></li>
                      <li>Accédez à la section WhatsApp dans Meta for Developers</li>
                      <li>Créez une application et obtenez vos credentials</li>
                      <li>Créez et faites approuver vos templates de messages</li>
                    </ol>
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Access Token (permanent)</Label>
                    <Input
                      type="password"
                      value={whatsAppConfig.whatsapp_access_token}
                      onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, whatsapp_access_token: e.target.value }))}
                      placeholder="EAAxxxxxxxx..."
                      data-testid="whatsapp-token-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input
                      value={whatsAppConfig.whatsapp_phone_number_id}
                      onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, whatsapp_phone_number_id: e.target.value }))}
                      placeholder="123456789012345"
                      data-testid="whatsapp-phone-id-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Account ID (optionnel)</Label>
                    <Input
                      value={whatsAppConfig.whatsapp_business_account_id}
                      onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, whatsapp_business_account_id: e.target.value }))}
                      placeholder="123456789012345"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handleWhatsAppCustomSave} disabled={savingWhatsApp} data-testid="save-whatsapp-config">
                    {savingWhatsApp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Enregistrer
                  </Button>
                  <Button variant="outline" onClick={() => setShowWhatsAppForm(false)}>
                    Annuler
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Documentation
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test WhatsApp */}
          {integrations?.whatsapp?.configured && (
            <div className="pt-4 border-t border-slate-200">
              <Label className="text-sm font-medium mb-2 block">Tester la configuration</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+32470123456"
                  className="max-w-xs"
                  data-testid="whatsapp-test-phone"
                />
                <Button
                  variant="outline"
                  onClick={handleTestWhatsApp}
                  disabled={testingWhatsApp || !testPhone}
                  data-testid="send-whatsapp-test"
                >
                  {testingWhatsApp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                  Tester WhatsApp
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Note: Les messages de test fonctionnent uniquement si le destinataire a envoyé un message dans les dernières 24h.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info about templates */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Templates WhatsApp:</strong> Les messages envoyés via WhatsApp Business utilisent des templates pré-approuvés par Meta pour les rappels d'intervention, notifications de devis/factures, et relances de paiement. Ces templates sont automatiquement configurés avec le service Actoos.
        </AlertDescription>
      </Alert>

      {/* Google Calendar Configuration */}
      <GoogleCalendarConfig api={api} integrations={integrations} onStatusChange={loadIntegrationsStatus} />
    </div>
  );
};

// Google Calendar Configuration Component
const GoogleCalendarConfig = ({ api, integrations, onStatusChange }) => {
  const [mode, setMode] = useState(integrations?.google_calendar?.use_shared !== false ? 'shared' : 'custom');
  const [saving, setSaving] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    google_client_id: '',
    google_client_secret: ''
  });

  const handleModeChange = async (newMode) => {
    setMode(newMode);
    if (newMode === 'shared') {
      setSaving(true);
      try {
        await api.put('/integrations/google-calendar/config', { use_shared: true });
        toast.success('Google Calendar configuré en mode service Actoos');
        onStatusChange?.();
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Erreur');
      } finally {
        setSaving(false);
      }
    } else {
      setShowCustomForm(true);
    }
  };

  const handleCustomSave = async () => {
    if (!customConfig.google_client_id || !customConfig.google_client_secret) {
      toast.error('Client ID et Client Secret sont requis');
      return;
    }
    
    setSaving(true);
    try {
      await api.put('/integrations/google-calendar/config', {
        use_shared: false,
        ...customConfig
      });
      toast.success('Configuration Google Calendar personnalisée enregistrée');
      setShowCustomForm(false);
      onStatusChange?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription>
                Synchronisez vos interventions avec Google Calendar
              </CardDescription>
            </div>
          </div>
          {integrations?.google_calendar?.connected ? (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connecté
            </Badge>
          ) : integrations?.google_calendar?.shared_available || integrations?.google_calendar?.has_custom_config ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Prêt à connecter
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              Configuration requise
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleModeChange('shared')}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              mode === 'shared' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
            }`}
            data-testid="gcal-mode-shared"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                mode === 'shared' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">Service Actoos</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Utilisez le service de synchronisation Actoos. Aucune configuration requise.
                </p>
                {integrations?.google_calendar?.shared_available ? (
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Disponible
                  </Badge>
                ) : (
                  <Badge className="mt-2 bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Non configuré
                  </Badge>
                )}
              </div>
              {mode === 'shared' && <CheckCircle className="w-5 h-5 text-blue-500" />}
            </div>
          </div>

          <div
            onClick={() => handleModeChange('custom')}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              mode === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
            }`}
            data-testid="gcal-mode-custom"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                mode === 'custom' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">Mes propres credentials Google</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Utilisez votre propre projet Google Cloud.
                </p>
                {integrations?.google_calendar?.has_custom_config && (
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configuré
                  </Badge>
                )}
              </div>
              {mode === 'custom' && <CheckCircle className="w-5 h-5 text-blue-500" />}
            </div>
          </div>
        </div>

        {/* Custom Google Config Form */}
        {showCustomForm && mode === 'custom' && (
          <Card className="border-slate-200 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="w-4 h-4" />
                Configuration Google OAuth
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Instructions:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Allez sur <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">console.cloud.google.com</a></li>
                    <li>Créez un projet ou sélectionnez-en un existant</li>
                    <li>Activez l'API "Google Calendar API"</li>
                    <li>Allez dans "Credentials" &gt; "Create Credentials" &gt; "OAuth 2.0 Client ID"</li>
                    <li>Ajoutez l'URI de redirection: <code className="bg-blue-100 px-1 rounded">{window.location.origin}/api/calendar/callback</code></li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    value={customConfig.google_client_id}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, google_client_id: e.target.value }))}
                    placeholder="123456789-xxxxxxxx.apps.googleusercontent.com"
                    data-testid="gcal-client-id-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <Input
                    type="password"
                    value={customConfig.google_client_secret}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, google_client_secret: e.target.value }))}
                    placeholder="GOCSPX-xxxxxx"
                    data-testid="gcal-client-secret-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleCustomSave} disabled={saving} data-testid="save-gcal-config">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => setShowCustomForm(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status message */}
        {(integrations?.google_calendar?.shared_available || integrations?.google_calendar?.has_custom_config) && !integrations?.google_calendar?.connected && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Configuration prête ! Utilisez le bouton "Connecter Google Calendar" ci-dessous pour autoriser l'accès à votre calendrier.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const SettingsPage = () => {
  const { api, entreprise, user, refreshUser, canUseAdvancedBranding, currentPlan } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [smsStatus, setSmsStatus] = useState({ configured: false, phone_number: null });
  const [loadingSmsStatus, setLoadingSmsStatus] = useState(true);
  
  // Currency and locale state
  const [currencies, setCurrencies] = useState([]);
  const [locales, setLocales] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [selectedLocale, setSelectedLocale] = useState('fr-FR');
  const [savingCurrency, setSavingCurrency] = useState(false);
  
  // Branding state
  const [brandingData, setBrandingData] = useState({
    logo_url: '',
    couleur_primaire: '#2563EB'
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    telephone: '',
    email: '',
    siret: '',
    tva_intra: '',
    conditions_generales: '',
  });

  const [notifSettings, setNotifSettings] = useState({
    sms_intervention_reminder: true,
    sms_devis_notification: true,
    sms_facture_notification: true,
    sms_payment_reminder: true,
    email_devis_notification: true,
    email_facture_notification: true,
    email_payment_reminder: true,
    auto_reminders_enabled: false,
  });

  useEffect(() => {
    if (entreprise) {
      setFormData({
        nom: entreprise.nom || '',
        adresse: entreprise.adresse || '',
        ville: entreprise.ville || '',
        code_postal: entreprise.code_postal || '',
        telephone: entreprise.telephone || '',
        email: entreprise.email || '',
        siret: entreprise.siret || '',
        tva_intra: entreprise.tva_intra || '',
        conditions_generales: entreprise.conditions_generales || '',
      });
      
      // Load branding settings
      setBrandingData({
        logo_url: entreprise.logo_url || '',
        couleur_primaire: entreprise.couleur_primaire || '#2563EB'
      });
      
      // Load currency and locale
      setSelectedCurrency(entreprise.devise || 'EUR');
      setSelectedLocale(entreprise.locale || 'fr-FR');
      
      // Load notification settings from entreprise
      if (entreprise.notification_settings) {
        setNotifSettings(prev => ({
          ...prev,
          ...entreprise.notification_settings
        }));
      }
    }
    
    // Load SMS status
    loadSmsStatus();
  }, [entreprise]);

  const loadSmsStatus = async () => {
    try {
      const response = await api.get('/sms/status');
      setSmsStatus(response.data);
    } catch (error) {
      console.error('Error loading SMS status:', error);
    } finally {
      setLoadingSmsStatus(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotifChange = (key, value) => {
    setNotifSettings(prev => ({ ...prev, [key]: value }));
  };

  // Load currencies and locales
  useEffect(() => {
    const fetchCurrenciesAndLocales = async () => {
      try {
        const [currRes, locRes] = await Promise.all([
          api.get('/currencies'),
          api.get('/locales')
        ]);
        setCurrencies(currRes.data);
        setLocales(locRes.data);
      } catch (error) {
        console.error('Error fetching currencies/locales:', error);
      }
    };
    fetchCurrenciesAndLocales();
  }, [api]);

  const handleCurrencyChange = async (devise) => {
    setSavingCurrency(true);
    try {
      await api.put(`/entreprise/currency?devise=${devise}`);
      setSelectedCurrency(devise);
      toast.success(`Devise changée en ${devise}`);
      refreshUser();
    } catch (error) {
      console.error('Error updating currency:', error);
      toast.error('Erreur lors du changement de devise');
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleLocaleChange = async (locale) => {
    setSavingCurrency(true);
    try {
      await api.put(`/entreprise/locale?locale=${locale}`);
      setSelectedLocale(locale);
      toast.success('Langue mise à jour');
      refreshUser();
    } catch (error) {
      console.error('Error updating locale:', error);
      toast.error('Erreur lors du changement de langue');
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await api.put('/entreprise', formData);
      setSuccess('Paramètres enregistrés avec succès');
      refreshUser();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleNotifSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/entreprise', {
        notification_settings: notifSettings
      });
      toast.success('Préférences de notification enregistrées');
      refreshUser();
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Paramètres</h1>
        <p className="text-slate-500">Configurez votre entreprise et vos notifications</p>
      </div>

      <Tabs defaultValue="entreprise" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="entreprise" className="flex items-center gap-2 whitespace-nowrap">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Entreprise</span>
              <span className="sm:hidden">Entrep.</span>
            </TabsTrigger>
            <TabsTrigger value="abonnement" className="flex items-center gap-2 whitespace-nowrap">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Abonnement</span>
              <span className="sm:hidden">Abo.</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2 whitespace-nowrap">
              <Tags className="w-4 h-4" />
              <span className="hidden sm:inline">Catégories</span>
              <span className="sm:hidden">Cat.</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 whitespace-nowrap">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notif.</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Doc.</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2 whitespace-nowrap">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Personnalisation</span>
              <span className="sm:hidden">Style</span>
            </TabsTrigger>
            <TabsTrigger value="regional" className="flex items-center gap-2 whitespace-nowrap">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Devise</span>
              <span className="sm:hidden">€</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2 whitespace-nowrap">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Intégrations</span>
              <span className="sm:hidden">Intég.</span>
            </TabsTrigger>
            <TabsTrigger value="gdpr" className="flex items-center gap-2 whitespace-nowrap">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">RGPD</span>
              <span className="sm:hidden">RGPD</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 whitespace-nowrap">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Sécurité</span>
              <span className="sm:hidden">Sécu.</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Abonnement Tab */}
        <TabsContent value="abonnement">
          <PlanUsageWidget />
        </TabsContent>

        {/* Entreprise Tab */}
        <TabsContent value="entreprise">
          <form onSubmit={handleSubmit}>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
                <CardDescription>Ces informations apparaîtront sur vos devis et factures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {success && (
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                    <Check className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'entreprise *</Label>
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    data-testid="settings-nom"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      data-testid="settings-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      data-testid="settings-telephone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleChange}
                    data-testid="settings-adresse"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code_postal">Code postal</Label>
                    <Input
                      id="code_postal"
                      name="code_postal"
                      value={formData.code_postal}
                      onChange={handleChange}
                      data-testid="settings-code-postal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      name="ville"
                      value={formData.ville}
                      onChange={handleChange}
                      data-testid="settings-ville"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET</Label>
                    <Input
                      id="siret"
                      name="siret"
                      value={formData.siret}
                      onChange={handleChange}
                      data-testid="settings-siret"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tva_intra">N° TVA Intracommunautaire</Label>
                    <Input
                      id="tva_intra"
                      name="tva_intra"
                      value={formData.tva_intra}
                      onChange={handleChange}
                      data-testid="settings-tva"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving} data-testid="settings-submit">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <CategoriesManager api={api} />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="space-y-6">
            {/* SMS Configuration Card - NEW */}
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Configuration SMS (Twilio)
                    </CardTitle>
                    <CardDescription>
                      Envoyez des SMS automatiques à vos clients pour les rappels et notifications
                    </CardDescription>
                  </div>
                  {loadingSmsStatus ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : smsStatus.configured ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {smsStatus.mode === 'shared' ? 'Service Actoos' : 'Configuré'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      <XCircle className="w-3 h-3 mr-1" />
                      Non configuré
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <SMSConfiguration api={api} smsStatus={smsStatus} onStatusChange={loadSmsStatus} />
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <form onSubmit={handleNotifSubmit}>
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">Préférences de notification</CardTitle>
                  <CardDescription>Choisissez quand envoyer des notifications à vos clients</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* SMS Notifications */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-slate-700 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Notifications SMS
                      {!smsStatus.configured && (
                        <Badge variant="outline" className="text-xs">Configurez d'abord le SMS</Badge>
                      )}
                    </h4>
                    
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms_intervention_reminder" className="font-normal">
                            Rappel d'intervention (J-1)
                          </Label>
                          <p className="text-xs text-slate-500">SMS envoyé la veille de l'intervention</p>
                        </div>
                        <Switch
                          id="sms_intervention_reminder"
                          checked={notifSettings.sms_intervention_reminder}
                          onCheckedChange={(v) => handleNotifChange('sms_intervention_reminder', v)}
                          disabled={!smsStatus.configured}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms_devis_notification" className="font-normal">
                            Nouveau devis
                          </Label>
                          <p className="text-xs text-slate-500">SMS à l'envoi d'un devis</p>
                        </div>
                        <Switch
                          id="sms_devis_notification"
                          checked={notifSettings.sms_devis_notification}
                          onCheckedChange={(v) => handleNotifChange('sms_devis_notification', v)}
                          disabled={!smsStatus.configured}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms_facture_notification" className="font-normal">
                            Nouvelle facture
                          </Label>
                          <p className="text-xs text-slate-500">SMS à l'émission d'une facture</p>
                        </div>
                        <Switch
                          id="sms_facture_notification"
                          checked={notifSettings.sms_facture_notification}
                          onCheckedChange={(v) => handleNotifChange('sms_facture_notification', v)}
                          disabled={!smsStatus.configured}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms_payment_reminder" className="font-normal">
                            Relance de paiement
                          </Label>
                          <p className="text-xs text-slate-500">SMS pour les factures en retard</p>
                        </div>
                        <Switch
                          id="sms_payment_reminder"
                          checked={notifSettings.sms_payment_reminder}
                          onCheckedChange={(v) => handleNotifChange('sms_payment_reminder', v)}
                          disabled={!smsStatus.configured}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* Email Notifications */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-slate-700 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notifications Email
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">Toujours disponible</Badge>
                    </h4>
                    
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email_devis_notification" className="font-normal">
                            Nouveau devis
                          </Label>
                          <p className="text-xs text-slate-500">Email avec PDF à l'envoi d'un devis</p>
                        </div>
                        <Switch
                          id="email_devis_notification"
                          checked={notifSettings.email_devis_notification}
                          onCheckedChange={(v) => handleNotifChange('email_devis_notification', v)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email_facture_notification" className="font-normal">
                            Nouvelle facture
                          </Label>
                          <p className="text-xs text-slate-500">Email avec PDF à l'émission d'une facture</p>
                        </div>
                        <Switch
                          id="email_facture_notification"
                          checked={notifSettings.email_facture_notification}
                          onCheckedChange={(v) => handleNotifChange('email_facture_notification', v)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email_payment_reminder" className="font-normal">
                            Relance de paiement
                          </Label>
                          <p className="text-xs text-slate-500">Email pour les factures en retard</p>
                        </div>
                        <Switch
                          id="email_payment_reminder"
                          checked={notifSettings.email_payment_reminder}
                          onCheckedChange={(v) => handleNotifChange('email_payment_reminder', v)}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* Auto Reminders */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-slate-700">Relances automatiques</h4>
                        <p className="text-xs text-slate-500">
                          Envoi automatique de relances pour les factures impayées et rappels d'intervention
                        </p>
                      </div>
                      <Switch
                        id="auto_reminders_enabled"
                        checked={notifSettings.auto_reminders_enabled}
                        onCheckedChange={(v) => handleNotifChange('auto_reminders_enabled', v)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={saving} data-testid="save-notification-prefs">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Enregistrer les préférences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentSettingsForm api={api} />
        </TabsContent>

        {/* Branding / White-label Tab */}
        <TabsContent value="branding">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Personnalisation (White-label)
              </CardTitle>
              <CardDescription>
                Personnalisez l'apparence de votre espace avec votre logo et vos couleurs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Logo de votre entreprise</Label>
                <p className="text-sm text-slate-500">
                  Ce logo apparaîtra sur les PDF (devis, factures) et dans l'interface de vos techniciens.
                </p>
                
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                    {brandingData.logo_url ? (
                      <img 
                        src={brandingData.logo_url} 
                        alt="Logo entreprise" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <Building2 className="w-10 h-10 mx-auto mb-2" />
                        <span className="text-xs">Aucun logo</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setUploadingLogo(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          const response = await api.post('/entreprise/logo', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                          });
                          
                          setBrandingData(prev => ({ ...prev, logo_url: response.data.logo_url }));
                          toast.success('Logo mis à jour');
                          refreshUser();
                        } catch (error) {
                          console.error('Error uploading logo:', error);
                          toast.error(error.response?.data?.detail || 'Erreur lors du téléchargement');
                        } finally {
                          setUploadingLogo(false);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload').click()}
                      disabled={uploadingLogo}
                      className="w-full"
                      data-testid="upload-logo-btn"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingLogo ? 'Téléchargement...' : 'Choisir un logo'}
                    </Button>
                    <p className="text-xs text-slate-500">
                      Formats acceptés : PNG, JPG, WebP. Taille max : 2MB.
                      Le logo sera automatiquement optimisé.
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Color - Only for Pro+ plans */}
              <div className="space-y-4 pt-6 border-t">
                <Label className="text-base font-semibold">Couleur principale</Label>
                <p className="text-sm text-slate-500">
                  Cette couleur sera utilisée pour les accents dans l'interface et les documents.
                </p>
                
                {canUseAdvancedBranding ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandingData.couleur_primaire}
                          onChange={(e) => setBrandingData(prev => ({ ...prev, couleur_primaire: e.target.value }))}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200"
                          data-testid="color-picker"
                        />
                        <Input
                          value={brandingData.couleur_primaire}
                          onChange={(e) => setBrandingData(prev => ({ ...prev, couleur_primaire: e.target.value }))}
                          placeholder="#2563EB"
                          className="w-28 font-mono uppercase"
                        />
                      </div>
                      
                      {/* Color presets */}
                      <div className="flex gap-2">
                        {['#2563EB', '#059669', '#DC2626', '#7C3AED', '#EA580C', '#0891B2'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBrandingData(prev => ({ ...prev, couleur_primaire: color }))}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                              brandingData.couleur_primaire === color ? 'border-slate-900 scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <Button
                      onClick={async () => {
                        setSavingBranding(true);
                        try {
                          await api.put('/entreprise/branding', null, {
                            params: { couleur_primaire: brandingData.couleur_primaire }
                          });
                          toast.success('Couleur mise à jour');
                          refreshUser();
                        } catch (error) {
                          console.error('Error saving branding:', error);
                          toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
                        } finally {
                          setSavingBranding(false);
                        }
                      }}
                      disabled={savingBranding}
                      data-testid="save-branding-btn"
                    >
                      {savingBranding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      Enregistrer la couleur
                    </Button>
                  </>
                ) : (
                  <Alert className="border-amber-200 bg-amber-50">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Fonctionnalité Pro</strong>
                      <p className="mt-1 text-sm">
                        La personnalisation des couleurs est disponible à partir du plan Pro.
                        Passez au plan supérieur pour personnaliser l'interface avec vos couleurs.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => window.location.href = '/dashboard/settings?tab=abonnement'}
                      >
                        Passer à Pro
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Preview */}
              <div className="space-y-4 pt-6 border-t">
                <Label className="text-base font-semibold">Aperçu</Label>
                <div className="p-6 border rounded-lg bg-white">
                  <div className="flex items-center gap-4 mb-4">
                    {brandingData.logo_url ? (
                      <img src={brandingData.logo_url} alt="Logo" className="h-12 object-contain" />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: brandingData.couleur_primaire }}
                      >
                        {entreprise?.nom?.charAt(0) || 'A'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold">{entreprise?.nom || 'Votre entreprise'}</h3>
                      <p className="text-sm text-slate-500">{entreprise?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: brandingData.couleur_primaire }}
                    >
                      Bouton principal
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg font-medium border-2"
                      style={{ borderColor: brandingData.couleur_primaire, color: brandingData.couleur_primaire }}
                    >
                      Bouton secondaire
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Settings Tab */}
        <TabsContent value="regional">
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Devise
                </CardTitle>
                <CardDescription>
                  Choisissez la devise utilisée pour vos devis et factures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => handleCurrencyChange(currency.code)}
                      disabled={savingCurrency}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedCurrency === currency.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      data-testid={`currency-${currency.code}`}
                    >
                      <div className="text-2xl font-bold mb-1">{currency.symbol}</div>
                      <div className="font-medium text-slate-900">{currency.code}</div>
                      <div className="text-xs text-slate-500">{currency.name}</div>
                    </button>
                  ))}
                </div>
                {savingCurrency && (
                  <div className="flex items-center gap-2 mt-4 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Les paramètres de devise affectent le format des montants sur vos devis, factures et dans toute l'application.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-8">
            <IntegrationsHub api={api} />
            <CalendarIntegration api={api} />
          </div>
        </TabsContent>

        {/* GDPR Tab */}
        <TabsContent value="gdpr">
          <GDPRSettings api={api} />
        </TabsContent>

        {/* Security Tab - Password Management */}
        <TabsContent value="security">
          <SecuritySettings api={api} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Security Settings Component - Password Management & 2FA
const SecuritySettings = ({ api }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // Import TwoFactorSettings dynamically to avoid circular deps
  const TwoFactorSettingsComponent = React.lazy(() => import('../components/TwoFactorSettings'));

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    return checks;
  };

  const passwordStrength = validatePassword(formData.newPassword);
  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;
  const strengthLabel = strengthScore <= 2 ? 'Faible' : strengthScore <= 3 ? 'Moyen' : strengthScore <= 4 ? 'Fort' : 'Très fort';
  const strengthColor = strengthScore <= 2 ? 'bg-red-500' : strengthScore <= 3 ? 'bg-yellow-500' : strengthScore <= 4 ? 'bg-blue-500' : 'bg-green-500';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Le mot de passe actuel est requis';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        current_password: formData.currentPassword,
        new_password: formData.newPassword
      });
      
      toast.success('Mot de passe modifié avec succès');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const message = error.response?.data?.detail || 'Erreur lors du changement de mot de passe';
      toast.error(message);
      if (message.includes('actuel')) {
        setErrors({ currentPassword: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication Section */}
      <React.Suspense fallback={
        <Card className="border-slate-200">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          </CardContent>
        </Card>
      }>
        <TwoFactorSettingsComponent />
      </React.Suspense>

      {/* Change Password Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Changer le mot de passe</CardTitle>
              <CardDescription>
                Mettez à jour votre mot de passe pour sécuriser votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleChange('currentPassword', e.target.value)}
                  className={errors.currentPassword ? 'border-red-500' : ''}
                  placeholder="Entrez votre mot de passe actuel"
                  data-testid="current-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-500">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  className={errors.newPassword ? 'border-red-500' : ''}
                  placeholder="Entrez votre nouveau mot de passe"
                  data-testid="new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword}</p>
              )}
              
              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${strengthColor}`}
                        style={{ width: `${(strengthScore / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      strengthScore <= 2 ? 'text-red-600' : 
                      strengthScore <= 3 ? 'text-yellow-600' : 
                      strengthScore <= 4 ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li className={passwordStrength.length ? 'text-green-600' : ''}>
                      {passwordStrength.length ? '✓' : '○'} Au moins 8 caractères
                    </li>
                    <li className={passwordStrength.uppercase ? 'text-green-600' : ''}>
                      {passwordStrength.uppercase ? '✓' : '○'} Une majuscule
                    </li>
                    <li className={passwordStrength.lowercase ? 'text-green-600' : ''}>
                      {passwordStrength.lowercase ? '✓' : '○'} Une minuscule
                    </li>
                    <li className={passwordStrength.number ? 'text-green-600' : ''}>
                      {passwordStrength.number ? '✓' : '○'} Un chiffre
                    </li>
                    <li className={passwordStrength.special ? 'text-green-600' : ''}>
                      {passwordStrength.special ? '✓' : '○'} Un caractère spécial (!@#$%...)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  placeholder="Confirmez votre nouveau mot de passe"
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
              {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Les mots de passe correspondent
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={loading || !formData.currentPassword || !formData.newPassword || formData.newPassword !== formData.confirmPassword}
              className="w-full sm:w-auto"
              data-testid="change-password-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Changer le mot de passe
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Tips Card */}
      <Card className="border-slate-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Conseils de sécurité</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Utilisez un mot de passe unique pour chaque compte</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Changez votre mot de passe tous les 3 à 6 mois</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Ne partagez jamais votre mot de passe par email ou téléphone</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Utilisez un gestionnaire de mots de passe sécurisé</span>
          </p>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-slate-500">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-slate-500">Rôle</span>
            <Badge variant="outline">
              {user?.role === 'admin' ? 'Administrateur' : 'Technicien'}
            </Badge>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-slate-500">Mot de passe oublié ?</span>
            <a 
              href="/forgot-password" 
              className="text-sm text-blue-600 hover:underline"
            >
              Réinitialiser par email
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Calendar Integration Component
const CalendarIntegration = ({ api }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkStatus();
    
    // Check URL for calendar connection callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') {
      toast.success('Google Calendar connecté avec succès !');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      checkStatus();
    }
  }, []);

  const checkStatus = async () => {
    try {
      const response = await api.get('/calendar/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error checking calendar status:', error);
      setStatus({ configured: false, connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await api.get('/calendar/connect');
      // Redirect to Google OAuth
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la connexion');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.post('/calendar/disconnect');
      toast.success('Google Calendar déconnecté');
      setStatus({ ...status, connected: false, google_email: null });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/calendar/sync-all');
      toast.success(`${response.data.synced} intervention(s) synchronisée(s)`);
      checkStatus();
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Intégrations externes</h3>
        <p className="text-sm text-slate-500 mt-1">
          Connectez vos services externes pour synchroniser automatiquement vos données
        </p>
      </div>

      {/* Google Calendar */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Google Calendar</CardTitle>
                <CardDescription>
                  Synchronisez vos interventions avec Google Calendar
                </CardDescription>
              </div>
            </div>
            {status?.connected && (
              <Badge className="bg-green-100 text-green-700">Connecté</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.configured ? (
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Configuration requise</strong>
                <p className="mt-1 text-sm">
                  Google Calendar n'est pas configuré. L'administrateur doit ajouter les credentials OAuth 
                  (GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET) dans les variables d'environnement.
                </p>
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-amber-700 hover:text-amber-900 underline"
                >
                  Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>
              </AlertDescription>
            </Alert>
          ) : status?.connected ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Connecté à Google Calendar</p>
                  {status.google_email && (
                    <p className="text-sm text-green-700">{status.google_email}</p>
                  )}
                  {status.last_sync && (
                    <p className="text-xs text-green-600 mt-1">
                      Dernière sync: {new Date(status.last_sync).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="flex-1"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  Synchroniser toutes les interventions
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700">
                      <Unlink className="w-4 h-4 mr-2" />
                      Déconnecter
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Déconnecter Google Calendar ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Les événements déjà synchronisés resteront dans votre calendrier, 
                        mais les nouvelles interventions ne seront plus ajoutées automatiquement.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {disconnecting ? 'Déconnexion...' : 'Déconnecter'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Synchronisation automatique</strong> : Les interventions planifiées seront 
                  automatiquement ajoutées à votre calendrier Google avec un rappel 30 minutes avant.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Connectez votre compte Google pour synchroniser automatiquement vos interventions 
                avec Google Calendar. Vous recevrez des rappels et pourrez voir vos rendez-vous 
                directement dans votre calendrier.
              </p>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Connecter Google Calendar
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Vous serez redirigé vers Google pour autoriser l'accès à votre calendrier
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Future integrations placeholder */}
      <Card className="border-slate-200 border-dashed opacity-60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <CardTitle className="text-base text-slate-500">Microsoft Outlook</CardTitle>
              <CardDescription>Bientôt disponible</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};


// GDPR Settings Component
const GDPRSettings = ({ api }) => {
  const [settings, setSettings] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/gdpr/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching GDPR settings:', error);
      // Set defaults
      setSettings({
        photos_months: 24,
        interventions_months: 36,
        devis_months: 60,
        factures_months: 120,
        clients_inactifs_months: 36,
        auto_cleanup_enabled: false,
        notify_before_deletion: true,
        notify_days_before: 30
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    try {
      const response = await api.get('/gdpr/preview');
      setPreview(response.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/gdpr/settings', settings);
      toast.success('Paramètres RGPD enregistrés');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const response = await api.post('/gdpr/cleanup/execute?dry_run=false');
      toast.success('Nettoyage lancé en arrière-plan');
      setShowCleanupDialog(false);
      // Refresh settings to get new last_cleanup
      setTimeout(fetchSettings, 2000);
    } catch (error) {
      console.error('Error executing cleanup:', error);
      toast.error('Erreur lors du nettoyage');
    } finally {
      setCleaning(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Protection des données (RGPD)</CardTitle>
              <CardDescription>
                Configurez la durée de conservation de vos données conformément au RGPD
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Retention Settings */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Durées de conservation
          </CardTitle>
          <CardDescription>
            Définissez combien de temps les données sont conservées avant suppression/anonymisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="photos_months" className="flex items-center gap-2">
                Photos d'intervention
                <Badge variant="outline" className="text-xs">Configurable</Badge>
              </Label>
              <span className="text-sm font-medium text-slate-700">{settings.photos_months} mois</span>
            </div>
            <input
              type="range"
              id="photos_months"
              min="1"
              max="120"
              value={settings.photos_months}
              onChange={(e) => handleChange('photos_months', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              Les photos seront supprimées après {settings.photos_months} mois ({Math.round(settings.photos_months / 12 * 10) / 10} ans)
            </p>
          </div>

          {/* Interventions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="interventions_months" className="flex items-center gap-2">
                Interventions terminées
                <Badge variant="outline" className="text-xs">Configurable</Badge>
              </Label>
              <span className="text-sm font-medium text-slate-700">{settings.interventions_months} mois</span>
            </div>
            <input
              type="range"
              id="interventions_months"
              min="12"
              max="120"
              value={settings.interventions_months}
              onChange={(e) => handleChange('interventions_months', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              Les interventions seront archivées après {settings.interventions_months} mois ({Math.round(settings.interventions_months / 12 * 10) / 10} ans)
            </p>
          </div>

          {/* Clients Inactifs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clients_inactifs_months" className="flex items-center gap-2">
                Clients inactifs
                <Badge variant="outline" className="text-xs">Configurable</Badge>
              </Label>
              <span className="text-sm font-medium text-slate-700">{settings.clients_inactifs_months} mois</span>
            </div>
            <input
              type="range"
              id="clients_inactifs_months"
              min="12"
              max="120"
              value={settings.clients_inactifs_months}
              onChange={(e) => handleChange('clients_inactifs_months', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              Les clients sans intervention seront anonymisés après {settings.clients_inactifs_months} mois
            </p>
          </div>

          {/* Legal Requirements - Non-configurable */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Obligations légales (non modifiables)
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-sm font-medium text-slate-700">Devis</p>
                <p className="text-2xl font-bold text-slate-900">5 ans</p>
                <p className="text-xs text-slate-500">60 mois minimum</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-sm font-medium text-slate-700">Factures</p>
                <p className="text-2xl font-bold text-slate-900">10 ans</p>
                <p className="text-xs text-slate-500">120 mois minimum</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Enregistrer les paramètres
          </Button>
        </CardContent>
      </Card>

      {/* Auto Cleanup Settings */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Nettoyage automatique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
            <div>
              <p className="font-medium text-slate-900">Activer le nettoyage automatique</p>
              <p className="text-sm text-slate-500">Supprime automatiquement les données expirées chaque mois</p>
            </div>
            <Switch
              checked={settings.auto_cleanup_enabled}
              onCheckedChange={(checked) => handleChange('auto_cleanup_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
            <div>
              <p className="font-medium text-slate-900">Notification avant suppression</p>
              <p className="text-sm text-slate-500">Recevez un email {settings.notify_days_before} jours avant</p>
            </div>
            <Switch
              checked={settings.notify_before_deletion}
              onCheckedChange={(checked) => handleChange('notify_before_deletion', checked)}
            />
          </div>

          {settings.last_cleanup && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Dernier nettoyage : {new Date(settings.last_cleanup.completed_at).toLocaleDateString('fr-FR')}
                <br />
                <span className="text-xs">
                  {settings.last_cleanup.photos_deleted} photos • {settings.last_cleanup.interventions_archived} interventions • {settings.last_cleanup.clients_anonymized} clients
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Manual Cleanup */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash className="w-4 h-4" />
            Nettoyage manuel
          </CardTitle>
          <CardDescription>
            Lancez un nettoyage immédiat des données expirées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={fetchPreview}
            className="w-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            Prévisualiser ce qui sera supprimé
          </Button>

          {preview && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
              <p className="font-medium text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Prévisualisation du nettoyage
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-white rounded">
                  <p className="text-xl font-bold text-red-600">{preview.photos.count}</p>
                  <p className="text-xs text-slate-600">Photos</p>
                </div>
                <div className="p-2 bg-white rounded">
                  <p className="text-xl font-bold text-amber-600">{preview.interventions.count}</p>
                  <p className="text-xs text-slate-600">Interventions</p>
                </div>
                <div className="p-2 bg-white rounded">
                  <p className="text-xl font-bold text-blue-600">{preview.clients_inactifs.count}</p>
                  <p className="text-xs text-slate-600">Clients</p>
                </div>
              </div>
              {preview.estimated_storage_freed_mb > 0 && (
                <p className="text-sm text-amber-700">
                  Espace libéré estimé : {preview.estimated_storage_freed_mb} MB
                </p>
              )}
            </div>
          )}

          <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash className="w-4 h-4 mr-2" />
                Lancer le nettoyage maintenant
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Confirmer le nettoyage
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action va supprimer ou anonymiser définitivement les données expirées selon vos paramètres de rétention.
                  <br /><br />
                  <strong>Cette action est irréversible.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCleanup}
                  disabled={cleaning}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {cleaning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash className="w-4 h-4 mr-2" />
                  )}
                  Confirmer le nettoyage
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
