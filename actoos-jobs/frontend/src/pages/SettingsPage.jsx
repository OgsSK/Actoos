import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { User, Lock, Loader2, ChevronLeft, Save, LogOut, Mail } from 'lucide-react';

const SettingsPage = () => {
  const { user, signOut, updatePassword, isCompany } = useAuth();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Changement de mot de passe
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(passwords.newPassword);
      toast.success('Mot de passe mis à jour avec succès');
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Changement d'email
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !currentPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setEmailLoading(true);
    try {
      // Vérifier d'abord le mot de passe
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Mot de passe actuel incorrect');
        return;
      }

      // Demander la mise à jour de l'email (envoie un lien de confirmation)
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      toast.success(
        'Un email de confirmation a été envoyé à la nouvelle adresse. Veuillez vérifier votre boîte de réception.'
      );
      setNewEmail('');
      setCurrentPassword('');
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement d'email");
    } finally {
      setEmailLoading(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Erreur de déconnexion');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(isCompany ? '/dashboard/entreprise/profil' : '/profil')}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            Mon profil
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
            <p className="text-slate-600">Gérez votre compte</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informations du compte */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Informations du compte</h2>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Changer l'email */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Changer l'adresse email</h2>
                  <p className="text-sm text-slate-500">
                    Un email de confirmation sera envoyé à la nouvelle adresse
                  </p>
                </div>
              </div>
              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nouvel email
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nouveau@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mot de passe actuel (pour vérification)
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" disabled={emailLoading} className="bg-green-600 hover:bg-green-700 text-white">
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  Changer l'email
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Changer le mot de passe */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Changer le mot de passe</h2>
                  <p className="text-sm text-slate-500">Utilisez au moins 8 caractères</p>
                </div>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <Input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <Input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Mettre à jour
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Déconnexion */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Se déconnecter</h3>
                  <p className="text-sm text-slate-500">Vous serez redirigé vers la page d'accueil</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {loggingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  Déconnexion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;