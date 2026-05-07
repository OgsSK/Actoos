import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTechniciens, useCategories } from '../lib/supabaseHooks';
import { usersApi } from '../lib/supabaseApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { formatDate } from '../lib/utils';
import {
  Plus, UserPlus, User, Mail, Phone, Copy, Check, AlertCircle, Loader2, Trash2, Wrench, Settings2,
  MessageSquare, Clock, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

// Skills Manager Component
const SkillsManager = ({ user, categories, onUpdate, onClose }) => {
  const [selectedSkills, setSelectedSkills] = useState(user.skills || []);
  const [saving, setSaving] = useState(false);

  const toggleSkill = (categoryId) => {
    setSelectedSkills(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.update(user.id, { skills: selectedSkills });
      toast.success('Compétences mises à jour');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating skills:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const categoryIcons = {
    plomberie: '🔧',
    electricite: '⚡',
    nettoyage: '✨',
    climatisation: '❄️',
    btp: '🏗️',
    maintenance: '🛠️',
    decoration: '🎨',
    'espaces-verts': '🌿',
    securite: '🔐',
    multiservices: '🔩',
    specialises: '⭐'
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500 mb-4">
        Sélectionnez les catégories d'interventions que ce technicien peut effectuer.
        Un technicien sans compétences assignées peut voir toutes les missions.
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => toggleSkill(cat.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedSkills.includes(cat.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
            data-testid={`skill-${cat.code}`}
          >
            <Checkbox 
              checked={selectedSkills.includes(cat.id)}
              onCheckedChange={() => toggleSkill(cat.id)}
              className="pointer-events-none"
            />
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
              style={{ backgroundColor: cat.couleur }}
            >
              {categoryIcons[cat.code] || '📋'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">{cat.nom}</p>
              <p className="text-xs text-slate-500">{cat.description || cat.code}</p>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Aucune catégorie disponible</p>
        </div>
      )}

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving} data-testid="save-skills-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
        </Button>
      </DialogFooter>
    </div>
  );
};

// Techniciens List Component
export const TechniciensList = () => {
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteMethod, setInviteMethod] = useState('sms');
  const [showSkills, setShowSkills] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteData, setInviteData] = useState({ email: '', nom: '', prenom: '', telephone: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sendingSms, setSendingSms] = useState(null);
  const { user, isAdmin, entreprise } = useAuth();
  const navigate = useNavigate();

  const { data: users, loading, refetch: fetchUsers } = useTechniciens(user?.entreprise_id);
  const { data: categories, refetch: fetchCategories } = useCategories(user?.entreprise_id);

  useEffect(() => {
    fetchPendingInvites();
  }, []);

  const fetchPendingInvites = async () => {
    try {
      // Fetch pending invites from Supabase
      const data = await usersApi.getInvites(user?.entreprise_id);
      setPendingInvites(data.filter(inv => inv.status === 'pending'));
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  const openSkillsDialog = (userItem) => {
    setSelectedUser(userItem);
    setShowSkills(true);
  };

  // Email invitation (old method)
  const handleEmailInvite = async () => {
    setInviting(true);
    try {
      const result = await usersApi.invite({
        ...inviteData,
        entreprise_id: user?.entreprise_id,
        send_email: true
      });
      setInviteResult({ type: 'email', ...result });
      fetchUsers();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  // SMS invitation (new method)
  const handleSmsInvite = async () => {
    setInviting(true);
    try {
      const result = await usersApi.invite({
        telephone: inviteData.telephone,
        nom: inviteData.nom,
        prenom: inviteData.prenom,
        email: inviteData.email || null,
        entreprise_id: user?.entreprise_id,
        send_sms: true
      });
      setInviteResult({ type: 'sms', ...result });
      toast.success('Invitation SMS envoyée !');
      fetchUsers();
      fetchPendingInvites();
    } catch (error) {
      console.error('Error sending SMS invite:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleInvite = () => {
    if (inviteMethod === 'sms') {
      handleSmsInvite();
    } else {
      handleEmailInvite();
    }
  };

  const handleResendInvite = async (inviteId) => {
    setSendingSms(inviteId);
    try {
      await usersApi.resendInvite(inviteId);
      toast.success('SMS renvoyé !');
      fetchPendingInvites();
    } catch (error) {
      toast.error('Erreur lors du renvoi du SMS');
    } finally {
      setSendingSms(null);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await usersApi.cancelInvite(inviteId);
      toast.success('Invitation annulée');
      fetchPendingInvites();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await usersApi.update(userId, { statut: newStatus });
      toast.success(`Statut mis à jour`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (userId, userName) => {
    try {
      await usersApi.delete(userId);
      toast.success(`${userName} a été supprimé`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/activate?token=${inviteResult.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetInviteDialog = () => {
    setInviteData({ email: '', nom: '', prenom: '', telephone: '' });
    setInviteResult(null);
    setShowInvite(false);
    setInviteMethod('sms');
  };

  // Calculate time remaining for invite
  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const hours = Math.max(0, Math.floor((expires - now) / (1000 * 60 * 60)));
    if (hours < 1) {
      const minutes = Math.max(0, Math.floor((expires - now) / (1000 * 60)));
      return `${minutes}min`;
    }
    return `${hours}h`;
  };

  return (
    <div className="space-y-6" data-testid="techniciens-list">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Équipe</h1>
          <p className="text-slate-500">Gérez les techniciens de votre entreprise</p>
        </div>
        {isAdmin && (
          <Dialog open={showInvite} onOpenChange={(open) => { if (!open) resetInviteDialog(); else setShowInvite(true); }}>
            <DialogTrigger asChild>
              <Button data-testid="invite-tech-btn" className="bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un technicien
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {inviteResult ? '✅ Invitation envoyée' : 'Inviter un technicien'}
                </DialogTitle>
              </DialogHeader>

              {inviteResult ? (
                <div className="space-y-4 py-4">
                  {inviteResult.type === 'sms' ? (
                    <>
                      <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                        <MessageSquare className="h-4 w-4" />
                        <AlertDescription>
                          SMS envoyé à {inviteResult.telephone} avec le code d'inscription.
                        </AlertDescription>
                      </Alert>

                      <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Code d'inscription :</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-lg font-bold text-slate-900 tracking-wider bg-white px-3 py-1 rounded border">
                              {inviteResult.invite_code}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => {
                              navigator.clipboard.writeText(inviteResult.invite_code);
                              toast.success('Code copié !');
                            }}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Expire dans :</span>
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            48 heures
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500">
                        Le technicien peut s'inscrire depuis l'app mobile avec son numéro de téléphone et ce code.
                      </p>
                    </>
                  ) : (
                    <>
                      <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                        <Check className="h-4 w-4" />
                        <AlertDescription>
                          L'invitation a été créée avec succès.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label>Lien d'activation</Label>
                        <div className="flex gap-2">
                          <Input
                            value={`${window.location.origin}/activate?token=${inviteResult.invite_token}`}
                            readOnly
                            className="text-xs"
                          />
                          <Button variant="outline" onClick={copyInviteLink}>
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Envoyez ce lien au technicien pour qu'il puisse activer son compte.
                        </p>
                      </div>
                    </>
                  )}

                  <DialogFooter>
                    <Button onClick={resetInviteDialog}>Fermer</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <Tabs value={inviteMethod} onValueChange={setInviteMethod}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="sms" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Par SMS
                      </TabsTrigger>
                      <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Par Email
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="sms" className="space-y-4 mt-4">
                      <Alert className="bg-blue-50 border-blue-200">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 text-sm">
                          Un SMS avec un code à 6 chiffres sera envoyé au technicien. Il pourra s'inscrire via l'app mobile.
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="prenom-sms">Prénom *</Label>
                          <Input
                            id="prenom-sms"
                            value={inviteData.prenom}
                            onChange={(e) => setInviteData(prev => ({ ...prev, prenom: e.target.value }))}
                            required
                            placeholder="Jean"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nom-sms">Nom *</Label>
                          <Input
                            id="nom-sms"
                            value={inviteData.nom}
                            onChange={(e) => setInviteData(prev => ({ ...prev, nom: e.target.value }))}
                            required
                            placeholder="Dupont"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="telephone-sms">Téléphone *</Label>
                        <Input
                          id="telephone-sms"
                          value={inviteData.telephone}
                          onChange={(e) => setInviteData(prev => ({ ...prev, telephone: e.target.value }))}
                          required
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-sms">Email (optionnel)</Label>
                        <Input
                          id="email-sms"
                          type="email"
                          value={inviteData.email}
                          onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="jean.dupont@email.com"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="email" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="prenom-email">Prénom *</Label>
                          <Input
                            id="prenom-email"
                            value={inviteData.prenom}
                            onChange={(e) => setInviteData(prev => ({ ...prev, prenom: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nom-email">Nom *</Label>
                          <Input
                            id="nom-email"
                            value={inviteData.nom}
                            onChange={(e) => setInviteData(prev => ({ ...prev, nom: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-email">Email *</Label>
                        <Input
                          id="email-email"
                          type="email"
                          value={inviteData.email}
                          onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="telephone-email">Téléphone (optionnel)</Label>
                        <Input
                          id="telephone-email"
                          value={inviteData.telephone}
                          onChange={(e) => setInviteData(prev => ({ ...prev, telephone: e.target.value }))}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInvite(false)}>Annuler</Button>
                    <Button 
                      onClick={handleInvite} 
                      disabled={inviting || 
                        !inviteData.nom || 
                        !inviteData.prenom || 
                        (inviteMethod === 'sms' ? !inviteData.telephone : !inviteData.email)
                      }
                      className="bg-emerald-600 hover:bg-emerald-700"
                      data-testid="invite-submit"
                    >
                      {inviting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : inviteMethod === 'sms' ? (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Envoyer le SMS
                        </>
                      ) : (
                        'Créer l\'invitation'
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Clock className="w-4 h-4" />
              Invitations en attente ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div 
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{invite.prenom} {invite.nom}</p>
                      <p className="text-xs text-slate-500">{invite.telephone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      <Clock className="w-3 h-3 mr-1" />
                      {getTimeRemaining(invite.expires_at)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleResendInvite(invite.id)}
                      disabled={sendingSms === invite.id}
                    >
                      {sendingSms === invite.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleCancelInvite(invite.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Dialog */}
      {selectedUser && (
        <Dialog open={showSkills} onOpenChange={(open) => { if (!open) { setShowSkills(false); setSelectedUser(null); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                Compétences de {selectedUser.prenom} {selectedUser.nom}
              </DialogTitle>
            </DialogHeader>
            <SkillsManager 
              user={selectedUser}
              categories={categories}
              onUpdate={fetchUsers}
              onClose={() => { setShowSkills(false); setSelectedUser(null); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Compétences</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  // Get category names for this user's skills
                  const userSkillCategories = (user.skills || [])
                    .map(skillId => categories.find(c => c.id === skillId))
                    .filter(Boolean);
                  
                  return (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.prenom} {user.nom}</p>
                            <p className="text-xs text-slate-500">Depuis {formatDate(user.created_at)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-3.5 h-3.5" />
                            {user.email}
                          </div>
                          {user.telephone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-3.5 h-3.5" />
                              {user.telephone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={user.role === 'admin' ? 'bg-blue-100 text-blue-700' : ''}>
                          {user.role === 'admin' ? 'Administrateur' : 'Technicien'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'tech' ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {userSkillCategories.length > 0 ? (
                              <>
                                {userSkillCategories.slice(0, 2).map(cat => (
                                  <Badge 
                                    key={cat.id} 
                                    variant="outline"
                                    className="text-xs"
                                    style={{ borderColor: cat.couleur, color: cat.couleur }}
                                  >
                                    {cat.nom}
                                  </Badge>
                                ))}
                                {userSkillCategories.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{userSkillCategories.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Toutes</span>
                            )}
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 ml-1"
                                onClick={() => openSkillsDialog(user)}
                                title="Gérer les compétences"
                                data-testid={`edit-skills-${user.id}`}
                              >
                                <Settings2 className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            user.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' :
                            user.statut === 'invite' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }
                        >
                          {user.statut === 'actif' ? 'Actif' : user.statut === 'invite' ? 'En attente' : 'Désactivé'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.derniere_connexion ? formatDate(user.derniere_connexion) : '-'}
                      </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role !== 'admin' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(user.id, user.statut === 'actif' ? 'desactive' : 'actif')}
                              >
                                {user.statut === 'actif' ? 'Désactiver' : 'Activer'}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer {user.prenom} {user.nom} ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Si ce technicien a des interventions actives, vous devrez d'abord les réassigner.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(user.id, `${user.prenom} ${user.nom}`)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
