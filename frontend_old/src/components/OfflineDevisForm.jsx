import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from './ui/select';
import { 
  FileText, Plus, Trash2, Loader2, WifiOff, Check, UserPlus,
  Euro, Calculator, PenTool
} from 'lucide-react';
import { toast } from 'sonner';
import SignatureCanvas from './SignatureCanvas';
import db from '../lib/offlineDb';

/**
 * Offline Devis Creation Form
 * Allows creating and signing devis without internet connection
 * For Pro & Enterprise plans only
 */
const OfflineDevisForm = ({ 
  clients = [],
  offlineClients = [],
  entreprise,
  onSubmit,
  onClose,
  onCreateOfflineClient
}) => {
  const [step, setStep] = useState(1); // 1: Info, 2: Lignes, 3: Signature
  const [loading, setLoading] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '', // For display
    validite_jours: 30,
    conditions: '',
    notes_internes: ''
  });

  // New client form (for offline creation)
  const [newClient, setNewClient] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: ''
  });

  // Devis lines
  const [lignes, setLignes] = useState([
    { description: '', quantite: 1, prix_unitaire: 0, tva: 21 }
  ]);

  // Signature
  const [signature, setSignature] = useState(null);
  const [signatoryName, setSignatoryName] = useState('');

  // Combined clients (online + offline)
  const allClients = [
    ...clients.map(c => ({ ...c, _isOffline: false })),
    ...offlineClients.map(c => ({ ...c, _isOffline: true, id: c.tempId }))
  ];

  // Calculate totals
  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;

    lignes.forEach(ligne => {
      const ligneHT = ligne.quantite * ligne.prix_unitaire;
      const ligneTVA = ligneHT * (ligne.tva / 100);
      totalHT += ligneHT;
      totalTVA += ligneTVA;
    });

    return {
      totalHT: totalHT.toFixed(2),
      totalTVA: totalTVA.toFixed(2),
      totalTTC: (totalHT + totalTVA).toFixed(2)
    };
  };

  const totals = calculateTotals();

  // Add new line
  const addLine = () => {
    setLignes([...lignes, { description: '', quantite: 1, prix_unitaire: 0, tva: 21 }]);
  };

  // Remove line
  const removeLine = (index) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  // Update line
  const updateLine = (index, field, value) => {
    const updated = [...lignes];
    updated[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setLignes(updated);
  };

  // Handle client selection
  const handleClientSelect = (clientId) => {
    const client = allClients.find(c => c.id === clientId || c.tempId === clientId);
    setFormData({
      ...formData,
      client_id: clientId,
      client_name: client?.nom || ''
    });
  };

  // Create offline client
  const handleCreateOfflineClient = async () => {
    if (!newClient.nom) {
      toast.error('Le nom du client est requis');
      return;
    }

    try {
      const offlineClient = await db.createOfflineClient({
        ...newClient,
        entreprise_id: entreprise.id
      });

      toast.success('Client créé (hors ligne)');
      setShowNewClient(false);
      setNewClient({ nom: '', email: '', telephone: '', adresse: '', ville: '', code_postal: '' });
      
      // Select the new client
      handleClientSelect(offlineClient.tempId);
      
      if (onCreateOfflineClient) {
        onCreateOfflineClient(offlineClient);
      }
    } catch (error) {
      toast.error('Erreur lors de la création du client');
    }
  };

  // Handle signature save
  const handleSignatureSave = (signatureData) => {
    setSignature(signatureData);
    toast.success('Signature enregistrée');
  };

  // Submit devis
  const handleSubmit = async () => {
    // Validation
    if (!formData.client_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    if (lignes.some(l => !l.description || l.prix_unitaire <= 0)) {
      toast.error('Veuillez remplir toutes les lignes du devis');
      return;
    }

    if (step === 3 && !signature) {
      toast.error('Veuillez faire signer le devis');
      return;
    }

    if (step === 3 && !signatoryName) {
      toast.error('Veuillez entrer le nom du signataire');
      return;
    }

    setLoading(true);

    try {
      // Create offline devis
      const devisData = {
        entreprise_id: entreprise.id,
        client_id: formData.client_id,
        client_name: formData.client_name,
        lignes: lignes.map(l => ({
          ...l,
          total_ht: (l.quantite * l.prix_unitaire).toFixed(2)
        })),
        total_ht: parseFloat(totals.totalHT),
        total_tva: parseFloat(totals.totalTVA),
        total_ttc: parseFloat(totals.totalTTC),
        validite_jours: formData.validite_jours,
        conditions: formData.conditions,
        notes_internes: formData.notes_internes,
        devise: entreprise.devise || 'EUR'
      };

      const offlineDevis = await db.createOfflineDevis(devisData);

      // If signed, save signature
      if (signature && signatoryName) {
        await db.saveSignature(offlineDevis.tempId, signatoryName, signature);
      }

      toast.success(
        signature 
          ? 'Devis créé et signé (synchronisation à la reconnexion)' 
          : 'Devis créé (synchronisation à la reconnexion)',
        { icon: <WifiOff className="w-4 h-4" /> }
      );

      if (onSubmit) {
        onSubmit(offlineDevis);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating offline devis:', error);
      toast.error('Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Offline indicator */}
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>Mode hors ligne - Le devis sera synchronisé à la reconnexion</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s 
                ? 'bg-blue-600 text-white' 
                : step > s 
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-600'
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-green-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-slate-500 mb-4">
        {step === 1 && 'Informations client'}
        {step === 2 && 'Lignes du devis'}
        {step === 3 && 'Signature client'}
      </div>

      {/* Step 1: Client Info */}
      {step === 1 && (
        <div className="space-y-4">
          {!showNewClient ? (
            <>
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientSelect}>
                  <SelectTrigger data-testid="client-select">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {allClients.map(client => (
                      <SelectItem key={client.id || client.tempId} value={client.id || client.tempId}>
                        <div className="flex items-center gap-2">
                          {client.nom}
                          {client._isOffline && (
                            <Badge variant="outline" className="text-xs bg-amber-50">
                              <WifiOff className="w-3 h-3 mr-1" />
                              Local
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setShowNewClient(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Nouveau client (hors ligne)
              </Button>
            </>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Nouveau client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={newClient.nom}
                    onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                    placeholder="Nom du client"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={newClient.telephone}
                      onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input
                    value={newClient.adresse}
                    onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Ville</Label>
                    <Input
                      value={newClient.ville}
                      onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Code postal</Label>
                    <Input
                      value={newClient.code_postal}
                      onChange={(e) => setNewClient({ ...newClient, code_postal: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowNewClient(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleCreateOfflineClient} className="flex-1">
                    Créer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>Validité (jours)</Label>
            <Input
              type="number"
              value={formData.validite_jours}
              onChange={(e) => setFormData({ ...formData, validite_jours: parseInt(e.target.value) || 30 })}
              min={1}
              max={90}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes internes</Label>
            <Textarea
              value={formData.notes_internes}
              onChange={(e) => setFormData({ ...formData, notes_internes: e.target.value })}
              placeholder="Notes visibles uniquement par votre équipe"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Step 2: Lines */}
      {step === 2 && (
        <div className="space-y-4">
          {lignes.map((ligne, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">Ligne {index + 1}</Label>
                  {lignes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(index)}
                      className="h-6 w-6 p-0 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Description du service ou produit"
                  value={ligne.description}
                  onChange={(e) => updateLine(index, 'description', e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Qté</Label>
                    <Input
                      type="number"
                      value={ligne.quantite}
                      onChange={(e) => updateLine(index, 'quantite', e.target.value)}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Prix unit. €</Label>
                    <Input
                      type="number"
                      value={ligne.prix_unitaire}
                      onChange={(e) => updateLine(index, 'prix_unitaire', e.target.value)}
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">TVA %</Label>
                    <Select 
                      value={ligne.tva.toString()} 
                      onValueChange={(v) => updateLine(index, 'tva', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="6">6%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-slate-600">
                  = {(ligne.quantite * ligne.prix_unitaire).toFixed(2)} € HT
                </div>
              </div>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addLine} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une ligne
          </Button>

          {/* Totals */}
          <Card className="bg-slate-50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total HT</span>
                <span className="font-medium">{totals.totalHT} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA</span>
                <span className="font-medium">{totals.totalTVA} €</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total TTC</span>
                <span className="text-blue-600">{totals.totalTTC} €</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Conditions</Label>
            <Textarea
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              placeholder="Conditions de paiement, délais, etc."
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Step 3: Signature */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-medium">Résumé du devis</p>
              <p>Client: {formData.client_name}</p>
              <p>Montant: {totals.totalTTC} € TTC</p>
              <p>{lignes.length} ligne(s)</p>
            </div>
          </Card>

          <div className="space-y-2">
            <Label>Nom du signataire *</Label>
            <Input
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="Nom complet du client"
              data-testid="signatory-name-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Signature du client *
            </Label>
            <SignatureCanvas
              onSave={handleSignatureSave}
              onClear={() => setSignature(null)}
              width={350}
              height={150}
            />
          </div>

          {signature && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              Signature enregistrée
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2 pt-4 border-t">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
            Retour
          </Button>
        )}
        
        {step < 3 ? (
          <Button 
            type="button" 
            onClick={() => setStep(step + 1)} 
            className="flex-1"
            disabled={step === 1 && !formData.client_id}
          >
            Suivant
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !signature || !signatoryName}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Créer le devis signé
              </>
            )}
          </Button>
        )}
      </div>

      {/* Option to save without signature */}
      {step === 3 && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSignature(null);
            setSignatoryName('');
            handleSubmit();
          }}
          disabled={loading}
          className="w-full text-slate-500"
        >
          Enregistrer sans signature (brouillon)
        </Button>
      )}
    </div>
  );
};

export default OfflineDevisForm;
