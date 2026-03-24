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
import { Alert, AlertDescription } from '../components/ui/alert';
import { formatDate } from '../lib/utils';
import {
  Plus, UserPlus, User, Mail, Phone, Copy, Check, AlertCircle, Loader2
} from 'lucide-react';

// Techniciens List Component
export const TechniciensList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', nom: '', prenom: '', telephone: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const { api, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
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
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
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
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(user.id, user.statut === 'actif' ? 'desactive' : 'actif')}
                          >
                            {user.statut === 'actif' ? 'Désactiver' : 'Activer'}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
