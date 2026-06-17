import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import {
  Users, UserPlus, Loader2, Shield, Briefcase, Eye, Trash2, LogOut, Clock, X
} from 'lucide-react';
import { getPlanLimit } from '../lib/planLimits';

const ROLES = [
  { value: 'admin', label: 'Administrateur', icon: Shield },
  { value: 'recruiter', label: 'Recruteur', icon: Briefcase },
  { value: 'viewer', label: 'Observateur', icon: Eye },
];

// Modale de confirmation générique
const ConfirmModal = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
            Confirmer
          </Button>
        </div>
      </div>
    </div>
  );
};

const TeamManagementPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => { if (!user) navigate('/connexion'); }, [user]);
  useEffect(() => {
    if (!activeCompanyId || !user) return;
    supabase.from('companies').select('*').eq('id', activeCompanyId).single().then(({ data }) => setCompany(data));
  }, [activeCompanyId, user]);

  // Chargement des membres
  const fetchMembers = async () => {
    if (!activeCompanyId || !user) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/team/members?company_id=${activeCompanyId}&user_id=${user.id}`);
      const safe = (Array.isArray(data) ? data : []).map(m => ({
        id: String(m.id || ''),
        role: String(m.role || 'viewer'),
        status: String(m.status || 'active'),
        user_id: String(m.user_id || ''),
        user: {
          first_name: String((m.user || {}).first_name || ''),
          last_name: String((m.user || {}).last_name || ''),
          email: String((m.user || {}).email || ''),
        },
      }));
      setMembers(safe);
    } catch (err) {
      toast.error(err.message || t('team.toasts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (activeCompanyId && user) fetchMembers(); }, [activeCompanyId, user]);

  const isOwner = company?.owner_id === user?.id;

  // Invitation
  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error(t('team.invite.emailRequired')); return; }
    setInviting(true);
    try {
      const result = await apiFetch('/api/team/invite', {
        method: 'POST',
        body: JSON.stringify({ company_id: activeCompanyId, email: inviteEmail, role: inviteRole, inviter_id: user.id }),
      });
      toast.success(result.message || t('team.toasts.inviteSuccess'));
      setInviteEmail(''); setShowInvite(false);
      fetchMembers();
    } catch (err) { toast.error(err.message); } finally { setInviting(false); }
  };

  // Changement de rôle
  const handleRoleChange = async (memberId, newRole) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    if (member.user_id === company?.owner_id) {
      toast.error("Impossible de changer votre propre rôle.");
      return;
    }
    try {
      await apiFetch(`/api/team/members/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole, user_id: user.id }),
      });
      toast.success(t('team.toasts.roleUpdated'));
      fetchMembers();
    } catch (err) { toast.error(err.message); }
  };

  // Suppression via modale (message générique)
  const handleRemove = (memberId) => {
    setConfirmModal({
      open: true,
      title: t('team.removeTitle'),
      message: t('team.removeMessageGeneric'),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          await apiFetch(`/api/team/members/${memberId}`, {
            method: 'DELETE',
            body: JSON.stringify({ user_id: user.id }),
          });
          toast.success(t('team.toasts.memberRemoved'));
          fetchMembers();
        } catch (err) { toast.error(err.message); }
      },
    });
  };

  // Quitter l'entreprise
  const handleLeave = () => {
    setConfirmModal({
      open: true,
      title: t('team.leaveTitle'),
      message: t('team.leaveMessage'),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          await apiFetch('/api/team/leave', {
            method: 'POST',
            body: JSON.stringify({ company_id: activeCompanyId, user_id: user.id }),
          });
          toast.success(t('team.toasts.leaveSuccess'));
          window.location.href = '/dashboard/entreprise';
        } catch (err) { toast.error(err.message); }
      },
    });
  };

  const plan = company?.subscription_plan || 'free';
  const memberLimit = getPlanLimit(plan, 'members');
  const canInvite = members.length < memberLimit;

  if (loading) return <div className="min-h-screen pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('team.title')}</h1>
            <p className="text-slate-600">{t('team.subtitle', { company: company?.name })}</p>
          </div>
          <div className="flex gap-2">
            {!isOwner && <Button variant="outline" className="text-red-600" onClick={handleLeave}><LogOut className="w-4 h-4 mr-2" />{t('team.leave')}</Button>}
            {canInvite ? (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowInvite(true)}><UserPlus className="w-4 h-4 mr-2" />{t('team.inviteButton')}</Button>
            ) : (
              <div className="text-sm text-slate-500 flex items-center gap-2"><Clock className="w-4 h-4" />{t('team.memberLimitReached', { limit: memberLimit })}</div>
            )}
          </div>
        </div>

        {/* Modale d'invitation */}
        {showInvite && (
          <Card className="mb-8 border-blue-200 shadow-md">
            <CardHeader><CardTitle>{t('team.invite.title')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('team.invite.email')}</label><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemple.com" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('team.invite.role')}</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md bg-white">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowInvite(false)}>{t('team.invite.cancel')}</Button>
                <Button onClick={handleInvite} disabled={inviting} className="bg-blue-600 text-white">{inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('team.invite.send')}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des membres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />{t('team.membersList')} ({members.length}{memberLimit !== Infinity ? ` / ${memberLimit}` : ''})</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-center text-slate-500 py-8">{t('team.noMembers')}</p>
            ) : (
              <div className="space-y-3">
                {members.map(member => {
                  const firstName = member.user.first_name;
                  const lastName = member.user.last_name;
                  const fullName = [firstName, lastName].filter(Boolean).join(' ');
                  const isPending = member.status === 'pending';
                  const isOwnerMember = member.user_id === company?.owner_id;
                  const displayName = fullName || (isPending ? t('team.pendingInvitation') : '—');
                  const email = member.user.email || '—';
                  const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';
                  const roleConfig = ROLES.find(r => r.value === member.role) || ROLES[2];

                  return (
                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPending ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                          {isPending ? <Clock className="w-5 h-5 text-yellow-600" /> : initial}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 flex items-center gap-2">
                            {displayName}
                            {isOwnerMember && <Badge className="bg-yellow-100 text-yellow-700">{t('team.owner')}</Badge>}
                          </p>
                          <p className="text-sm text-slate-500">{email}</p>
                          {isPending && <Badge className="mt-1 bg-yellow-100 text-yellow-700">{t('team.status.pending')}</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isPending && <Badge className="bg-blue-50 text-blue-700"><roleConfig.icon className="w-3 h-3 mr-1" />{roleConfig.label}</Badge>}
                        {isOwner && !isOwnerMember && (
                          <div className="flex gap-2">
                            {!isPending && (
                              <select value={member.role} onChange={(e) => handleRoleChange(member.id, e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white">
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            )}
                            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleRemove(member.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                        {isOwner && isPending && (
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleRemove(member.id)}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default TeamManagementPage;