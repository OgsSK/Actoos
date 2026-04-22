import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Shield, Smartphone, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TwoFactorVerify = ({ tempToken, method, onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(method === 'totp');
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus on code input
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // For email method, send code automatically
    if (method === 'email' && !codeSent) {
      sendEmailCode();
    }
  }, []);

  const sendEmailCode = async () => {
    try {
      await axios.post(`${API_URL}/api/2fa/send-login-code?temp_token=${tempToken}`);
      setCodeSent(true);
      toast.success('Code envoyé par email');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du code');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (code.length < 6) {
      setError('Veuillez entrer un code valide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/2fa/verify-login`, {
        temp_token: tempToken,
        code: code
      });

      // Success - pass the auth response to parent
      onSuccess(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Code invalide');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8); // Allow 8 for backup codes
    setCode(value);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
              {method === 'totp' ? (
                <Smartphone className="w-8 h-8 text-emerald-600" />
              ) : (
                <Mail className="w-8 h-8 text-emerald-600" />
              )}
            </div>
            <CardTitle className="text-xl">Vérification en deux étapes</CardTitle>
            <CardDescription>
              {method === 'totp' 
                ? 'Entrez le code affiché dans votre application d\'authentification'
                : 'Entrez le code reçu par email'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Input
                  ref={inputRef}
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                  maxLength={8}
                  autoComplete="one-time-code"
                  data-testid="2fa-login-code"
                />
                <p className="text-xs text-center text-slate-500">
                  Vous pouvez aussi utiliser un code de récupération
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
                disabled={loading || code.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Vérifier
                  </>
                )}
              </Button>

              {method === 'email' && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={sendEmailCode}
                >
                  Renvoyer le code
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-500"
                onClick={onCancel}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
