import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { formatDate, getStatusLabel } from '../lib/utils';
import {
  Plus, ChevronLeft, Edit, Receipt, Download, CreditCard, Loader2, Mail, Bell, Trash2, FileText
} from 'lucide-react';
import { toast } from 'sonner';

// Factures List Component
export const FacturesList = () => {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { api, isAdmin, formatAmount } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFactures();
  }, [statusFilter]);

  const fetchFactures = async () => {
    try {
      const params = statusFilter && statusFilter !== 'all' ? { statut: statusFilter } : {};
      const response = await api.get('/factures', { params });
      setFactures(response.data);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error fetching factures:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === factures.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(factures.map(f => f.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setDeleting(true);
    let deleted = 0;
    let errors = 0;
    
    for (const id of selectedIds) {
      try {
        await api.delete(`/factures/${id}`);
        deleted++;
      } catch (error) {
        errors++;
      }
    }
    
    setDeleting(false);
    
    if (deleted > 0) {
      toast.success(`${deleted} facture(s) supprimée(s)`);
    }
    if (errors > 0) {
      toast.error(`${errors} facture(s) non supprimable(s) (émises ou payées)`);
    }
    
    fetchFactures();
  };

  // Filter only deletable items (brouillon only)
  const deletableSelected = selectedIds.filter(id => {
    const facture = factures.find(f => f.id === id);
    return facture && facture.statut === 'brouillon';
  });

  return (
    <div className="space-y-6" data-testid="factures-list">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Factures</h1>
          <p className="text-slate-500">Suivez vos factures et paiements</p>
        </div>
        {selectedIds.length > 0 && isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700" disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Supprimer ({deletableSelected.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer {deletableSelected.length} facture(s) ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Seules les factures en brouillon seront supprimées.
                  {selectedIds.length !== deletableSelected.length && (
                    <span className="block mt-2 text-amber-600">
                      {selectedIds.length - deletableSelected.length} facture(s) émise(s)/payée(s) ne seront pas supprimées.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="facture-status-filter">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="emise">Émise</SelectItem>
              <SelectItem value="payee">Payée</SelectItem>
              <SelectItem value="en_retard">En retard</SelectItem>
              <SelectItem value="annulee">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : factures.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucune facture trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {isAdmin && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === factures.length && factures.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </TableHead>
                  )}
                  <TableHead>Numéro</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="text-right">Montant TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factures.map((facture) => (
                  <TableRow
                    key={facture.id}
                    className={`cursor-pointer hover:bg-slate-50 ${selectedIds.includes(facture.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => navigate(`/dashboard/factures/${facture.id}`)}
                    data-testid={`facture-row-${facture.id}`}
                  >
                    {isAdmin && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(facture.id)}
                          onChange={(e) => toggleSelection(facture.id, e)}
                          className="rounded border-slate-300"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <p className="font-mono font-medium text-slate-900">{facture.numero}</p>
                    </TableCell>
                    <TableCell>{facture.client_nom}</TableCell>
                    <TableCell>{formatDate(facture.created_at)}</TableCell>
                    <TableCell>{formatDate(facture.date_echeance)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(facture.montant_ttc)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`status-${facture.statut}`}>
                        {getStatusLabel(facture.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/factures/${facture.id}`);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
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

// Facture Detail Component
export const FactureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, token, isAdmin } = useAuth();
  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({ montant: 0, mode_paiement: '' });
  const [paying, setPaying] = useState(false);
  const [sendingRelance, setSendingRelance] = useState(false);

  useEffect(() => {
    fetchFacture();
  }, [id]);

  const fetchFacture = async () => {
    try {
      const response = await api.get(`/factures/${id}`);
      setFacture(response.data);
      setPaymentData(prev => ({
        ...prev,
        montant: response.data.montant_ttc - (response.data.montant_paye || 0),
      }));
    } catch (error) {
      console.error('Error fetching facture:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmit = async () => {
    try {
      const response = await api.post(`/factures/${id}/emit`);
      if (response.data.email?.status === 'success') {
        toast.success('Facture émise et email envoyé au client');
      } else {
        toast.success('Facture émise');
      }
      fetchFacture();
    } catch (error) {
      console.error('Error emitting facture:', error);
      toast.error('Erreur lors de l\'émission');
    }
  };

  const handleRelance = async () => {
    setSendingRelance(true);
    try {
      const response = await api.post(`/factures/${id}/relance`);
      if (response.data.email?.status === 'success') {
        toast.success(`Relance envoyée (${response.data.jours_retard} jours de retard)`);
      } else {
        toast.error(response.data.email?.message || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Error sending relance:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de la relance');
    } finally {
      setSendingRelance(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      await api.post(`/factures/${id}/pay`, null, {
        params: {
          montant: paymentData.montant,
          mode_paiement: paymentData.mode_paiement,
        }
      });
      toast.success('Paiement enregistré');
      setShowPayment(false);
      fetchFacture();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/factures/${id}`);
      toast.success('Facture supprimée');
      navigate('/dashboard/factures');
    } catch (error) {
      console.error('Error deleting facture:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/factures/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facture_${facture.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!facture) {
    return <div>Facture non trouvée</div>;
  }

  const resteDu = facture.montant_ttc - (facture.montant_paye || 0);

  return (
    <div className="space-y-6" data-testid="facture-detail">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/factures')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Factures
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">{facture.numero}</h1>
            <Badge variant="secondary" className={`status-${facture.statut}`}>
              {getStatusLabel(facture.statut)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {facture.statut === 'brouillon' && (
            <Button onClick={handleEmit} data-testid="emit-facture">
              <Mail className="w-4 h-4 mr-2" />
              Émettre et envoyer
            </Button>
          )}
          {['emise', 'en_retard'].includes(facture.statut) && (
            <>
              <Button onClick={() => setShowPayment(true)} className="bg-emerald-600 hover:bg-emerald-700" data-testid="pay-facture">
                <CreditCard className="w-4 h-4 mr-2" />
                Enregistrer paiement
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRelance} 
                disabled={sendingRelance}
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
                data-testid="relance-facture"
              >
                {sendingRelance ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                Envoyer relance
              </Button>
            </>
          )}
          <Button variant="outline" onClick={downloadPDF} data-testid="download-facture-pdf">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          {facture.devis_id && (
            <Button variant="outline" onClick={() => navigate(`/dashboard/devis/${facture.devis_id}`)}>
              <FileText className="w-4 h-4 mr-2" />
              Voir devis
            </Button>
          )}
          {facture.statut === 'brouillon' && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La facture {facture.numero} sera définitivement supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant</Label>
              <Input
                id="montant"
                type="number"
                value={paymentData.montant}
                onChange={(e) => setPaymentData(prev => ({ ...prev, montant: parseFloat(e.target.value) || 0 }))}
                min="0"
                max={resteDu}
                step="0.01"
                data-testid="payment-amount"
              />
              <p className="text-xs text-slate-500">Reste dû: {formatAmount(resteDu)}</p>
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select
                value={paymentData.mode_paiement}
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, mode_paiement: value }))}
              >
                <SelectTrigger data-testid="payment-mode">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carte">Carte bancaire</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Annuler</Button>
            <Button onClick={handlePay} disabled={paying} data-testid="confirm-payment">
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent>
              {facture.client ? (
                <div>
                  <p className="font-medium">{facture.client.nom} {facture.client.prenom}</p>
                  {facture.client.adresse && (
                    <p className="text-sm text-slate-500">
                      {facture.client.adresse}, {facture.client.code_postal} {facture.client.ville}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">Client non trouvé</p>
              )}
            </CardContent>
          </Card>

          {/* Lines */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Lignes de la facture</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">Prix HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facture.lignes?.map((ligne, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{ligne.description}</TableCell>
                      <TableCell className="text-right">{ligne.quantite}</TableCell>
                      <TableCell className="text-right">{formatAmount(ligne.prix_unitaire)}</TableCell>
                      <TableCell className="text-right">{ligne.tva}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAmount(ligne.quantite * ligne.prix_unitaire)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="border-t border-slate-200 mt-4 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total HT</span>
                      <span className="font-medium">{formatAmount(facture.total_ht)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">TVA</span>
                      <span className="font-medium">{formatAmount(facture.total_tva)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                      <span>Total TTC</span>
                      <span>{formatAmount(facture.montant_ttc)}</span>
                    </div>
                    {facture.montant_paye > 0 && (
                      <>
                        <div className="flex justify-between text-emerald-600">
                          <span>Payé</span>
                          <span>- {formatAmount(facture.montant_paye)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Reste dû</span>
                          <span>{formatAmount(resteDu)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Créée le</span>
                <span>{formatDate(facture.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Échéance</span>
                <span>{formatDate(facture.date_echeance)}</span>
              </div>
              {facture.date_paiement && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payée le</span>
                  <span>{formatDate(facture.date_paiement)}</span>
                </div>
              )}
              {facture.mode_paiement && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode</span>
                  <span className="capitalize">{facture.mode_paiement}</span>
                </div>
              )}
              {facture.devis_id && (
                <div className="pt-2 border-t border-slate-200">
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate(`/dashboard/devis/${facture.devis_id}`)}
                  >
                    Voir le devis associé
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
