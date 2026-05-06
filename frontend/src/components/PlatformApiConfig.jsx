import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import { 
  Key, Mail, MessageSquare, Phone, CreditCard, Settings2,
  Check, Loader2, ExternalLink, Eye, EyeOff, Info, AlertTriangle,
  CheckCircle, XCircle, Copy, HelpCircle, Send, TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

// Configuration API Component - For Super Admin
const PlatformApiConfig = ({ entrepriseId, isSuperAdmin }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [helpDialog, setHelpDialog] = useState(null);
  const [testDialog, setTestDialog] = useState(null);
  const [testData, setTestData] = useState({
    email: '',
    phone: '',
    whatsapp: ''
  });
  
  const [config, setConfig] = useState({
    // Resend (Email)
    resend_api_key: '',
    resend_from_email: 'noreply@actoos.com',
    resend_from_name: 'ACTOOS PRO',
    
    // Twilio (SMS)
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    
    // WhatsApp Business
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: '',
    
    // Stripe
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_public_key: '',
    
    // Feature toggles
    email_enabled: true,
    sms_enabled: false,
    whatsapp_enabled: false,
  });

  const [status, setStatus] = useState({
    email: { configured: false, tested: false },
    sms: { configured: false, tested: false },
    whatsapp: { configured: false, tested: false },
    stripe: { configured: false, tested: false },
  });

  useEffect(() => {
    loadConfig();
  }, [entrepriseId]);

  const loadConfig = async () => {
    try {
      // Load platform config from entreprises table or a dedicated platform_config
      const { data, error } = await supabase
        .from('platform_config')
        .select('*')
        .single();

      if (data) {
        setConfig(prev => ({
          ...prev,
          ...data,
          // Mask sensitive data
          resend_api_key: data.resend_api_key ? '••••••••' + data.resend_api_key.slice(-4) : '',
          twilio_auth_token: data.twilio_auth_token ? '••••••••' + data.twilio_auth_token.slice(-4) : '',
          whatsapp_access_token: data.whatsapp_access_token ? '••••••••' + data.whatsapp_access_token.slice(-4) : '',
          stripe_secret_key: data.stripe_secret_key ? '••••••••' + data.stripe_secret_key.slice(-4) : '',
          stripe_webhook_secret: data.stripe_webhook_secret ? '••••••••' + data.stripe_webhook_secret.slice(-4) : '',
        }));

        // Update status
        setStatus({
          email: { configured: !!data.resend_api_key, tested: false },
          sms: { configured: !!(data.twilio_account_sid && data.twilio_auth_token && data.twilio_phone_number), tested: false },
          whatsapp: { configured: !!(data.whatsapp_access_token && data.whatsapp_phone_number_id), tested: false },
          stripe: { configured: !!(data.stripe_secret_key && data.stripe_webhook_secret), tested: false },
        });
      }
    } catch (error) {
      console.error('Error loading platform config:', error);
      // Table might not exist yet - that's okay
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      // Build update payload based on section
      let updateData = {};
      
      switch (section) {
        case 'email':
          updateData = {
            resend_api_key: config.resend_api_key.startsWith('••') ? undefined : config.resend_api_key,
            resend_from_email: config.resend_from_email,
            resend_from_name: config.resend_from_name,
            email_enabled: config.email_enabled,
          };
          break;
        case 'sms':
          updateData = {
            twilio_account_sid: config.twilio_account_sid,
            twilio_auth_token: config.twilio_auth_token.startsWith('••') ? undefined : config.twilio_auth_token,
            twilio_phone_number: config.twilio_phone_number,
            sms_enabled: config.sms_enabled,
          };
          break;
        case 'whatsapp':
          updateData = {
            whatsapp_access_token: config.whatsapp_access_token.startsWith('••') ? undefined : config.whatsapp_access_token,
            whatsapp_phone_number_id: config.whatsapp_phone_number_id,
            whatsapp_business_account_id: config.whatsapp_business_account_id,
            whatsapp_enabled: config.whatsapp_enabled,
          };
          break;
        case 'stripe':
          updateData = {
            stripe_secret_key: config.stripe_secret_key.startsWith('••') ? undefined : config.stripe_secret_key,
            stripe_webhook_secret: config.stripe_webhook_secret.startsWith('••') ? undefined : config.stripe_webhook_secret,
            stripe_public_key: config.stripe_public_key,
          };
          break;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      // Upsert to platform_config table
      const { error } = await supabase
        .from('platform_config')
        .upsert({ id: 1, ...updateData, updated_at: new Date().toISOString() });

      if (error) throw error;

      toast.success('Configuration enregistrée');
      loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (service) => {
    // For services that need user input, show dialog first
    if ((service === 'email' && !testData.email) ||
        (service === 'sms' && !testData.phone) ||
        (service === 'whatsapp' && !testData.whatsapp)) {
      setTestDialog(service);
      return;
    }

    setTesting(prev => ({ ...prev, [service]: true }));
    setTestDialog(null);
    
    try {
      let success = false;
      let message = '';
      
      switch (service) {
        case 'email':
          // Test email sending
          const emailResponse = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              to: testData.email,
              subject: '✅ Test ACTOOS PRO - Email configuré !',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">✅ Test réussi !</h1>
                  </div>
                  <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="color: #334155; font-size: 16px;">
                      Félicitations ! Votre configuration email <strong>Resend</strong> fonctionne correctement.
                    </p>
                    <p style="color: #64748b; font-size: 14px;">
                      ACTOOS PRO peut maintenant envoyer des emails automatiques pour les devis, factures et notifications.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                      Envoyé depuis ACTOOS PRO • ${new Date().toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              `
            })
          });
          
          if (emailResponse.ok) {
            success = true;
            message = `Email de test envoyé à ${testData.email}`;
          } else {
            const error = await emailResponse.json();
            throw new Error(error.error || 'Échec de l\'envoi');
          }
          break;
          
        case 'sms':
          // Test SMS sending
          const smsResponse = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              to: testData.phone,
              message: `✅ ACTOOS PRO: Test SMS réussi ! Votre configuration Twilio fonctionne. (${new Date().toLocaleTimeString('fr-FR')})`
            })
          });
          
          if (smsResponse.ok) {
            success = true;
            message = `SMS de test envoyé à ${testData.phone}`;
          } else {
            const error = await smsResponse.json();
            throw new Error(error.error || 'Échec de l\'envoi SMS');
          }
          break;
          
        case 'whatsapp':
          // Test WhatsApp sending
          const waResponse = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              to: testData.whatsapp,
              message: `✅ ACTOOS PRO: Test WhatsApp réussi ! Votre configuration Meta Business fonctionne.`
            })
          });
          
          if (waResponse.ok) {
            success = true;
            message = `Message WhatsApp de test envoyé à ${testData.whatsapp}`;
          } else {
            const error = await waResponse.json();
            // WhatsApp often requires templates for business-initiated messages
            if (error.code === 131030 || error.error?.includes('template')) {
              throw new Error('WhatsApp nécessite un template pré-approuvé pour les messages initiés par l\'entreprise. Votre configuration est correcte, mais vous devez créer un template dans Meta Business.');
            }
            throw new Error(error.error || 'Échec de l\'envoi WhatsApp');
          }
          break;
          
        case 'stripe':
          // Test Stripe connection by checking webhook configuration
          toast.info('Pour tester Stripe, vérifiez votre Dashboard Stripe > Webhooks', {
            description: 'Les webhooks doivent pointer vers votre Edge Function',
            duration: 5000
          });
          success = true;
          message = 'Vérifiez la configuration webhook dans Stripe Dashboard';
          break;
      }

      if (success) {
        setStatus(prev => ({
          ...prev,
          [service]: { ...prev[service], tested: true }
        }));
        toast.success(message);
      }
    } catch (error) {
      console.error(`Error testing ${service}:`, error);
      toast.error(`Erreur: ${error.message}`, { duration: 6000 });
    } finally {
      setTesting(prev => ({ ...prev, [service]: false }));
    }
  };

  const handleTestSubmit = (service) => {
    handleTest(service);
  };

  const toggleShowSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  // Help dialogs content
  const helpContent = {
    resend: {
      title: 'Comment obtenir une clé API Resend',
      steps: [
        'Créez un compte sur resend.com',
        'Allez dans Settings → API Keys',
        'Cliquez sur "Create API Key"',
        'Copiez la clé (commence par re_)',
        'Vérifiez votre domaine dans Domains pour envoyer depuis @actoos.com'
      ],
      link: 'https://resend.com/api-keys',
      note: 'Le domaine actoos.com doit être vérifié pour envoyer des emails depuis @actoos.com'
    },
    twilio: {
      title: 'Comment configurer Twilio pour les SMS',
      steps: [
        'Créez un compte sur twilio.com',
        'Allez dans Console Dashboard',
        'Copiez votre Account SID (commence par AC)',
        'Copiez votre Auth Token',
        'Achetez un numéro de téléphone dans Phone Numbers → Buy a Number',
        'Choisissez un numéro français (+33) ou belge (+32)'
      ],
      link: 'https://console.twilio.com',
      note: 'Twilio facture par SMS envoyé. Comptez ~0.07€/SMS en France.'
    },
    whatsapp: {
      title: 'Comment configurer WhatsApp Business API',
      steps: [
        'Créez une app sur developers.facebook.com',
        'Ajoutez le produit "WhatsApp" à votre app',
        'Allez dans WhatsApp → API Setup',
        'Copiez le Temporary Access Token (ou créez un permanent)',
        'Copiez le Phone Number ID',
        'Créez des templates de messages dans WhatsApp Manager'
      ],
      link: 'https://developers.facebook.com/apps/',
      note: 'WhatsApp Business API nécessite des templates pré-approuvés par Meta pour envoyer des messages initiés par l\'entreprise.'
    },
    stripe: {
      title: 'Comment configurer Stripe',
      steps: [
        'Connectez-vous sur dashboard.stripe.com',
        'Allez dans Developers → API Keys',
        'Copiez la Secret Key (commence par sk_)',
        'Allez dans Developers → Webhooks',
        'Créez un endpoint avec URL: https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/stripe-webhook',
        'Sélectionnez les événements: checkout.session.completed, customer.subscription.*, invoice.payment_failed',
        'Copiez le Signing Secret (commence par whsec_)'
      ],
      link: 'https://dashboard.stripe.com/webhooks',
      note: 'Utilisez les clés test (sk_test_) pour le développement et les clés live (sk_live_) pour la production.'
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
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-blue-600" />
          Configuration des Services
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Configurez les clés API pour les emails, SMS, WhatsApp et paiements
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'email', label: 'Email', icon: Mail, color: 'blue' },
          { key: 'sms', label: 'SMS', icon: Phone, color: 'green' },
          { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'emerald' },
          { key: 'stripe', label: 'Paiements', icon: CreditCard, color: 'purple' },
        ].map(({ key, label, icon: Icon, color }) => (
          <div 
            key={key}
            className={`p-3 rounded-lg border ${status[key].configured 
              ? `bg-${color}-50 border-${color}-200` 
              : 'bg-slate-50 border-slate-200'}`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${status[key].configured ? `text-${color}-600` : 'text-slate-400'}`} />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {status[key].configured ? (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configuré
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Non configuré
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Email Configuration (Resend) */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Emails (Resend)</CardTitle>
                <CardDescription>Envoi d'emails automatiques (devis, factures, relances)</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setHelpDialog('resend')}
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Aide
              </Button>
              <Switch 
                checked={config.email_enabled}
                onCheckedChange={(v) => handleChange('email_enabled', v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resend_api_key">Clé API Resend *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="resend_api_key"
                  type={showSecrets.resend_api_key ? 'text' : 'password'}
                  value={config.resend_api_key}
                  onChange={(e) => handleChange('resend_api_key', e.target.value)}
                  placeholder="re_xxxxxxxx..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('resend_api_key')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.resend_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Obtenez votre clé sur <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com/api-keys</a>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resend_from_email">Email expéditeur</Label>
              <Input
                id="resend_from_email"
                type="email"
                value={config.resend_from_email}
                onChange={(e) => handleChange('resend_from_email', e.target.value)}
                placeholder="noreply@actoos.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend_from_name">Nom expéditeur</Label>
              <Input
                id="resend_from_name"
                value={config.resend_from_name}
                onChange={(e) => handleChange('resend_from_name', e.target.value)}
                placeholder="ACTOOS PRO"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest('email')}
              disabled={testing.email || !config.resend_api_key}
            >
              {testing.email ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Tester
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('email')}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Configuration (Twilio) */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">SMS (Twilio)</CardTitle>
                <CardDescription>Envoi de SMS (rappels, notifications)</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setHelpDialog('twilio')}
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Aide
              </Button>
              <Switch 
                checked={config.sms_enabled}
                onCheckedChange={(v) => handleChange('sms_enabled', v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="twilio_account_sid">Account SID *</Label>
            <Input
              id="twilio_account_sid"
              value={config.twilio_account_sid}
              onChange={(e) => handleChange('twilio_account_sid', e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio_auth_token">Auth Token *</Label>
            <div className="relative">
              <Input
                id="twilio_auth_token"
                type={showSecrets.twilio_auth_token ? 'text' : 'password'}
                value={config.twilio_auth_token}
                onChange={(e) => handleChange('twilio_auth_token', e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('twilio_auth_token')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecrets.twilio_auth_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio_phone_number">Numéro Twilio *</Label>
            <Input
              id="twilio_phone_number"
              value={config.twilio_phone_number}
              onChange={(e) => handleChange('twilio_phone_number', e.target.value)}
              placeholder="+33xxxxxxxxx ou +32xxxxxxxxx"
            />
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Format international avec indicatif pays (+33 pour France, +32 pour Belgique)
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest('sms')}
              disabled={testing.sms || !config.twilio_account_sid}
            >
              {testing.sms ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
              Tester
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('sms')}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">WhatsApp Business</CardTitle>
                <CardDescription>Envoi de messages WhatsApp (relances, notifications)</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setHelpDialog('whatsapp')}
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Aide
              </Button>
              <Switch 
                checked={config.whatsapp_enabled}
                onCheckedChange={(v) => handleChange('whatsapp_enabled', v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              WhatsApp Business API nécessite des <strong>templates pré-approuvés</strong> par Meta pour envoyer des messages. 
              Les messages texte libres ne fonctionnent que dans les 24h suivant un message client.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_access_token">Access Token *</Label>
            <div className="relative">
              <Input
                id="whatsapp_access_token"
                type={showSecrets.whatsapp_access_token ? 'text' : 'password'}
                value={config.whatsapp_access_token}
                onChange={(e) => handleChange('whatsapp_access_token', e.target.value)}
                placeholder="EAAxxxxxxxxx..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('whatsapp_access_token')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecrets.whatsapp_access_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone_number_id">Phone Number ID *</Label>
              <Input
                id="whatsapp_phone_number_id"
                value={config.whatsapp_phone_number_id}
                onChange={(e) => handleChange('whatsapp_phone_number_id', e.target.value)}
                placeholder="xxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_business_account_id">Business Account ID</Label>
              <Input
                id="whatsapp_business_account_id"
                value={config.whatsapp_business_account_id}
                onChange={(e) => handleChange('whatsapp_business_account_id', e.target.value)}
                placeholder="xxxxxxxxxxxx"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest('whatsapp')}
              disabled={testing.whatsapp || !config.whatsapp_access_token}
            >
              {testing.whatsapp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              Tester
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('whatsapp')}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Paiements (Stripe)</CardTitle>
                <CardDescription>Paiement en ligne des factures et abonnements</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setHelpDialog('stripe')}
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              Aide
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripe_public_key">Clé publique (Publishable Key)</Label>
            <Input
              id="stripe_public_key"
              value={config.stripe_public_key}
              onChange={(e) => handleChange('stripe_public_key', e.target.value)}
              placeholder="pk_live_xxxxxxxx ou pk_test_xxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe_secret_key">Clé secrète (Secret Key) *</Label>
            <div className="relative">
              <Input
                id="stripe_secret_key"
                type={showSecrets.stripe_secret_key ? 'text' : 'password'}
                value={config.stripe_secret_key}
                onChange={(e) => handleChange('stripe_secret_key', e.target.value)}
                placeholder="sk_live_xxxxxxxx ou sk_test_xxxxxxxx"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('stripe_secret_key')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecrets.stripe_secret_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe_webhook_secret">Webhook Secret *</Label>
            <div className="relative">
              <Input
                id="stripe_webhook_secret"
                type={showSecrets.stripe_webhook_secret ? 'text' : 'password'}
                value={config.stripe_webhook_secret}
                onChange={(e) => handleChange('stripe_webhook_secret', e.target.value)}
                placeholder="whsec_xxxxxxxx"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('stripe_webhook_secret')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecrets.stripe_webhook_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-slate-700">URL du Webhook Stripe :</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white px-3 py-2 rounded border text-slate-600 overflow-x-auto">
                https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/stripe-webhook
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/stripe-webhook', 'URL')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest('stripe')}
              disabled={testing.stripe}
            >
              {testing.stripe ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Tester
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('stripe')}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Dialog */}
      <Dialog open={!!helpDialog} onOpenChange={() => setHelpDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              {helpDialog && helpContent[helpDialog]?.title}
            </DialogTitle>
          </DialogHeader>
          {helpDialog && helpContent[helpDialog] && (
            <div className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                {helpContent[helpDialog].steps.map((step, i) => (
                  <li key={i} className="leading-relaxed">{step}</li>
                ))}
              </ol>
              
              {helpContent[helpDialog].note && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    {helpContent[helpDialog].note}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                className="w-full"
                onClick={() => window.open(helpContent[helpDialog].link, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir {helpDialog === 'resend' ? 'Resend' : helpDialog === 'twilio' ? 'Twilio' : helpDialog === 'whatsapp' ? 'Meta Developers' : 'Stripe'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Dialog - Email */}
      <Dialog open={testDialog === 'email'} onOpenChange={() => setTestDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-blue-600" />
              Tester l'envoi d'email
            </DialogTitle>
            <DialogDescription>
              Un email de test sera envoyé à l'adresse que vous indiquez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Adresse email de test</Label>
              <Input
                id="test-email"
                type="email"
                value={testData.email}
                onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="votre@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(null)}>
              Annuler
            </Button>
            <Button 
              onClick={() => handleTestSubmit('email')}
              disabled={!testData.email || testing.email}
            >
              {testing.email ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer le test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog - SMS */}
      <Dialog open={testDialog === 'sms'} onOpenChange={() => setTestDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-green-600" />
              Tester l'envoi de SMS
            </DialogTitle>
            <DialogDescription>
              Un SMS de test sera envoyé au numéro que vous indiquez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Numéro de téléphone</Label>
              <Input
                id="test-phone"
                type="tel"
                value={testData.phone}
                onChange={(e) => setTestData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+33612345678 ou 0612345678"
              />
              <p className="text-xs text-slate-500">
                Format français (+33) ou belge (+32) accepté
              </p>
            </div>
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                Attention : Chaque SMS envoyé est facturé par Twilio (~0.07€/SMS)
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(null)}>
              Annuler
            </Button>
            <Button 
              onClick={() => handleTestSubmit('sms')}
              disabled={!testData.phone || testing.sms}
            >
              {testing.sms ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer le test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog - WhatsApp */}
      <Dialog open={testDialog === 'whatsapp'} onOpenChange={() => setTestDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-emerald-600" />
              Tester WhatsApp Business
            </DialogTitle>
            <DialogDescription>
              Un message WhatsApp de test sera envoyé au numéro indiqué.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-whatsapp">Numéro WhatsApp</Label>
              <Input
                id="test-whatsapp"
                type="tel"
                value={testData.whatsapp}
                onChange={(e) => setTestData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+33612345678"
              />
            </div>
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Note :</strong> WhatsApp Business API nécessite que le destinataire ait envoyé un message à votre numéro dans les dernières 24h, 
                OU que vous utilisiez un template pré-approuvé.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(null)}>
              Annuler
            </Button>
            <Button 
              onClick={() => handleTestSubmit('whatsapp')}
              disabled={!testData.whatsapp || testing.whatsapp}
            >
              {testing.whatsapp ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer le test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformApiConfig;
