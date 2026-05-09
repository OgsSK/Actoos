/**
 * ACTOOS ONE - Admin Login
 * 
 * Écran de connexion admin avec email/mot de passe.
 */

import { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Shield,
  Loader2,
  ArrowLeft,
  Crown,
  Eye,
  EyeOff
} from 'lucide-react';
import { adminLogin } from '../services/adminAuthService';

export function AdminLogin({ onSuccess, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    setError('');

    const { data, error: loginError } = await adminLogin(email.trim(), password);

    if (loginError) {
      setError(loginError.message);
      setIsLoading(false);
      return;
    }

    if (data?.user) {
      onSuccess(data.user);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-red-500 to-red-700 px-6 pt-12 pb-20">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-8"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin ACTOOS</h1>
            <p className="text-white/80 text-sm">Tableau de bord GOD MODE</p>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 -mt-10 bg-white rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Connexion Administrateur
        </h2>
        <p className="text-gray-500 mb-6">
          Accès réservé aux administrateurs ACTOOS
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Adresse email
            </label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-4">
              <Mail className="w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="contact@actoos.com"
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Mot de passe
            </label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-4">
              <Lock className="w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••••"
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
              email.trim() && password
                ? 'bg-red-600 text-white active:bg-red-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Accéder au Dashboard
                <Shield className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Security notice */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            🔒 Connexion sécurisée • Accès surveillé
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
