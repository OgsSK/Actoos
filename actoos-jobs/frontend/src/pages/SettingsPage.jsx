import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import {
  User, Lock, Loader2, ChevronLeft, Save, LogOut, Mail,
  Trash2, AlertTriangle, UserCog
} from 'lucide-react';
import CountryCurrencySelector from '../components/CountryCurrencySelector';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : 'https://actoos-jobs-api.onrender.com';

// Composant de texte défilant (pour les longs textes)
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
    <span ref={containerRef} className={`inline-block overflow-hidden whitespace-nowrap max-w-full ${className}`}>
      <span ref={textRef} className={`inline-block ${shouldAnimate ? 'animate-scroll-text' : ''}`}
        style={shouldAnimate ? { animation: 'scrollText 10s linear infinite' } : {}}>
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

  // ✅ Suppression de compte avec fetch() natif
  const handleDeleteAccount = async () => {
    if (!window.confirm(t('settings.dangerZone.confirm'))) return;

    setDeleting(true);
    try {
      const response = await fetch(`${BASE_URL}/api/user/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la suppression');
      }

      toast.success(t('settings.toasts.accountDeleted'));
      await supabase.auth.signOut();
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error(err.message || t('settings.toasts.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

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

        // ✅ Notification admin non bloquante
        setTimeout(() => {
          fetch(`${BASE_URL}/api/notify-admin-role-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_email: user.email,
              user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email,
              current_role: profile?.role || 'candidate',
              requested_role: requestedRole,
            }),
          }).catch(err => console.error('Erreur notification admin:', err));
        }, 100);
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
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20 pb-8">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* En-tête avec navigation compacte */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 sm:mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1 px-2">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.back')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isCompany ? '/dashboard/entreprise/profil' : '/profil')}
            className="gap-1 px-2"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.myProfile')}</span>
          </Button>
          <div className="w-full sm:w-auto sm:flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('settings.title')}</h1>
            <p className="text-sm text-slate-600">{t('settings.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Informations du compte (avec avatar) */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 text-sm sm:text-base">{t('settings.accountInfo.title')}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 break-all">
                    {t('settings.accountInfo.description', { email: user?.email })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sélecteur de pays et devise */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <CountryCurrencySelector />
            </CardContent>
          </Card>

          {/* Changer l'email */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm sm:text-base">{t('settings.changeEmail.title')}</h2>
                  <p className="text-xs sm:text-sm text-slate-500">{t('settings.changeEmail.description')}</p>
                </div>
              </div>
              <form onSubmit={handleChangeEmail} className="space-y-3 sm:space-y-4">
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
                    className="min-h-[44px]"
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
                    className="min-h-[44px]"
                  />
                </div>
                <Button type="submit" disabled={emailLoading} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white min-h-[44px]">
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  {t('settings.changeEmail.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Changer le mot de passe */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm sm:text-base">{t('settings.changePassword.title')}</h2>
                  <p className="text-xs sm:text-sm text-slate-500">{t('settings.changePassword.description')}</p>
                </div>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
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
                    className="min-h-[44px]"
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
                    className="min-h-[44px]"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {t('settings.changePassword.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Déconnexion */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{t('settings.logout.title')}</h3>
                  <p className="text-xs sm:text-sm text-slate-500">{t('settings.logout.description')}</p>
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
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{t('settings.roleChange.title')}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2">
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

          {/* Supprimer le compte */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-red-800 text-sm sm:text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    {t('settings.dangerZone.title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-red-600 mt-1">
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

      {/* Modale de demande de changement de rôle */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{t('settings.roleChange.modal.title')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('settings.roleChange.modal.roleLabel')}
                </label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  className="w-full h-10 min-h-[44px] border border-slate-200 rounded-xl px-3 bg-white"
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
              <Button variant="outline" className="min-h-[44px]" onClick={() => setShowRoleModal(false)}>
                {t('settings.roleChange.modal.cancel')}
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700 min-h-[44px]"
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
    </div>
  );
};

export default SettingsPage;