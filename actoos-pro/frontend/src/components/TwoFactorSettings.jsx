import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, Lock, Info } from 'lucide-react';

/**
 * TwoFactorSettings - Placeholder for 2FA functionality
 * 2FA requires Supabase Auth configuration (not Railway)
 */
const TwoFactorSettings = () => {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Authentification à deux facteurs (2FA)
        </CardTitle>
        <CardDescription>
          Renforcez la sécurité de votre compte
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            <strong>Bientôt disponible</strong>
            <p className="mt-1 text-sm">
              L'authentification à deux facteurs sera disponible prochainement. 
              En attendant, assurez-vous d'utiliser un mot de passe fort et unique.
            </p>
          </AlertDescription>
        </Alert>
        
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Conseils de sécurité</p>
              <ul className="mt-2 text-sm text-slate-600 space-y-1">
                <li>• Utilisez un mot de passe d'au moins 12 caractères</li>
                <li>• Combinez lettres, chiffres et symboles</li>
                <li>• Ne réutilisez pas vos mots de passe</li>
                <li>• Déconnectez-vous des appareils partagés</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwoFactorSettings;
