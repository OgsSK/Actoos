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
  Building2, FileText, Check, Loader2, Bell, MessageSquare, 
  CheckCircle, XCircle, ExternalLink, Info, Palette, Upload
} from 'lucide-react';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { api, entreprise, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [smsStatus, setSmsStatus] = useState({ configured: false, phone_number: null });
  const [loadingSmsStatus, setLoadingSmsStatus] = useState(true);
  
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
        <TabsList>
          <TabsTrigger value="entreprise" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Personnalisation
          </TabsTrigger>
        </TabsList>

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

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="space-y-6">
            {/* SMS Status Card */}
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      SMS (Twilio)
                    </CardTitle>
                    <CardDescription>Notifications par SMS pour vos clients</CardDescription>
                  </div>
                  {loadingSmsStatus ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : smsStatus.configured ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configuré
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
                {smsStatus.configured ? (
                  <div className="space-y-4">
                    {smsStatus.phone_number && smsStatus.phone_number !== '****' ? (
                      <p className="text-sm text-slate-600">
                        Numéro d'envoi : <span className="font-mono">{smsStatus.phone_number}</span>
                      </p>
                    ) : (
                      <Alert className="bg-amber-50 border-amber-200">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          Twilio est connecté mais aucun numéro de téléphone n'est configuré. 
                          Ajoutez <code className="bg-amber-100 px-1 rounded">TWILIO_PHONE_NUMBER</code> dans les variables d'environnement.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert className="bg-slate-50 border-slate-200">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Pour activer les SMS, configurez vos identifiants Twilio dans les variables d'environnement du serveur.
                      </AlertDescription>
                    </Alert>
                    <div className="text-sm text-slate-600 space-y-2">
                      <p>Variables requises :</p>
                      <ul className="list-disc list-inside space-y-1 font-mono text-xs bg-slate-100 p-3 rounded-md">
                        <li>TWILIO_ACCOUNT_SID</li>
                        <li>TWILIO_AUTH_TOKEN</li>
                        <li>TWILIO_PHONE_NUMBER</li>
                      </ul>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Console Twilio
                      </a>
                    </Button>
                  </div>
                )}
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
                    <Button type="submit" disabled={saving}>
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
          <form onSubmit={handleSubmit}>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Conditions générales</CardTitle>
                <CardDescription>Texte affiché par défaut sur vos devis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="conditions_generales">Conditions générales de vente</Label>
                  <Textarea
                    id="conditions_generales"
                    name="conditions_generales"
                    value={formData.conditions_generales}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Vos conditions générales de vente..."
                    data-testid="settings-conditions"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving} data-testid="settings-documents-submit">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
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

              {/* Primary Color */}
              <div className="space-y-4 pt-6 border-t">
                <Label className="text-base font-semibold">Couleur principale</Label>
                <p className="text-sm text-slate-500">
                  Cette couleur sera utilisée pour les accents dans l'interface et les documents.
                </p>
                
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
      </Tabs>
    </div>
  );
};
