import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
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
import CountryCurrencySelector from '../components/CountryCurrencySelector';

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
  const { t } = useTranslation();
  const { user, signOut, updatePassword, isCompany, isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      toast.error(t('settings.toasts.passwordMismatch'));
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error(t('settings.toasts.passwordLength'));
      return;
    }
    setLoading(true);
    try {
      await updatePassword(passwords.newPassword);
      toast.success(t('settings.toasts.passwordUpdated'));
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || t('settings.toasts.passwordError'));
    } finally {
      setLoading(false);
    }
  };

  // Changement d'email
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !currentPassword) {
      toast.error(t('settings.toasts.fillAllFields'));
      return;
    }
    setEmailLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error(t('settings.toasts.wrongPassword'));
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      toast.success(t('settings.toasts.emailConfirmationSent'));
      setNewEmail('');
      setCurrentPassword('');
    } catch (err) {
      toast.error(err.message || t('settings.toasts.emailError'));
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
      toast.error(err.message || t('settings.toasts.logoutError'));
      setLoggingOut(false);
    }
  };

  // Suppression du compte (RGPD)
  const handleDeleteAccount = async () => {
    if (!window.confirm(t('settings.dangerZone.confirm'))) return;

    setDeleting(true);
    try {
      const res = await apiFetch('/api/user/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: user.id }),
      });

      if (res.success) {
        toast.success(t('settings.toasts.accountDeleted'));
        await supabase.auth.signOut();
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        toast.error(res.message || t('settings.toasts.deleteError'));
      }
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error(err.message || t('settings.toasts.deleteError'));
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
        toast.success(t('settings.toasts.roleRequestSent'));
        setShowRoleModal(false);
        setRequestReason('');

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
      toast.error(err.message || t('settings.toasts.roleRequestError'));
    } finally {
      setRequestLoading(false);
    }
  };

  const isCandidate = profile?.role === 'candidate';

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            {t('settings.back')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(isCompany ? '/dashboard/entreprise/profil' : '/profil')}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            {t('settings.myProfile')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('settings.title')}</h1>
            <p className="text-slate-600">{t('settings.subtitle')}</p>
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
                  <h2 className="font-semibold text-slate-900">{t('settings.accountInfo.title')}</h2>
                  <p className="text-sm text-slate-500">
                    {t('settings.accountInfo.description', { email: user?.email })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sélecteur de pays et devise */}
          <Card>
            <CardContent className="p-6">
              <CountryCurrencySelector />
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
                  <h2 className="font-semibold text-slate-900">{t('settings.changeEmail.title')}</h2>
                  <p className="text-sm text-slate-500">{t('settings.changeEmail.description')}</p>
                </div>
              </div>
              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('settings.changeEmail.newEmailLabel')}
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t('settings.changeEmail.newEmailPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('settings.changeEmail.currentPasswordLabel')}
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('settings.changeEmail.currentPasswordPlaceholder')}
                    required
                  />
                </div>
                <Button type="submit" disabled={emailLoading} className="bg-green-600 hover:bg-green-700 text-white">
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  {t('settings.changeEmail.submit')}
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
                  <h2 className="font-semibold text-slate-900">{t('settings.changePassword.title')}</h2>
                  <p className="text-sm text-slate-500">{t('settings.changePassword.description')}</p>
                </div>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('settings.changePassword.newPasswordLabel')}
                  </label>
                  <Input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder={t('settings.changePassword.newPasswordPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('settings.changePassword.confirmPasswordLabel')}
                  </label>
                  <Input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder={t('settings.changePassword.confirmPasswordPlaceholder')}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {t('settings.changePassword.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Déconnexion */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{t('settings.logout.title')}</h3>
                  <p className="text-sm text-slate-500">{t('settings.logout.description')}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 min-h-[44px]"
                >
                  {loggingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  {t('settings.logout.button')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Demande de changement de rôle */}
          {!isAdmin && (
            <Card className="overflow-visible">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{t('settings.roleChange.title')}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      <Trans
                        i18nKey={
                          isCandidate
                            ? 'settings.roleChange.descriptionCandidate'
                            : 'settings.roleChange.descriptionCompany'
                        }
                        components={{ strong: <strong /> }}
                      />
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowRoleModal(true)}
                    className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50 min-h-[44px] shrink-0 overflow-hidden"
                  >
                    <UserCog className="w-4 h-4 mr-2 shrink-0" />
                    <ScrollText>{t('settings.roleChange.requestButton')}</ScrollText>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modale de demande de changement de rôle */}
          {showRoleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-semibold mb-4">{t('settings.roleChange.modal.title')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('settings.roleChange.modal.roleLabel')}
                    </label>
                    <select
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white"
                    >
                      {isCandidate && <option value="company">{t('settings.roleChange.modal.roleCompany')}</option>}
                      {!isCandidate && <option value="candidate">{t('settings.roleChange.modal.roleCandidate')}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('settings.roleChange.modal.reasonLabel')}
                    </label>
                    <textarea
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                      rows={3}
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder={t('settings.roleChange.modal.reasonPlaceholder')}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                    {t('settings.roleChange.modal.cancel')}
                  </Button>
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleRequestRoleChange}
                    disabled={requestLoading}
                  >
                    {requestLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('settings.roleChange.modal.submit')}
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
                    {t('settings.dangerZone.title')}
                  </h3>
                  <p className="text-sm text-red-600 mt-1">
                    {t('settings.dangerZone.description')}
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
                  {t('settings.dangerZone.button')}
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