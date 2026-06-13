import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import {
  User, Lock, Loader2, ChevronLeft, Save, LogOut, Mail,
  Trash2, AlertTriangle, UserCog
} from 'lucide-react';

// Composant qui fait défiler le texte s'il est trop long
const ScrollText = ({ children, className = '' }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const overflow = textRef.current.scrollWidth > containerRef.current.clientWidth;
      setShouldAnimate(overflow);
    }
  }, [children]);

  return (
    <span
      ref={containerRef}
      className={`inline-block overflow-hidden whitespace-nowrap max-w-full ${className}`}
    >
      <span
        ref={textRef}
        className={`inline-block ${shouldAnimate ? 'animate-scroll-text' : ''}`}
        style={shouldAnimate ? { animation: 'scrollText 10s linear infinite' } : {}}
      >
        {children}
      </span>
      <style>{`
        @keyframes scrollText {
          0% { transform: translateX(10%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </span>
  );
};

const SettingsPage = () => {
  const { user, signOut, updatePassword, isCompany, isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  // États existants
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Nouveaux états pour la demande de changement de rôle
  const [showRoleModal, setShowRoleModal] = useState(false);
const [requestedRole, setRequestedRole] = useState(
  profile?.role === 'candidate' ? 'company' : 'candidate'
);
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Mot de passe actuel incorrect');
        return;
      }

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

  // Déconnexion robuste
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      window.location.href = '/';
    } catch (err) {
      toast.error(err.message || 'Erreur de déconnexion');
      setLoggingOut(false);
    }
  };

  // Suppression du compte (RGPD)
  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Supprimer définitivement votre compte ? Cette action est irréversible, toutes vos données seront effacées.'
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await apiFetch('/api/user/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: user.id }),
      });

      if (res.success) {
        toast.success('Votre compte a été supprimé définitivement.');
        await supabase.auth.signOut();
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        toast.error(res.message || 'Erreur lors de la suppression.');
      }
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error(err.message || 'Erreur réseau lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  // Demande de changement de rôle
const handleRequestRoleChange = async () => {
  setRequestLoading(true);
  try {
    const { error } = await supabase.rpc('submit_role_change_request', {
      p_requested_role: requestedRole,
      p_reason: requestReason?.trim() || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Votre demande a été envoyée. L'administrateur va l'examiner.");
      setShowRoleModal(false);
      setRequestReason('');

      // Envoyer une notification à l'admin (non bloquante)
      try {
        await apiFetch('/api/notify-admin-role-request', {
          method: 'POST',
          body: JSON.stringify({
            user_email: user.email,
            user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email,
            current_role: profile?.role || 'candidate',
            requested_role: requestedRole,
          }),
        });
      } catch (notifErr) {
        console.error('Erreur notification admin:', notifErr);
      }
    }
  } catch (err) {
    console.error('Erreur:', err);
    toast.error(err.message || 'Erreur réseau');
  } finally {
    setRequestLoading(false);
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Se déconnecter</h3>
                  <p className="text-sm text-slate-500">Vous serez redirigé vers la page d'accueil</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 min-h-[44px]"
                >
                  {loggingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  Déconnexion
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Demande de changement de rôle (uniquement pour candidat/entreprise) */}
          {!isAdmin && (
            <Card className="overflow-visible">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* La colonne de gauche est limitée pour laisser de la place au bouton */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">Changer de type de compte</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      Vous êtes actuellement <strong>{profile?.role === 'candidate' ? 'Candidat' : 'Entreprise'}</strong>.
                      Vous pouvez demander à passer en compte{' '}
                      {profile?.role === 'candidate' ? 'Entreprise' : 'Candidat'}.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowRoleModal(true)}
                    className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50 min-h-[44px] shrink-0 overflow-hidden"
                  >
                    <UserCog className="w-4 h-4 mr-2 shrink-0" />
                    {/* Le texte défile s'il est trop long */}
                    <ScrollText>Demander un changement</ScrollText>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modale de demande de changement de rôle */}
          {showRoleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-semibold mb-4">Demander un changement de rôle</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nouveau rôle souhaité</label>
                    <select
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white"
                    >
                      {profile?.role === 'candidate' && <option value="company">Entreprise</option>}
                      {profile?.role === 'company' && <option value="candidate">Candidat</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message (optionnel)</label>
                    <textarea
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                      rows={3}
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Expliquez pourquoi vous souhaitez changer de rôle..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                    Annuler
                  </Button>
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleRequestRoleChange}
                    disabled={requestLoading}
                  >
                    {requestLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Envoyer la demande
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Supprimer le compte */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    Zone dangereuse
                  </h3>
                  <p className="text-sm text-red-600 mt-1">
                    Supprimez votre compte et toutes vos données. Cette action est irréversible.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 shrink-0 min-h-[44px]"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Supprimer mon compte
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