import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Users, UserPlus, Loader2, Trash2 } from 'lucide-react';

const CompanyTeamPage = () => {
  const { activeCompanyId } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);

  const searchTimeout = useRef(null);
  const inputRef = useRef(null);

  // ---------- FETCH MEMBERS (direct Supabase) ----------
  const fetchMembers = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('company_members')
      .select('*, user:users(email, first_name, last_name)')
      .eq('company_id', activeCompanyId);
    if (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des membres');
      setMembers([]);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [activeCompanyId]);

  // ---------- SEARCH (via API) ----------
  const updateDropdownPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInviteEmail(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    updateDropdownPosition();
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/admin/search-users?q=${encodeURIComponent(value)}`);
        setSuggestions(res || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const selectUser = (user) => {
    setInviteEmail(user.email);
    setShowSuggestions(false);
  };

  // ---------- INVITE (direct Supabase) ----------
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      const users = await apiFetch(`/api/admin/search-users?q=${encodeURIComponent(inviteEmail)}`);
      const user = users.find((u) => u.email.toLowerCase() === inviteEmail.toLowerCase());
      if (!user) {
        toast.error('Utilisateur introuvable');
        return;
      }

      // Vérifier s'il n'est pas déjà membre
      const { data: existing } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', activeCompanyId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        toast.error('Cet utilisateur est déjà membre.');
        return;
      }

      const { error } = await supabase.from('company_members').insert({
        company_id: activeCompanyId,
        user_id: user.id,
        role: inviteRole,
        is_admin: inviteRole === 'admin',
      });
      if (error) throw error;

      toast.success('Membre ajouté avec succès.');
      setInviteEmail('');
      setShowSuggestions(false);
      fetchMembers();

      try {
        await apiFetch('/api/company/invite-member', {
          method: 'POST',
          body: JSON.stringify({
            email: user.email,
            company_name: 'Votre entreprise',
            role: inviteRole,
          }),
        });
      } catch (emailErr) {
        console.error('Erreur envoi email invitation :', emailErr);
      }
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setSending(false);
    }
  };

  // ---------- CHANGE ROLE (direct Supabase) ----------
  const handleChangeRole = async (memberId, newRole) => {
    const { error } = await supabase
      .from('company_members')
      .update({ role: newRole, is_admin: newRole === 'admin' })
      .eq('id', memberId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Rôle mis à jour');
      fetchMembers();
    }
  };

  // ---------- REMOVE MEMBER (direct Supabase) ----------
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Retirer ce membre ?')) return;
    const { error } = await supabase.from('company_members').delete().eq('id', memberId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Membre retiré');
      fetchMembers();
    }
  };

  // ---------- DROPDOWN CLOSE ----------
  useEffect(() => {
    const handleClick = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', updateDropdownPosition);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', updateDropdownPosition);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto p-4">
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Inviter un membre
            </h2>
            <div className="grid md:grid-cols-[1fr_auto_auto] gap-3">
              <Input
                ref={inputRef}
                value={inviteEmail}
                onChange={handleSearchChange}
                onFocus={updateDropdownPosition}
                placeholder="Email ou nom"
                className="h-11"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-11 border rounded-xl px-3"
              >
                <option value="recruiter">Recruteur</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={handleInvite} disabled={sending}>
                {sending ? <Loader2 className="animate-spin w-4 h-4" /> : 'Inviter'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {showSuggestions && dropdownPos &&
          createPortal(
            <div
              style={{
                position: 'absolute',
                top: dropdownPos.top + 8,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 9999,
              }}
            >
              <ul className="bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {suggestions.map((user) => (
                  <li
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex justify-between"
                  >
                    <div>
                      {user.first_name} {user.last_name}
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <Badge>{user.role === 'company' ? 'Entreprise' : 'Candidat'}</Badge>
                  </li>
                ))}
              </ul>
            </div>,
            document.body
          )
        }

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Membres ({members.length})
            </h2>
            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-gray-50 rounded-xl flex flex-col md:flex-row justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">
                      {m.user?.first_name} {m.user?.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{m.user?.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.id, e.target.value)}
                      className="border rounded-lg px-2"
                    >
                      <option value="recruiter">Recruteur</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button variant="outline" onClick={() => handleRemoveMember(m.id)}>
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