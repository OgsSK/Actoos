import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { KeyRound, Info } from 'lucide-react';

/**
 * TwoFactorVerify - Placeholder component
 * 2FA verification requires Supabase Auth MFA configuration
 */
const TwoFactorVerify = ({ onVerified, onCancel }) => {
  // If this component is rendered, just call onVerified to bypass
  React.useEffect(() => {
    // Auto-verify since 2FA is not yet configured
    if (onVerified) {
      onVerified();
    }
  }, [onVerified]);

  return (
    <Card className="border-slate-200 max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" />
          Vérification 2FA
        </CardTitle>
        <CardDescription>
          Vérification de sécurité
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            L'authentification à deux facteurs n'est pas encore configurée.
            Connexion en cours...
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TwoFactorVerify;
