import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { 
  Shield, ShieldCheck, ShieldOff, Smartphone, Mail, Key, 
  Copy, Check, AlertTriangle, Loader2, QrCode, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TwoFactorSettings = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(null); // 'email' or 'totp'
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [disableDialog, setDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [backupCodesCount, setBackupCodesCount] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/2fa/status`, { headers });
      setStatus(response.data);
      
      if (response.data.enabled) {
        const backupResponse = await axios.get(`${API_URL}/api/2fa/backup-codes`, { headers });
        setBackupCodesCount(backupResponse.data);
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async (method) => {
    setActionLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/2fa/setup/start`,
        { method },
        { headers }
      );
      setSetupData(response.data);
      setSetupMode(method);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la configuration');
    } finally {
      setActionLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      toast.error('Veuillez entrer un code valide');
      return;
    }

    setActionLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/2fa/setup/verify`,
        { code: verifyCode },
        { headers }
      );
      
      setBackupCodes(response.data.backup_codes);
      toast.success('2FA activé avec succès !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide');
    } finally {
      setActionLoading(false);
    }
  };

  const finishSetup = () => {
    setSetupMode(null);
    setSetupData(null);
    setVerifyCode('');
    setBackupCodes(null);
    loadStatus();
  };

  const handleDisable = async () => {
    if (!disablePassword || !disableCode) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setActionLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/2fa/disable`,
        { password: disablePassword, code: disableCode },
        { headers }
      );
      
      toast.success('2FA désactivé');
      setDisableDialog(false);
      setDisablePassword('');
      setDisableCode('');
      loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la désactivation');
    } finally {
      setActionLoading(false);
    }
  };

  const sendDisableCode = async () => {
    try {
      await axios.post(`${API_URL}/api/2fa/send-disable-code`, null, { headers });
      toast.success('Code envoyé par email');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du code');
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      toast.success('Codes copiés dans le presse-papiers');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
        </CardContent>
      </Card>
    );
  }

  // Show backup codes after successful setup
  if (backupCodes) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
            <CardTitle>2FA Activé avec succès !</CardTitle>
          </div>
          <CardDescription>
            Conservez ces codes de récupération en lieu sûr
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important :</strong> Ces codes ne seront plus affichés. 
              Conservez-les en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between bg-white border rounded-lg p-3"
              >
                <code className="font-mono text-sm">{code}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(code, idx)}
                >
                  {copiedCode === idx ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
          
          <Button variant="outline" onClick={copyAllBackupCodes} className="w-full">
            <Copy className="w-4 h-4 mr-2" />
            Copier tous les codes
          </Button>
        </CardContent>
        <CardFooter>
          <Button onClick={finishSetup} className="w-full bg-emerald-600 hover:bg-emerald-700">
            J'ai sauvegardé mes codes
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Setup mode
  if (setupMode && setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {setupMode === 'totp' ? <Smartphone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            Configuration {setupMode === 'totp' ? 'Google Authenticator' : 'Email'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {setupMode === 'totp' && setupData.qr_code && (
            <div className="text-center space-y-4">
              <p className="text-slate-600">
                Scannez ce QR code avec Google Authenticator ou une application compatible :
              </p>
              <div className="inline-block p-4 bg-white rounded-xl border">
                <img src={setupData.qr_code} alt="QR Code" className="w-48 h-48" />
              </div>
              <details className="text-sm text-slate-500">
                <summary className="cursor-pointer">Clé secrète (saisie manuelle)</summary>
                <code className="block mt-2 p-2 bg-slate-100 rounded font-mono text-xs break-all">
                  {setupData.secret}
                </code>
              </details>
            </div>
          )}
          
          {setupMode === 'email' && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <Mail className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{setupData.message}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label>Entrez le code à 6 chiffres</Label>
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              data-testid="2fa-verify-code"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={() => { setSetupMode(null); setSetupData(null); }}>
            Annuler
          </Button>
          <Button 
            onClick={verifySetup} 
            disabled={actionLoading || verifyCode.length !== 6}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Vérifier et activer
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Main view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-600" />
            <CardTitle>Authentification à deux facteurs (2FA)</CardTitle>
          </div>
          {status?.enabled && (
            <Badge className="bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Activé
            </Badge>
          )}
        </div>
        <CardDescription>
          Ajoutez une couche de sécurité supplémentaire à votre compte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {status?.enabled ? (
          <>
            <Alert className="bg-emerald-50 border-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <AlertDescription>
                2FA activé via <strong>{status.method === 'totp' ? 'Google Authenticator' : 'Email'}</strong>
                {status.setup_at && ` le ${new Date(status.setup_at).toLocaleDateString('fr-FR')}`}
              </AlertDescription>
            </Alert>
            
            {backupCodesCount && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">
                    Codes de récupération restants
                  </span>
                </div>
                <Badge variant="outline">
                  {backupCodesCount.count} / {backupCodesCount.total}
                </Badge>
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setDisableDialog(true)}
            >
              <ShieldOff className="w-4 h-4 mr-2" />
              Désactiver le 2FA
            </Button>
          </>
        ) : (
          <>
            <p className="text-slate-600">
              Protégez votre compte avec une vérification en deux étapes. 
              Choisissez votre méthode préférée :
            </p>
            
            <div className="grid gap-4">
              <Card 
                className="cursor-pointer hover:border-emerald-300 transition-colors"
                onClick={() => startSetup('totp')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Google Authenticator (Recommandé)</h3>
                    <p className="text-sm text-slate-500">
                      Utilisez une application comme Google Authenticator ou Authy
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Recommandé</Badge>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => startSetup('email')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Code par email</h3>
                    <p className="text-sm text-slate-500">
                      Recevez un code de vérification par email à chaque connexion
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>

      {/* Disable 2FA Dialog */}
      <Dialog open={disableDialog} onOpenChange={setDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldOff className="w-5 h-5" />
              Désactiver le 2FA
            </DialogTitle>
            <DialogDescription>
              Pour désactiver l'authentification à deux facteurs, confirmez votre identité.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Votre mot de passe"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Code 2FA</Label>
                {status?.method === 'email' && (
                  <Button variant="link" size="sm" onClick={sendDisableCode}>
                    Envoyer par email
                  </Button>
                )}
              </div>
              <Input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder={status?.method === 'totp' ? 'Code Authenticator' : 'Code reçu par email'}
              />
              <p className="text-xs text-slate-500">
                Vous pouvez aussi utiliser un code de récupération
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TwoFactorSettings;
