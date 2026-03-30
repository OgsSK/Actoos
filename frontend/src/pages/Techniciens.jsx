import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  Plus, UserPlus, User, Mail, Phone, Copy, Check, AlertCircle, Loader2, Trash2, Wrench, Settings2
} from 'lucide-react';
import { toast } from 'sonner';

// Skills Manager Component
const SkillsManager = ({ user, categories, onUpdate, onClose }) => {
  const [selectedSkills, setSelectedSkills] = useState(user.skills || []);
  const [saving, setSaving] = useState(false);
  const { api } = useAuth();

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
      await api.put(`/users/${user.id}/skills`, { skills: selectedSkills });
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
    maintenance: '🛠️'
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
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteData, setInviteData] = useState({ email: '', nom: '', prenom: '', telephone: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const { api, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const openSkillsDialog = (user) => {
    setSelectedUser(user);
    setShowSkills(true);
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      const response = await api.post('/auth/invite', inviteData);
      setInviteResult(response.data);
      fetchUsers();
    } catch (error) {
      console.error('Error inviting user:', error);
      alert(error.response?.data?.detail || 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await api.put(`/users/${userId}/status`, null, { params: { statut: newStatus } });
      toast.success(`Statut mis à jour`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (userId, userName) => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success(`${userName} a été supprimé`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
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
              <Button data-testid="invite-tech-btn">
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un technicien
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {inviteResult ? 'Invitation envoyée' : 'Inviter un technicien'}
                </DialogTitle>
              </DialogHeader>

              {inviteResult ? (
                <div className="space-y-4 py-4">
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

                  <DialogFooter>
                    <Button onClick={resetInviteDialog}>Fermer</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom *</Label>
                      <Input
                        id="prenom"
                        value={inviteData.prenom}
                        onChange={(e) => setInviteData(prev => ({ ...prev, prenom: e.target.value }))}
                        required
                        data-testid="invite-prenom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={inviteData.nom}
                        onChange={(e) => setInviteData(prev => ({ ...prev, nom: e.target.value }))}
                        required
                        data-testid="invite-nom"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteData.email}
                      onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      data-testid="invite-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={inviteData.telephone}
                      onChange={(e) => setInviteData(prev => ({ ...prev, telephone: e.target.value }))}
                      data-testid="invite-telephone"
                    />
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInvite(false)}>Annuler</Button>
                    <Button onClick={handleInvite} disabled={inviting || !inviteData.email || !inviteData.nom || !inviteData.prenom} data-testid="invite-submit">
                      {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inviter'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

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
