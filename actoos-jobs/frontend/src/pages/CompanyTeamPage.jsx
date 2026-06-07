import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Users, UserPlus, Loader2, Trash2, Shield } from 'lucide-react';

const CompanyTeamPage = () => {
  const { activeCompanyId } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [sending, setSending] = useState(false);

  const fetchMembers = async () => {
    if (!activeCompanyId) return;
    const { data, error } = await supabase
      .from('company_members')
      .select('*, user:users(email, first_name, last_name)')
      .eq('company_id', activeCompanyId);
    if (!error) setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [activeCompanyId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      // Vérifier que l'utilisateur existe
      const { data: userData, error: userError } = await supabase
        .from('users').select('id').eq('email', inviteEmail.trim().toLowerCase()).single();
      if (userError || !userData) {
        toast.error('Aucun utilisateur trouvé avec cet email');
        setSending(false);
        return;
      }
      // Vérifier qu'il n'est pas déjà membre
      const { data: existing } = await supabase
        .from('company_members')
        .select('id').eq('company_id', activeCompanyId).eq('user_id', userData.id).maybeSingle();
      if (existing) {
        toast.error('Cet utilisateur est déjà membre');
        setSending(false);
        return;
      }
      // Insérer
      const { error: insertError } = await supabase.from('company_members').insert({
        company_id: activeCompanyId,
        user_id: userData.id,
        role: inviteRole,
        is_admin: inviteRole === 'admin',
      });
      if (insertError) throw insertError;
      toast.success('Membre ajouté avec succès');
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'ajout');
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Retirer ce membre ?')) return;
    const { error } = await supabase.from('company_members').delete().eq('id', memberId);
    if (error) toast.error('Erreur');
    else {
      toast.success('Membre retiré');
      fetchMembers();
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    const { error } = await supabase.from('company_members').update({
      role: newRole,
      is_admin: newRole === 'admin',
    }).eq('id', memberId);
    if (error) toast.error('Erreur');
    else {
      toast.success('Rôle mis à jour');
      fetchMembers();
    }
  };

  if (loading) return <div className="min-h-screen pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Gérer l'équipe</h1>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600" />Inviter un membre</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Email de l'utilisateur"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-10 border border-slate-200 rounded-xl px-3 bg-white"
              >
                <option value="recruiter">Recruteur</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim()} className="bg-blue-600 text-white hover:bg-blue-700">
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Inviter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Membres ({members.length})</h2>
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900">{member.user?.first_name} {member.user?.last_name}</p>
                    <p className="text-sm text-slate-500">{member.user?.email}</p>
                    <Badge className="mt-1">{member.role === 'admin' ? 'Admin' : 'Recruteur'}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="h-8 border border-slate-200 rounded-lg px-2 text-sm bg-white"
                    >
                      <option value="recruiter">Recruteur</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleRemoveMember(member.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyTeamPage;