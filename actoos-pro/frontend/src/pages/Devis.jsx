import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDevis, useClients } from '../lib/supabaseHooks';
import { devisApi, clientsApi, facturesApi, settingsApi, edgeFunctionsApi } from '../lib/supabaseApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
import { Switch } from '../components/ui/switch';
import { ClientSelect } from '../components/ui/searchable-select';
import { formatDate, getStatusLabel } from '../lib/utils';
import {
  Plus, Search, ChevronLeft, Edit, FileText, Send, PenTool, Download,
  Trash2, Receipt, Loader2, X, Check, Mail, ExternalLink, Layers, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { MultiOptionsDevis, DEFAULT_OPTIONS } from '../components/MultiOptionsDevis';

// Signature Pad Component
const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [nom, setNom] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    if (!nom.trim()) {
      alert('Veuillez entrer le nom du signataire');
      return;
    }
    const canvas = canvasRef.current;
    const signature = canvas.toDataURL('image/png');
    onSave(signature, nom);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nom_signataire">Nom du signataire *</Label>
        <Input
          id="nom_signataire"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Entrez votre nom"
          data-testid="signature-name"
        />
      </div>
      
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full h-48 signature-canvas bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
        />
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={clear} type="button">
          <X className="w-4 h-4 mr-2" />
          Effacer
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} type="button">
            Annuler
          </Button>
          <Button onClick={save} type="button" data-testid="signature-save">
            <Check className="w-4 h-4 mr-2" />
            Valider la signature
          </Button>
        </div>
      </div>
    </div>
  );
};

// Line Item Component
const LineItem = ({ ligne, index, onChange, onRemove }) => (
  <div className="grid grid-cols-12 gap-2 items-start">
    <div className="col-span-5">
      <Input
        placeholder="Description"
        value={ligne.description}
        onChange={(e) => onChange(index, 'description', e.target.value)}
        data-testid={`ligne-description-${index}`}
      />
    </div>
    <div className="col-span-2">
      <Input
        type="number"
        placeholder="Qté"
        value={ligne.quantite}
        onChange={(e) => onChange(index, 'quantite', parseFloat(e.target.value) || 0)}
        min="0"
        step="0.5"
        data-testid={`ligne-quantite-${index}`}
      />
    </div>
    <div className="col-span-2">
      <Input
        type="number"
        placeholder="Prix"
        value={ligne.prix_unitaire}
        onChange={(e) => onChange(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
        min="0"
        step="0.01"
        data-testid={`ligne-prix-${index}`}
      />
    </div>
    <div className="col-span-2">
      <Input
        type="number"
        placeholder="TVA %"
        value={ligne.tva}
        onChange={(e) => onChange(index, 'tva', parseFloat(e.target.value) || 0)}
        min="0"
        max="100"
        data-testid={`ligne-tva-${index}`}
      />
    </div>
    <div className="col-span-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="text-red-500 hover:text-red-700"
        type="button"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

// Devis List Component
export const DevisList = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { user, api, isAdmin, formatAmount } = useAuth();
  const navigate = useNavigate();
  
  const { data: devisList, loading, refetch: fetchDevis } = useDevis(user?.entreprise_id, { statut: statusFilter });

  const toggleSelection = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === devisList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(devisList.map(d => d.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setDeleting(true);
    let deleted = 0;
    let errors = 0;
    
    for (const id of selectedIds) {
      try {
        await devisApi.delete(id);
        deleted++;
      } catch (error) {
        errors++;
      }
    }
    
    setDeleting(false);
    
    if (deleted > 0) {
      toast.success(`${deleted} devis supprimé(s)`);
    }
    if (errors > 0) {
      toast.error(`${errors} devis non supprimable(s) (signés ou facturés)`);
    }
    
    fetchDevis();
  };

  // Filter only deletable items for selection
  const deletableSelected = selectedIds.filter(id => {
    const devis = devisList.find(d => d.id === id);
    return devis && ['brouillon', 'envoye'].includes(devis.statut);
  });

  return (
    <div className="space-y-6" data-testid="devis-list">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Devis</h1>
          <p className="text-slate-500">Gérez vos devis et propositions commerciales</p>
        </div>
        <div className="flex gap-2">
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
                  <AlertDialogTitle>Supprimer {deletableSelected.length} devis ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Seuls les devis en brouillon ou envoyés seront supprimés.
                    {selectedIds.length !== deletableSelected.length && (
                      <span className="block mt-2 text-amber-600">
                        {selectedIds.length - deletableSelected.length} devis signé(s)/facturé(s) ne seront pas supprimés.
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
          <Button onClick={() => navigate('/dashboard/devis/new')} data-testid="new-devis-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau devis
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="devis-status-filter">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="envoye">Envoyé</SelectItem>
              <SelectItem value="signe">Signé</SelectItem>
              <SelectItem value="refuse">Refusé</SelectItem>
              <SelectItem value="expire">Expiré</SelectItem>
              <SelectItem value="facture">Facturé</SelectItem>
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
          ) : devisList.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucun devis trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {isAdmin && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === devisList.length && devisList.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </TableHead>
                  )}
                  <TableHead>Numéro</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devisList.map((devis) => (
                  <TableRow
                    key={devis.id}
                    className={`cursor-pointer hover:bg-slate-50 ${selectedIds.includes(devis.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => navigate(`/dashboard/devis/${devis.id}`)}
                    data-testid={`devis-row-${devis.id}`}
                  >
                    {isAdmin && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(devis.id)}
                          onChange={(e) => toggleSelection(devis.id, e)}
                          className="rounded border-slate-300"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <p className="font-mono font-medium text-slate-900">{devis.numero_devis || devis.numero}</p>
                    </TableCell>
                    <TableCell>{devis.client_nom}</TableCell>
                    <TableCell>{formatDate(devis.created_at)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(devis.total_ttc || devis.montant_ttc)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`status-${devis.statut}`}>
                        {getStatusLabel(devis.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/devis/${devis.id}/edit`);
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

// Devis Form Component
export const DevisForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, formatAmount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  
  // Multi-options mode
  const [multiOptionsMode, setMultiOptionsMode] = useState(false);
  const [options, setOptions] = useState(() => 
    DEFAULT_OPTIONS.map(opt => ({ ...opt, lignes: [] }))
  );
  
  // Use hook for clients
  const { data: clients, loading: clientsLoading } = useClients(user?.entreprise_id);
  
  const [formData, setFormData] = useState({
    client_id: location.state?.client_id || '',
    intervention_id: location.state?.intervention_id || '',
    lignes: [{ description: '', quantite: 1, prix_unitaire: 0, tva: 20 }],
    conditions: '',
    validite_jours: 30,
    message_client: '',
    // Multi-options fields
    multi_options: false,
    options: null,
  });

  useEffect(() => {
    if (isEdit) {
      fetchDevis();
    } else {
      // Load default values from settings for new devis
      fetchDevisDefaults();
    }
  }, [id]);

  const fetchDevisDefaults = async () => {
    try {
      const defaults = await settingsApi.getDocumentDefaults(user?.entreprise_id);
      
      // Pre-fill form with global defaults
      setFormData(prev => ({
        ...prev,
        conditions: defaults.conditions_generales || '',
        message_client: defaults.message_client_devis || '',
        validite_jours: defaults.validite_devis_jours || 30,
      }));
      setDefaultsLoaded(true);
    } catch (error) {
      console.error('Error fetching devis defaults:', error);
      setDefaultsLoaded(true);
    }
  };

  const fetchDevis = async () => {
    setLoading(true);
    try {
      const data = await devisApi.get(id);
      setFormData(data);
      
      // Check if devis has multi-options
      if (data.multi_options && data.options) {
        setMultiOptionsMode(true);
        setOptions(data.options);
      }
    } catch (error) {
      console.error('Error fetching devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLigneChange = (index, field, value) => {
    setFormData(prev => {
      const newLignes = [...prev.lignes];
      newLignes[index] = { ...newLignes[index], [field]: value };
      return { ...prev, lignes: newLignes };
    });
  };

  const addLigne = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [...prev.lignes, { description: '', quantite: 1, prix_unitaire: 0, tva: 20 }],
    }));
  };

  const removeLigne = (index) => {
    setFormData(prev => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    if (multiOptionsMode) {
      // Calculate totals for each option
      const optionTotals = options.map(opt => {
        const total_ht = (opt.lignes || []).reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0)), 0);
        const total_tva = (opt.lignes || []).reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0) * (l.tva || 0) / 100), 0);
        return {
          name: opt.name,
          total_ht,
          total_tva,
          total_ttc: total_ht + total_tva,
        };
      });
      
      // Return the recommended option's totals as default
      const recommended = options.find(o => o.recommended) || options[0];
      const recTotals = optionTotals.find(t => t.name === recommended?.name) || optionTotals[0];
      
      return {
        total_ht: recTotals?.total_ht?.toFixed(2) || '0.00',
        total_tva: recTotals?.total_tva?.toFixed(2) || '0.00',
        total_ttc: recTotals?.total_ttc?.toFixed(2) || '0.00',
        optionTotals,
      };
    }
    
    const total_ht = formData.lignes.reduce((sum, l) => sum + (l.quantite * l.prix_unitaire), 0);
    const total_tva = formData.lignes.reduce((sum, l) => sum + (l.quantite * l.prix_unitaire * l.tva / 100), 0);
    return {
      total_ht: total_ht.toFixed(2),
      total_tva: total_tva.toFixed(2),
      total_ttc: (total_ht + total_tva).toFixed(2),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.client_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    
    if (multiOptionsMode) {
      // Validate multi-options
      const hasValidOption = options.some(opt => 
        opt.lignes && opt.lignes.length > 0 && 
        opt.lignes.some(l => l.description && l.prix_unitaire > 0)
      );
      
      if (!hasValidOption) {
        toast.error('Veuillez remplir au moins une option avec des lignes valides');
        return;
      }
    } else {
      if (!formData.lignes || formData.lignes.length === 0) {
        toast.error('Veuillez ajouter au moins une ligne');
        return;
      }
      
      const hasValidLigne = formData.lignes.some(l => l.description && l.prix_unitaire > 0);
      if (!hasValidLigne) {
        toast.error('Veuillez remplir au moins une ligne avec description et prix');
        return;
      }
    }
    
    setSaving(true);
    try {
      // Calculate totals
      const totals = calculateTotals();
      
      // Prepare payload
      const payload = {
        ...formData,
        entreprise_id: user?.entreprise_id,
        validite_jours: parseInt(formData.validite_jours) || 30,
        multi_options: multiOptionsMode,
        total_ht: parseFloat(totals.total_ht),
        total_tva: parseFloat(totals.total_tva),
        total_ttc: parseFloat(totals.total_ttc),
      };
      
      if (multiOptionsMode) {
        // Store options in the payload
        payload.options = options.map(opt => ({
          id: opt.id,
          name: opt.name,
          description: opt.description,
          color: opt.color,
          recommended: opt.recommended,
          lignes: opt.lignes,
        }));
        // Keep lignes from recommended option for backwards compatibility
        const recommended = options.find(o => o.recommended) || options[0];
        payload.lignes = recommended?.lignes || [];
      }
      
      if (isEdit) {
        await devisApi.update(id, payload);
        toast.success('Devis mis à jour');
      } else {
        await devisApi.create(payload);
        toast.success('Devis créé avec succès');
      }
      navigate('/dashboard/devis');
    } catch (error) {
      console.error('Error saving devis:', error);
      toast.error(error.message || 'Erreur lors de la création du devis');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  if (loading || clientsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="devis-form">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {isEdit ? 'Modifier le devis' : 'Nouveau devis'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <ClientSelect
                  clients={clients || []}
                  value={formData.client_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                  loading={clientsLoading}
                  data-testid="devis-client"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validite_jours">Validité (jours)</Label>
                <Input
                  id="validite_jours"
                  name="validite_jours"
                  type="number"
                  value={formData.validite_jours}
                  onChange={handleChange}
                  min="1"
                  data-testid="devis-validite"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mode Toggle - Multi-options */}
        <Card className="border-slate-200 mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor="multi-options-toggle" className="text-base font-semibold cursor-pointer">
                    Mode multi-options (Good/Better/Best)
                  </Label>
                  <p className="text-sm text-slate-500">
                    Proposez plusieurs options tarifaires à votre client
                  </p>
                </div>
              </div>
              <Switch
                id="multi-options-toggle"
                checked={multiOptionsMode}
                onCheckedChange={(checked) => {
                  setMultiOptionsMode(checked);
                  if (checked && options[0].lignes.length === 0) {
                    // Copy current lignes to first option
                    const newOptions = [...options];
                    newOptions[0].lignes = [...formData.lignes];
                    setOptions(newOptions);
                  }
                }}
                data-testid="multi-options-toggle"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lines - Standard Mode */}
        {!multiOptionsMode && (
          <Card className="border-slate-200 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Lignes du devis</CardTitle>
                <Button variant="outline" size="sm" onClick={addLigne} type="button" data-testid="add-ligne">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une ligne
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 uppercase">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Quantité</div>
                <div className="col-span-2">Prix HT</div>
                <div className="col-span-2">TVA %</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* Lines */}
              {formData.lignes.map((ligne, index) => (
                <LineItem
                  key={index}
                  ligne={ligne}
                  index={index}
                  onChange={handleLigneChange}
                  onRemove={removeLigne}
                />
              ))}

              {/* Totals */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total HT</span>
                      <span className="font-medium">{formatAmount(parseFloat(totals.total_ht))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">TVA</span>
                      <span className="font-medium">{formatAmount(parseFloat(totals.total_tva))}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                      <span>Total TTC</span>
                      <span>{formatAmount(parseFloat(totals.total_ttc))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Multi-Options Mode */}
        {multiOptionsMode && (
          <Card className="border-slate-200 mb-6">
            <CardContent className="pt-6">
              <MultiOptionsDevis
                options={options}
                onChange={setOptions}
                formatAmount={formatAmount}
                mode="edit"
              />
            </CardContent>
          </Card>
        )}

        {/* Conditions */}
        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">Conditions et message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conditions">Conditions générales</Label>
              <Textarea
                id="conditions"
                name="conditions"
                value={formData.conditions}
                onChange={handleChange}
                rows={3}
                placeholder="Conditions de paiement, délais, garanties..."
                data-testid="devis-conditions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message_client">Message au client</Label>
              <Textarea
                id="message_client"
                name="message_client"
                value={formData.message_client}
                onChange={handleChange}
                rows={2}
                placeholder="Message personnalisé..."
                data-testid="devis-message"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving} data-testid="devis-submit">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEdit ? 'Enregistrer' : 'Créer le devis'}
          </Button>
        </div>
      </form>
    </div>
  );
};

// Devis Detail Component
export const DevisDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, token, isAdmin, formatAmount } = useAuth();
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchDevis();
  }, [id]);

  const fetchDevis = async () => {
    try {
      const data = await devisApi.get(id);
      setDevis(data);
    } catch (error) {
      console.error('Error fetching devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!devis?.client?.email) {
      toast.error('Le client n\'a pas d\'adresse email');
      return;
    }
    
    setSending(true);
    const toastId = toast.loading('Génération et envoi du devis...');
    try {
      // Update status to sent
      await devisApi.update(id, { 
        statut: 'envoye', 
        date_envoi: new Date().toISOString() 
      });
      
      // Generate PDF for attachment (use multi-options PDF if applicable)
      const pdfModule = await import('../lib/pdfService');
      let doc;
      if (devis.multi_options && devis.options) {
        doc = await pdfModule.generateMultiOptionsDevisPDF(devis, devis.entreprise, devis.client);
      } else {
        doc = await pdfModule.generateDevisPDF(devis, devis.entreprise, devis.client);
      }
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Send email with PDF attachment
      const { sendDevisEmail } = await import('../lib/emailService');
      const result = await sendDevisEmail(devis, devis.client, devis.entreprise, pdfBase64);
      
      toast.dismiss(toastId);
      if (result.method === 'mailto') {
        toast.success('Devis envoyé - Votre client mail s\'ouvre pour confirmer l\'envoi');
      } else {
        toast.success('Devis envoyé par email avec le PDF en pièce jointe !');
      }
      
      fetchDevis();
    } catch (error) {
      console.error('Error sending devis:', error);
      toast.dismiss(toastId);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleSign = async (signature, nom) => {
    try {
      await devisApi.update(id, {
        statut: 'signe',
        signature_client: signature,
        nom_signataire: nom,
        date_signature: new Date().toISOString()
      });
      setShowSignature(false);
      fetchDevis();
    } catch (error) {
      console.error('Error signing devis:', error);
    }
  };

  const handleCreateFacture = async () => {
    try {
      // Create facture from devis data - using correct column names per SCHEMA_SUPABASE.md
      const factureData = {
        client_id: devis.client_id,
        entreprise_id: devis.entreprise_id,
        devis_id: devis.id,
        lignes: devis.lignes,
        total_ht: devis.total_ht || devis.montant_ht,
        total_tva: devis.total_tva || devis.montant_tva,
        total_ttc: devis.total_ttc || devis.montant_ttc,
        statut: 'brouillon',
        conditions_paiement: devis.conditions || '',
        notes: devis.message_client || ''
      };
      
      const newFacture = await facturesApi.create(factureData);
      toast.success(`Facture créée`);
      navigate(`/dashboard/factures/${newFacture.id}`);
    } catch (error) {
      console.error('Error creating facture:', error);
      toast.error(error.message || 'Erreur lors de la création de la facture');
    }
  };

  const downloadPDF = async () => {
    try {
      toast.loading('Génération du PDF...');
      const pdfModule = await import('../lib/pdfService');
      
      let doc;
      if (devis.multi_options && devis.options) {
        // Use multi-options PDF generator
        doc = await pdfModule.generateMultiOptionsDevisPDF(devis, devis.entreprise, devis.client);
      } else {
        // Use standard PDF generator
        doc = await pdfModule.generateDevisPDF(devis, devis.entreprise, devis.client);
      }
      
      pdfModule.downloadPDF(doc, `devis_${devis.numero_devis || id.slice(0, 8)}.pdf`);
      toast.dismiss();
      toast.success('PDF téléchargé');
    } catch (error) {
      toast.dismiss();
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleDelete = async () => {
    try {
      await devisApi.delete(id);
      toast.success('Devis supprimé');
      navigate('/dashboard/devis');
    } catch (error) {
      console.error('Error deleting devis:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const copyPortalLink = () => {
    const link = `${window.location.origin}/portal/devis/${devis.token_client}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié dans le presse-papier');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!devis) {
    return <div>Devis non trouvé</div>;
  }

  return (
    <div className="space-y-6" data-testid="devis-detail">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/devis')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Devis
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">{devis.numero_devis || devis.numero}</h1>
            <Badge variant="secondary" className={`status-${devis.statut}`}>
              {getStatusLabel(devis.statut)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {devis.statut === 'brouillon' && (
            <Button onClick={handleSend} disabled={sending} data-testid="send-devis">
              <Mail className="w-4 h-4 mr-2" />
              {sending ? 'Envoi...' : 'Envoyer au client'}
            </Button>
          )}
          {['brouillon', 'envoye'].includes(devis.statut) && (
            <Button variant="outline" onClick={() => setShowSignature(true)} data-testid="sign-devis">
              <PenTool className="w-4 h-4 mr-2" />
              Signer
            </Button>
          )}
          {devis.statut === 'signe' && (
            <Button onClick={handleCreateFacture} className="bg-emerald-600 hover:bg-emerald-700" data-testid="create-facture">
              <Receipt className="w-4 h-4 mr-2" />
              Créer la facture
            </Button>
          )}
          <Button variant="outline" onClick={downloadPDF} data-testid="download-pdf">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          {['brouillon', 'envoye'].includes(devis.statut) && (
            <Button variant="outline" onClick={() => navigate(`/dashboard/devis/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          )}
          {devis.token_client && (
            <Button variant="outline" onClick={copyPortalLink} title="Copier le lien client">
              <ExternalLink className="w-4 h-4 mr-2" />
              Lien client
            </Button>
          )}
          {['brouillon', 'envoye'].includes(devis.statut) && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer le devis ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le devis {devis.numero_devis || devis.numero} sera définitivement supprimé.
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

      {/* Signature Dialog */}
      <Dialog open={showSignature} onOpenChange={setShowSignature}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Signature du devis</DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={handleSign}
            onCancel={() => setShowSignature(false)}
          />
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
              {devis.client ? (
                <div>
                  <p className="font-medium">{devis.client.nom} {devis.client.prenom}</p>
                  {devis.client.adresse && (
                    <p className="text-sm text-slate-500">
                      {devis.client.adresse}, {devis.client.code_postal} {devis.client.ville}
                    </p>
                  )}
                  {devis.client.email && <p className="text-sm text-slate-500">{devis.client.email}</p>}
                  {devis.client.telephone && <p className="text-sm text-slate-500">{devis.client.telephone}</p>}
                </div>
              ) : (
                <p className="text-slate-500">Client non trouvé</p>
              )}
            </CardContent>
          </Card>

          {/* Lines or Multi-Options */}
          {devis.multi_options && devis.options ? (
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-base">Options du devis</CardTitle>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {devis.options.length} options
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <MultiOptionsDevis
                  options={devis.options}
                  onChange={() => {}}
                  formatAmount={formatAmount}
                  mode="comparison"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Lignes du devis</CardTitle>
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
                    {devis.lignes?.map((ligne, idx) => (
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
                        <span className="font-medium">{formatAmount(devis.total_ht)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">TVA</span>
                        <span className="font-medium">{formatAmount(devis.total_tva)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                        <span>Total TTC</span>
                        <span>{formatAmount(devis.total_ttc || devis.montant_ttc)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Créé le</span>
                <span>{formatDate(devis.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expire le</span>
                <span>{formatDate(devis.date_expiration)}</span>
              </div>
              {devis.date_signature && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Signé le</span>
                  <span>{formatDate(devis.date_signature)}</span>
                </div>
              )}
              {devis.nom_signataire && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Signataire</span>
                  <span>{devis.nom_signataire}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signature display if signed */}
          {devis.statut === 'signe' && devis.signature_client && (
            <Card className="border-slate-200 border-emerald-200 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                  <Check className="w-4 h-4" />
                  Signature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border border-slate-200 rounded-lg p-2">
                  <img 
                    src={devis.signature_client} 
                    alt="Signature" 
                    className="w-full h-auto max-h-24 object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client Portal */}
          {devis.token_client && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Lien client</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-2">
                  Partagez ce lien avec votre client pour qu'il puisse voir et signer le devis.
                </p>
                <code className="block p-2 bg-slate-100 rounded text-xs break-all">
                  {window.location.origin}/portal/devis/{devis.token_client}
                </code>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
