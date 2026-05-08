import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFactures } from '../lib/supabaseHooks';
import { facturesApi, edgeFunctionsApi, devisApi, clientsApi, interventionsApi } from '../lib/supabaseApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { formatDate, getStatusLabel } from '../lib/utils';
import {
  Plus, ChevronLeft, Edit, Receipt, Download, CreditCard, Loader2, Mail, Bell, Trash2, FileText, Users, Wrench, File, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

// Factures List Component
export const FacturesList = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showDevisModal, setShowDevisModal] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [availableDevis, setAvailableDevis] = useState([]);
  const [availableInterventions, setAvailableInterventions] = useState([]);
  const [loadingDevis, setLoadingDevis] = useState(false);
  const [loadingInterventions, setLoadingInterventions] = useState(false);
  const { user, api, isAdmin, formatAmount } = useAuth();
  const navigate = useNavigate();

  const { data: factures, loading, refetch: fetchFactures } = useFactures(user?.entreprise_id, { statut: statusFilter });

  // Fetch devis available for conversion (accepted devis not yet converted)
  const fetchAvailableDevis = async () => {
    setLoadingDevis(true);
    try {
      const allDevis = await devisApi.list(user?.entreprise_id);
      // Filter devis that are accepted but not yet converted to facture
      const convertible = allDevis.filter(d => 
        d.statut === 'accepte' || d.statut === 'signe' || d.statut === 'brouillon'
      );
      setAvailableDevis(convertible);
    } catch (error) {
      console.error('Error fetching devis:', error);
    } finally {
      setLoadingDevis(false);
    }
  };

  // Fetch interventions available for invoicing (completed interventions)
  const fetchAvailableInterventions = async () => {
    setLoadingInterventions(true);
    try {
      const allInterventions = await interventionsApi.list(user?.entreprise_id);
      // Filter completed interventions
      const billable = allInterventions.filter(i => 
        i.statut === 'terminee' || i.statut === 'planifiee'
      );
      setAvailableInterventions(billable);
    } catch (error) {
      console.error('Error fetching interventions:', error);
    } finally {
      setLoadingInterventions(false);
    }
  };

  const handleOpenDevisModal = () => {
    fetchAvailableDevis();
    setShowDevisModal(true);
  };

  const handleOpenInterventionModal = () => {
    fetchAvailableInterventions();
    setShowInterventionModal(true);
  };

  const handleConvertDevis = async (devisId) => {
    try {
      // Get the devis data
      const devis = await devisApi.get(devisId);
      // Create facture from devis
      const factureData = {
        entreprise_id: user?.entreprise_id,
        client_id: devis.client_id,
        devis_id: devisId,
        lignes: devis.lignes || [],
        total_ht: devis.total_ht || 0,
        total_tva: devis.total_tva || 0,
        total_ttc: devis.total_ttc || 0,
        statut: 'brouillon',
      };
      const newFacture = await facturesApi.create(factureData);
      toast.success('Facture créée depuis le devis');
      setShowDevisModal(false);
      navigate(`/dashboard/factures/${newFacture.id}`);
    } catch (error) {
      toast.error('Erreur lors de la conversion du devis');
      console.error(error);
    }
  };

  const handleCreateFromIntervention = async (interventionId) => {
    try {
      const intervention = await interventionsApi.get(interventionId);
      // Create facture from intervention
      const factureData = {
        entreprise_id: user?.entreprise_id,
        client_id: intervention.client_id,
        intervention_id: interventionId,
        lignes: [{
          description: intervention.titre || 'Intervention',
          quantite: 1,
          prix_unitaire: intervention.prix || 0,
          tva: 20,
        }],
        statut: 'brouillon',
      };
      const newFacture = await facturesApi.create(factureData);
      toast.success('Facture créée depuis l\'intervention');
      setShowInterventionModal(false);
      navigate(`/dashboard/factures/${newFacture.id}`);
    } catch (error) {
      toast.error('Erreur lors de la création de la facture');
      console.error(error);
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
        await facturesApi.delete(id);
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
        <div className="flex items-center gap-2">
          {/* Bouton Nouvelle facture avec dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-facture-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle facture
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Créer une facture depuis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/factures/new')} data-testid="facture-from-scratch">
                <File className="w-4 h-4 mr-2" />
                Nouvelle facture vierge
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenDevisModal} data-testid="facture-from-devis">
                <FileText className="w-4 h-4 mr-2" />
                Depuis un devis
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenInterventionModal} data-testid="facture-from-intervention">
                <Wrench className="w-4 h-4 mr-2" />
                Depuis une intervention
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <SelectItem value="partiel">Paiement partiel</SelectItem>
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
                      <p className="font-mono font-medium text-slate-900">{facture.numero_facture || facture.numero}</p>
                    </TableCell>
                    <TableCell>{facture.client_nom}</TableCell>
                    <TableCell>{formatDate(facture.created_at)}</TableCell>
                    <TableCell>{formatDate(facture.date_echeance)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(facture.total_ttc || facture.montant_ttc)}</TableCell>
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

      {/* Modal de sélection de devis */}
      <Dialog open={showDevisModal} onOpenChange={setShowDevisModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une facture depuis un devis</DialogTitle>
            <DialogDescription>
              Sélectionnez un devis à convertir en facture
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {loadingDevis ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : availableDevis.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>Aucun devis disponible</p>
                <p className="text-sm mt-1">Créez d'abord un devis accepté</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableDevis.map((devis) => (
                  <button
                    key={devis.id}
                    onClick={() => handleConvertDevis(devis.id)}
                    className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    data-testid={`select-devis-${devis.id}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900">{devis.numero_devis}</p>
                        <p className="text-sm text-slate-500">{devis.client_nom || 'Client'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatAmount(devis.total_ttc || 0)}</p>
                        <Badge variant="secondary" className={`status-${devis.statut}`}>
                          {getStatusLabel(devis.statut)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de sélection d'intervention */}
      <Dialog open={showInterventionModal} onOpenChange={setShowInterventionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une facture depuis une intervention</DialogTitle>
            <DialogDescription>
              Sélectionnez une intervention à facturer
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {loadingInterventions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : availableInterventions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Wrench className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>Aucune intervention disponible</p>
                <p className="text-sm mt-1">Complétez d'abord une intervention</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableInterventions.map((intervention) => (
                  <button
                    key={intervention.id}
                    onClick={() => handleCreateFromIntervention(intervention.id)}
                    className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    data-testid={`select-intervention-${intervention.id}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900">{intervention.titre}</p>
                        <p className="text-sm text-slate-500">{intervention.client_nom || 'Client'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">{formatDate(intervention.date_intervention)}</p>
                        <Badge variant="secondary" className={`status-${intervention.statut}`}>
                          {getStatusLabel(intervention.statut)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Facture Detail Component
export const FactureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, token, isAdmin, formatAmount } = useAuth();
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
      const data = await facturesApi.get(id);
      setFacture(data);
      setPaymentData(prev => ({
        ...prev,
        montant: (data.total_ttc || data.montant_ttc) - (data.montant_paye || 0),
      }));
    } catch (error) {
      console.error('Error fetching facture:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmit = async () => {
    try {
      await facturesApi.update(id, { 
        statut: 'envoyee', 
        date_emission: new Date().toISOString() 
      });
      toast.success('Facture émise');
      // Note: Email sending requires Edge Function
      fetchFacture();
    } catch (error) {
      console.error('Error emitting facture:', error);
      toast.error('Erreur lors de l\'émission');
    }
  };

  const handleRelance = async () => {
    setSendingRelance(true);
    try {
      // Note: Email sending requires Edge Function
      toast.info('Envoi de relance en cours de migration vers Supabase');
      fetchFacture();
    } catch (error) {
      console.error('Error sending relance:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de la relance');
    } finally {
      setSendingRelance(false);
    }
  };

  const handlePay = async () => {
    if (!paymentData.montant || paymentData.montant <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    if (!paymentData.mode_paiement) {
      toast.error('Veuillez sélectionner un mode de paiement');
      return;
    }
    
    setPaying(true);
    try {
      const montantPaye = (facture.montant_paye || 0) + paymentData.montant;
      const totalTTC = facture.total_ttc || facture.montant_ttc;
      const isFullyPaid = montantPaye >= totalTTC;
      
      await facturesApi.update(id, {
        montant_paye: montantPaye,
        statut: isFullyPaid ? 'payee' : 'partiel',
        date_paiement: isFullyPaid ? new Date().toISOString() : null,
        mode_paiement: paymentData.mode_paiement,
        reference_paiement: paymentData.reference || null
      });
      
      if (isFullyPaid) {
        toast.success('Facture entièrement payée !');
      } else {
        toast.success(`Paiement enregistré - Reste à payer: ${formatAmount(totalTTC - montantPaye)}`);
      }
      setShowPayment(false);
      setPaymentData({ montant: 0, mode_paiement: '', reference: '', notes: '' });
      fetchFacture();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    try {
      await facturesApi.delete(id);
      toast.success('Facture supprimée');
      navigate('/dashboard/factures');
    } catch (error) {
      console.error('Error deleting facture:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const downloadPDF = async () => {
    try {
      await edgeFunctionsApi.downloadPDF({ 
        type: 'facture', 
        id, 
        entreprise_id: facture.entreprise_id,
        filename: `facture_${facture.numero_facture || facture.numero || id.slice(0, 8)}.pdf`
      });
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

  const resteDu = (facture.total_ttc || facture.montant_ttc) - (facture.montant_paye || 0);

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
            <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">{facture.numero_facture || facture.numero}</h1>
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
          {['emise', 'partiel', 'en_retard'].includes(facture.statut) && (
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
                    Cette action est irréversible. La facture {facture.numero_facture || facture.numero} sera définitivement supprimée.
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
            <DialogDescription>
              {facture.montant_paye > 0 
                ? `Cette facture a déjà été partiellement payée (${formatAmount(facture.montant_paye)})`
                : 'Enregistrez un paiement partiel ou total'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Remaining amount highlight */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-800 font-medium">Reste à payer</span>
                <span className="text-lg font-bold text-amber-900">{formatAmount(resteDu)}</span>
              </div>
              {facture.montant_paye > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Déjà payé: {formatAmount(facture.montant_paye)} sur {formatAmount(facture.total_ttc || facture.montant_ttc)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="montant">Montant du paiement *</Label>
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
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPaymentData(prev => ({ ...prev, montant: resteDu }))}
                >
                  Tout payer ({formatAmount(resteDu)})
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Mode de paiement *</Label>
              <Select
                value={paymentData.mode_paiement}
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, mode_paiement: value }))}
              >
                <SelectTrigger data-testid="payment-mode">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="carte">Carte bancaire</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="en_ligne">Paiement en ligne</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference">Référence (optionnel)</Label>
              <Input
                id="reference"
                placeholder="N° de transaction, chèque..."
                value={paymentData.reference || ''}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Input
                id="notes"
                placeholder="Notes sur ce paiement..."
                value={paymentData.notes || ''}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Annuler</Button>
            <Button 
              onClick={handlePay} 
              disabled={paying || !paymentData.montant || !paymentData.mode_paiement} 
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="confirm-payment"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer le paiement'}
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
                      <span>{formatAmount(facture.total_ttc || facture.montant_ttc)}</span>
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
