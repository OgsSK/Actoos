import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import usePushNotifications from '../hooks/usePushNotifications';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import {
  formatDate, formatTime, formatCurrency, getStatusLabel, getPriorityLabel,
  priorityColors, getDateLabel
} from '../lib/utils';
import {
  Calendar, Clock, MapPin, Phone, Play, CheckCircle, FileText, Camera,
  Loader2, ChevronRight, User, Navigation, Wifi, WifiOff, RefreshCw,
  Plus, X, Upload, Image as ImageIcon, ChevronLeft, CalendarDays,
  LogOut, Settings, Wrench, Euro, Trash2, Bell, BellOff
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

// Sync Status Component
const SyncStatus = ({ isOnline, pendingCount, isSyncing, onSync }) => {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>En ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Hors ligne</span>
        </>
      )}
      {pendingCount > 0 && (
        <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 h-5 px-1.5">
          {pendingCount}
        </Badge>
      )}
      {isOnline && pendingCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSync} 
          disabled={isSyncing}
          className="h-5 w-5 p-0 ml-1"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};

// Intervention Card for Technician
const InterventionCard = ({ intervention, onClick, onClaim, currentUserId }) => {
  const isPast = new Date(intervention.date_prevue) < new Date();
  const isUrgent = intervention.priorite === 'urgente' || intervention.priorite === 'haute';
  const isAvailable = !intervention.technicien_id;
  const isAssignedToMe = intervention.technicien_id === currentUserId;
  
  return (
    <Card
      className={`border-slate-200 cursor-pointer hover:shadow-md transition-all ${isUrgent ? 'border-l-4 border-l-red-500' : ''} ${isAvailable ? 'border-l-4 border-l-amber-500 bg-amber-50/50' : ''}`}
      onClick={onClick}
      data-testid={`tech-intervention-${intervention.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold text-slate-500">
                {formatTime(intervention.date_prevue)}
              </span>
              <Badge variant="secondary" className={`status-${intervention.statut}`}>
                {getStatusLabel(intervention.statut)}
              </Badge>
              {isAvailable && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 animate-pulse">
                  Disponible
                </Badge>
              )}
              {isUrgent && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {getPriorityLabel(intervention.priorite)}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 truncate">{intervention.titre}</h3>
            {intervention.client && (
              <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                <User className="w-3.5 h-3.5" />
                {intervention.client.nom} {intervention.client.prenom}
              </p>
            )}
            {intervention.adresse && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {intervention.adresse}, {intervention.ville}
              </p>
            )}
            {isAvailable && (
              <Button 
                size="sm" 
                className="mt-2 bg-amber-600 hover:bg-amber-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onClaim(intervention.id);
                }}
                data-testid={`claim-intervention-${intervention.id}`}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Accepter cette mission
              </Button>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};

// Day Section for Week View
const DaySection = ({ date, interventions, onInterventionClick, onClaim, currentUserId }) => {
  const isCurrentDay = isToday(date);
  const dayLabel = format(date, 'EEEE d MMMM', { locale: fr });
  
  return (
    <div className="mb-6">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${isCurrentDay ? 'border-blue-200' : 'border-slate-200'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${isCurrentDay ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {format(date, 'd')}
        </div>
        <div>
          <p className={`font-semibold capitalize ${isCurrentDay ? 'text-blue-600' : 'text-slate-900'}`}>
            {isCurrentDay ? "Aujourd'hui" : format(date, 'EEEE', { locale: fr })}
          </p>
          <p className="text-xs text-slate-500">{format(date, 'd MMMM', { locale: fr })}</p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {interventions.length}
        </Badge>
      </div>
      
      {interventions.length === 0 ? (
        <div className="text-center py-4 text-sm text-slate-400">
          Aucune intervention
        </div>
      ) : (
        <div className="space-y-3">
          {interventions
            .sort((a, b) => new Date(a.date_prevue) - new Date(b.date_prevue))
            .map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onClick={() => onInterventionClick(intervention)}
                onClaim={onClaim}
                currentUserId={currentUserId}
              />
            ))}
        </div>
      )}
    </div>
  );
};

// Quick Actions Component
const QuickActions = ({ intervention, onCall, onNavigate, onStart, onComplete }) => {
  const canStart = intervention.statut === 'planifiee';
  const canComplete = intervention.statut === 'en_cours';
  
  return (
    <div className="flex gap-2 flex-wrap">
      {intervention.client?.telephone && (
        <Button variant="outline" size="sm" onClick={onCall}>
          <Phone className="w-4 h-4 mr-1" />
          Appeler
        </Button>
      )}
      {intervention.adresse && (
        <Button variant="outline" size="sm" onClick={onNavigate}>
          <Navigation className="w-4 h-4 mr-1" />
          Itinéraire
        </Button>
      )}
      {canStart && (
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onStart}>
          <Play className="w-4 h-4 mr-1" />
          Démarrer
        </Button>
      )}
      {canComplete && (
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onComplete}>
          <CheckCircle className="w-4 h-4 mr-1" />
          Terminer
        </Button>
      )}
    </div>
  );
};

// Photo Upload Component
const PhotoUpload = ({ interventionId, photos, onUpload, onDelete }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      await onUpload(file);
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Photos</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
          Ajouter
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div key={photo.id || idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
              <Badge className="absolute bottom-1 left-1 text-xs bg-slate-900/70">
                {photo.type_photo || 'Photo'}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-lg">
          <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          Aucune photo
        </div>
      )}
    </div>
  );
};

// Checklist Component
const ChecklistView = ({ categorie, responses, onChange, readOnly = false }) => {
  if (!categorie || !categorie.checklist_template || categorie.checklist_template.length === 0) {
    return null;
  }

  const getResponseValue = (itemId) => {
    const response = responses?.find(r => r.item_id === itemId);
    return response || { item_id: itemId, checked: false, value: null };
  };

  const updateResponse = (itemId, field, value) => {
    if (readOnly) return;
    
    const item = categorie.checklist_template.find(i => i.id === itemId);
    const existingIdx = responses?.findIndex(r => r.item_id === itemId) ?? -1;
    
    const newResponse = {
      item_id: itemId,
      label: item?.label || '',
      type: item?.type || 'checkbox',
      ...getResponseValue(itemId),
      [field]: value
    };
    
    let newResponses = [...(responses || [])];
    if (existingIdx >= 0) {
      newResponses[existingIdx] = newResponse;
    } else {
      newResponses.push(newResponse);
    }
    
    onChange(newResponses);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: categorie.couleur || '#3B82F6' }}
        />
        <Label className="font-medium">{categorie.nom} - Checklist</Label>
      </div>
      
      <div className="space-y-2">
        {categorie.checklist_template.map((item) => {
          const response = getResponseValue(item.id);
          
          return (
            <div 
              key={item.id} 
              className={`p-3 rounded-lg border ${response.checked || response.value ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}
            >
              {item.type === 'checkbox' && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={response.checked || false}
                    onChange={(e) => updateResponse(item.id, 'checked', e.target.checked)}
                    disabled={readOnly}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    data-testid={`checklist-${item.id}`}
                  />
                  <div className="flex-1">
                    <span className={`text-sm ${item.required ? 'font-medium' : ''}`}>
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                </label>
              )}
              
              {item.type === 'text' && (
                <div className="space-y-1">
                  <Label className="text-sm">
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Textarea
                    value={response.value || ''}
                    onChange={(e) => updateResponse(item.id, 'value', e.target.value)}
                    disabled={readOnly}
                    rows={2}
                    placeholder={item.description || ''}
                    className="text-sm"
                  />
                </div>
              )}
              
              {item.type === 'number' && (
                <div className="space-y-1">
                  <Label className="text-sm">
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    type="number"
                    value={response.value || ''}
                    onChange={(e) => updateResponse(item.id, 'value', e.target.value)}
                    disabled={readOnly}
                    placeholder={item.description || ''}
                    className="text-sm"
                  />
                </div>
              )}
              
              {item.type === 'photo' && (
                <div className="space-y-1">
                  <Label className="text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {response.photo_url ? (
                    <div className="relative w-20 h-20 rounded bg-slate-100">
                      <img src={response.photo_url} alt={item.label} className="w-full h-full object-cover rounded" />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Photo à prendre depuis la section Photos
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Profile Menu Component
const ProfileMenu = ({ user, onLogout }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex-col h-auto py-2 flex-1" data-testid="profile-menu-btn">
          <User className="w-5 h-5 mb-1" />
          <span className="text-xs">Profil</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="font-medium text-sm">{user?.prenom} {user?.nom}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={onLogout} data-testid="logout-btn">
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Create Intervention Form Component
const CreateInterventionForm = ({ clients, categories, onSubmit, onClose, loading }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    titre: '',
    description: '',
    adresse: '',
    ville: '',
    code_postal: '',
    date_prevue: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duree_estimee: 60,
    priorite: 'normale',
    categorie_id: ''
  });

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        adresse: client.adresse || '',
        ville: client.ville || '',
        code_postal: client.code_postal || ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.titre) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={formData.client_id} onValueChange={handleClientChange}>
          <SelectTrigger data-testid="intervention-client-select">
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.nom} {client.prenom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input
          value={formData.titre}
          onChange={e => setFormData(prev => ({ ...prev, titre: e.target.value }))}
          placeholder="Ex: Réparation fuite"
          data-testid="intervention-titre"
        />
      </div>

      <div className="space-y-2">
        <Label>Catégorie</Label>
        <Select 
          value={formData.categorie_id} 
          onValueChange={v => setFormData(prev => ({ ...prev, categorie_id: v }))}
        >
          <SelectTrigger data-testid="intervention-categorie-select">
            <SelectValue placeholder="Sélectionner une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: cat.couleur }}
                  />
                  {cat.nom}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Détails de l'intervention..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date et heure *</Label>
          <Input
            type="datetime-local"
            value={formData.date_prevue}
            onChange={e => setFormData(prev => ({ ...prev, date_prevue: e.target.value }))}
            data-testid="intervention-date"
          />
        </div>
        <div className="space-y-2">
          <Label>Durée (min)</Label>
          <Input
            type="number"
            value={formData.duree_estimee}
            onChange={e => setFormData(prev => ({ ...prev, duree_estimee: parseInt(e.target.value) || 60 }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Adresse</Label>
        <Input
          value={formData.adresse}
          onChange={e => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
          placeholder="Adresse"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Ville</Label>
          <Input
            value={formData.ville}
            onChange={e => setFormData(prev => ({ ...prev, ville: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Code postal</Label>
          <Input
            value={formData.code_postal}
            onChange={e => setFormData(prev => ({ ...prev, code_postal: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Priorité</Label>
        <Select value={formData.priorite} onValueChange={v => setFormData(prev => ({ ...prev, priorite: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basse">Basse</SelectItem>
            <SelectItem value="normale">Normale</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={loading} data-testid="create-intervention-submit">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Créer
        </Button>
      </DialogFooter>
    </form>
  );
};

// Create Devis Form Component (simplified for technician)
const CreateDevisForm = ({ clients, onSubmit, onClose, loading, preselectedClient }) => {
  const [formData, setFormData] = useState({
    client_id: preselectedClient || '',
    lignes: [{ description: '', quantite: 1, prix_unitaire: 0, tva: 20 }],
    conditions: '',
    validite_jours: 30
  });

  const addLigne = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [...prev.lignes, { description: '', quantite: 1, prix_unitaire: 0, tva: 20 }]
    }));
  };

  const removeLigne = (index) => {
    if (formData.lignes.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== index)
    }));
  };

  const updateLigne = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lignes: prev.lignes.map((l, i) => i === index ? { ...l, [field]: value } : l)
    }));
  };

  const calculateTotal = () => {
    return formData.lignes.reduce((sum, l) => {
      const ht = l.quantite * l.prix_unitaire;
      const tva = ht * l.tva / 100;
      return sum + ht + tva;
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    if (formData.lignes.some(l => !l.description || l.prix_unitaire <= 0)) {
      toast.error('Veuillez compléter toutes les lignes du devis');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={formData.client_id} onValueChange={v => setFormData(prev => ({ ...prev, client_id: v }))}>
          <SelectTrigger data-testid="devis-client-select">
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.nom} {client.prenom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Lignes du devis</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLigne}>
            <Plus className="w-4 h-4 mr-1" /> Ligne
          </Button>
        </div>
        
        {formData.lignes.map((ligne, index) => (
          <Card key={index} className="p-3 bg-slate-50">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Description"
                  value={ligne.description}
                  onChange={e => updateLigne(index, 'description', e.target.value)}
                  className="flex-1"
                  data-testid={`devis-ligne-desc-${index}`}
                />
                {formData.lignes.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLigne(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Qté</Label>
                  <Input
                    type="number"
                    min="1"
                    value={ligne.quantite}
                    onChange={e => updateLigne(index, 'quantite', parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Prix HT (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ligne.prix_unitaire}
                    onChange={e => updateLigne(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                    data-testid={`devis-ligne-prix-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">TVA (%)</Label>
                  <Select value={String(ligne.tva)} onValueChange={v => updateLigne(index, 'tva', parseFloat(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5.5">5.5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-slate-100 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total TTC</span>
          <span className="text-lg font-bold text-blue-600" data-testid="devis-total">
            {formatCurrency(calculateTotal())}
          </span>
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={loading} data-testid="create-devis-submit">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
          Créer le devis
        </Button>
      </DialogFooter>
    </form>
  );
};

// Technician App Main View
export const TechnicianApp = () => {
  const [interventions, setInterventions] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [checklistResponses, setChecklistResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('today');
  
  // Modal states
  const [showCreateIntervention, setShowCreateIntervention] = useState(false);
  const [showCreateDevis, setShowCreateDevis] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const { api, user, logout } = useAuth();
  const { 
    isOnline, pendingActions, pendingCount, isSyncing, 
    addPendingAction, syncPendingActions, 
    cacheInterventions, getCachedInterventions 
  } = useOffline();
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    loading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification
  } = usePushNotifications();
  const navigate = useNavigate();

  // Week data
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Load interventions, clients, and categories
  useEffect(() => {
    loadInterventions();
    loadClients();
    loadCategories();
  }, [activeTab]);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadInterventions = async () => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'today') {
        response = await api.get('/interventions/today');
      } else {
        // Week view - fetch all interventions for the week (including available ones)
        const dateDebut = format(weekStart, 'yyyy-MM-dd');
        const dateFin = format(addDays(weekStart, 6), 'yyyy-MM-dd');
        response = await api.get('/interventions', { 
          params: { date_debut: dateDebut, date_fin: dateFin, include_available: true } 
        });
        
        // Enrich with client data for week view
        const clientIds = [...new Set(response.data.map(i => i.client_id))];
        const clientsRes = await api.get('/clients');
        const clientsMap = {};
        clientsRes.data.forEach(c => { clientsMap[c.id] = c; });
        
        response.data = response.data.map(i => ({
          ...i,
          client: clientsMap[i.client_id] || null
        }));
      }
      
      setInterventions(response.data);
      // Cache for offline use
      cacheInterventions(response.data);
    } catch (error) {
      console.error('Error loading interventions:', error);
      // Try to load from cache if offline
      if (!isOnline) {
        const cached = await getCachedInterventions();
        if (cached.length > 0) {
          setInterventions(cached);
          toast.info('Données hors ligne chargées');
        }
      } else {
        toast.error('Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartIntervention = async (id) => {
    if (!isOnline) {
      // Queue for sync if offline
      await addPendingAction({ type: 'start', interventionId: id });
      toast.info('Action enregistrée pour synchronisation');
      // Update local state optimistically
      setInterventions(prev => prev.map(i => 
        i.id === id ? { ...i, statut: 'en_cours', heure_debut: new Date().toISOString() } : i
      ));
      if (selectedIntervention?.id === id) {
        setSelectedIntervention(prev => ({ ...prev, statut: 'en_cours' }));
      }
      return;
    }
    
    try {
      await api.post(`/interventions/${id}/start`);
      toast.success('Intervention démarrée');
      loadInterventions();
      if (selectedIntervention?.id === id) {
        const response = await api.get(`/interventions/${id}`);
        setSelectedIntervention(response.data);
      }
    } catch (error) {
      console.error('Error starting intervention:', error);
      toast.error('Erreur lors du démarrage');
    }
  };

  const handleCompleteIntervention = async (id) => {
    if (!isOnline) {
      await addPendingAction({ type: 'complete', interventionId: id, notes });
      toast.info('Action enregistrée pour synchronisation');
      setInterventions(prev => prev.map(i => 
        i.id === id ? { ...i, statut: 'terminee', heure_fin: new Date().toISOString() } : i
      ));
      setSelectedIntervention(null);
      setNotes('');
      return;
    }
    
    try {
      await api.post(`/interventions/${id}/complete`, null, {
        params: { notes_terrain: notes }
      });
      toast.success('Intervention terminée');
      setNotes('');
      loadInterventions();
      setSelectedIntervention(null);
    } catch (error) {
      console.error('Error completing intervention:', error);
      toast.error('Erreur lors de la clôture');
    }
  };

  // Claim an available intervention
  const handleClaimIntervention = async (id) => {
    if (!isOnline) {
      toast.error('Connexion requise pour accepter une mission');
      return;
    }
    
    try {
      const response = await api.post(`/interventions/${id}/claim`);
      toast.success('Mission acceptée ! Elle vous est maintenant assignée.');
      loadInterventions();
      // Close detail modal if open
      if (selectedIntervention?.id === id) {
        const updated = await api.get(`/interventions/${id}`);
        setSelectedIntervention(updated.data);
      }
    } catch (error) {
      console.error('Error claiming intervention:', error);
      const message = error.response?.data?.detail || 'Erreur lors de l\'acceptation';
      toast.error(message);
      // Refresh list in case someone else claimed it
      loadInterventions();
    }
  };

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const handleNavigate = (intervention) => {
    const address = encodeURIComponent(`${intervention.adresse}, ${intervention.code_postal} ${intervention.ville}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
  };

  const handlePhotoUpload = async (file) => {
    if (!selectedIntervention) return;
    
    if (!isOnline) {
      toast.error('Upload indisponible hors ligne');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type_photo', 'autre');
    
    try {
      await api.post(`/interventions/${selectedIntervention.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo ajoutée');
      // Reload photos
      const response = await api.get(`/interventions/${selectedIntervention.id}/photos`);
      setPhotos(response.data);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erreur lors de l\'upload');
    }
  };

  // Create intervention handler
  const handleCreateIntervention = async (data) => {
    setFormLoading(true);
    try {
      const payload = {
        ...data,
        date_prevue: new Date(data.date_prevue).toISOString()
      };
      await api.post('/interventions', payload);
      toast.success('Intervention créée');
      setShowCreateIntervention(false);
      loadInterventions();
    } catch (error) {
      console.error('Error creating intervention:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setFormLoading(false);
    }
  };

  // Create devis handler
  const handleCreateDevis = async (data) => {
    setFormLoading(true);
    try {
      await api.post('/devis', data);
      toast.success('Devis créé');
      setShowCreateDevis(false);
      setPreselectedClientId(null);
    } catch (error) {
      console.error('Error creating devis:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setFormLoading(false);
    }
  };

  // Open devis form with preselected client
  const openDevisForClient = (clientId) => {
    setPreselectedClientId(clientId);
    setShowCreateDevis(true);
  };

  const selectIntervention = async (intervention) => {
    setSelectedIntervention(intervention);
    setNotes(intervention.notes_terrain || '');
    setChecklistResponses(intervention.checklist_responses || []);
    
    // Load category for checklist
    if (intervention.categorie_id && isOnline) {
      try {
        const catResponse = await api.get(`/categories/${intervention.categorie_id}`);
        setSelectedCategorie(catResponse.data);
      } catch (error) {
        setSelectedCategorie(null);
      }
    } else {
      // Find from local cache
      const cat = categories.find(c => c.id === intervention.categorie_id);
      setSelectedCategorie(cat || null);
    }
    
    // Load photos
    if (isOnline) {
      try {
        const response = await api.get(`/interventions/${intervention.id}/photos`);
        setPhotos(response.data);
      } catch (error) {
        setPhotos([]);
      }
    } else {
      setPhotos([]);
    }
  };

  // Save checklist responses
  const handleSaveChecklist = async () => {
    if (!selectedIntervention || !isOnline) {
      if (!isOnline) toast.error('Connexion requise pour sauvegarder');
      return;
    }
    
    try {
      await api.put(`/interventions/${selectedIntervention.id}/checklist`, checklistResponses);
      toast.success('Checklist sauvegardée');
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Get interventions for a specific day (week view)
  const getInterventionsForDay = (date) => {
    return interventions.filter(i => {
      try {
        return isSameDay(parseISO(i.date_prevue), date);
      } catch {
        return false;
      }
    });
  };

  // Today interventions count
  const todayInterventions = activeTab === 'today' 
    ? interventions 
    : interventions.filter(i => {
        try {
          return isSameDay(parseISO(i.date_prevue), today);
        } catch {
          return false;
        }
      });

  const dateLabel = activeTab === 'today' 
    ? getDateLabel(today.toISOString())
    : `Semaine du ${format(weekStart, 'd MMMM', { locale: fr })}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="tech-app">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/actoos-favicon.png" alt="Actoos" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-bold text-lg text-slate-900">{dateLabel}</h1>
              <p className="text-sm text-slate-500">
                {activeTab === 'today' 
                  ? `${todayInterventions.length} intervention(s)`
                  : `${interventions.length} intervention(s) cette semaine`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Push Notification Toggle */}
            {pushSupported && (
              <Button
                variant={pushSubscribed ? "default" : "outline"}
                size="sm"
                className={`h-8 w-8 p-0 ${pushSubscribed ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={async () => {
                  if (pushSubscribed) {
                    const success = await unsubscribePush();
                    if (success) toast.success('Notifications désactivées');
                  } else {
                    const success = await subscribePush();
                    if (success) {
                      toast.success('Notifications activées');
                      // Send test notification
                      setTimeout(() => sendTestNotification(), 1000);
                    } else if (pushPermission === 'denied') {
                      toast.error('Notifications bloquées par le navigateur');
                    }
                  }
                }}
                disabled={pushLoading}
                title={pushSubscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
                data-testid="push-toggle-btn"
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pushSubscribed ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </Button>
            )}
            <SyncStatus
              isOnline={isOnline}
              pendingCount={pendingCount}
              isSyncing={isSyncing}
              onSync={syncPendingActions}
            />
            <Button variant="ghost" size="sm" onClick={loadInterventions} className="h-8 w-8 p-0">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* View Toggle */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Aujourd'hui
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2" data-testid="week-tab">
              <CalendarDays className="w-4 h-4" />
              Semaine
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : activeTab === 'today' ? (
          // Today View
          interventions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Aucune intervention aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interventions
                .sort((a, b) => new Date(a.date_prevue) - new Date(b.date_prevue))
                .map((intervention) => (
                  <InterventionCard
                    key={intervention.id}
                    intervention={intervention}
                    onClick={() => selectIntervention(intervention)}
                    onClaim={handleClaimIntervention}
                    currentUserId={user?.id}
                  />
                ))}
            </div>
          )
        ) : (
          // Week View
          <div className="space-y-2">
            {weekDays.map((day) => (
              <DaySection
                key={day.toISOString()}
                date={day}
                interventions={getInterventionsForDay(day)}
                onInterventionClick={selectIntervention}
                onClaim={handleClaimIntervention}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-200 px-4 py-2 pb-12 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around max-w-lg mx-auto">
          <Button variant="ghost" className="flex-col h-auto py-2 flex-1" data-testid="nav-agenda">
            <Calendar className="w-5 h-5 mb-1" />
            <span className="text-xs">Agenda</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 flex-1"
            onClick={() => setShowCreateIntervention(true)}
            data-testid="nav-new-intervention"
          >
            <Wrench className="w-5 h-5 mb-1" />
            <span className="text-xs">Intervention</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 flex-1"
            onClick={() => setShowCreateDevis(true)}
            data-testid="nav-new-devis"
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-xs">Devis</span>
          </Button>
          <ProfileMenu user={user} onLogout={logout} />
        </div>
      </nav>

      {/* Create Intervention Modal */}
      <Dialog open={showCreateIntervention} onOpenChange={setShowCreateIntervention}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="create-intervention-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Nouvelle intervention
            </DialogTitle>
            <p id="create-intervention-description" className="sr-only">
              Formulaire de création d'intervention
            </p>
          </DialogHeader>
          <CreateInterventionForm
            clients={clients}
            categories={categories}
            onSubmit={handleCreateIntervention}
            onClose={() => setShowCreateIntervention(false)}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Create Devis Modal */}
      <Dialog open={showCreateDevis} onOpenChange={(open) => {
        setShowCreateDevis(open);
        if (!open) setPreselectedClientId(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="create-devis-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Nouveau devis
            </DialogTitle>
            <p id="create-devis-description" className="sr-only">
              Formulaire de création de devis
            </p>
          </DialogHeader>
          <CreateDevisForm
            clients={clients}
            onSubmit={handleCreateDevis}
            onClose={() => {
              setShowCreateDevis(false);
              setPreselectedClientId(null);
            }}
            loading={formLoading}
            preselectedClient={preselectedClientId}
          />
        </DialogContent>
      </Dialog>

      {/* Intervention Detail Modal */}
      <Dialog open={!!selectedIntervention} onOpenChange={() => setSelectedIntervention(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="intervention-detail-description">
          <DialogHeader>
            <DialogTitle>{selectedIntervention?.titre}</DialogTitle>
            <p id="intervention-detail-description" className="sr-only">
              Détails de l'intervention et actions disponibles
            </p>
          </DialogHeader>
          
          {selectedIntervention && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 py-4">
                {/* Status & Time */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={`status-${selectedIntervention.statut}`}>
                    {getStatusLabel(selectedIntervention.statut)}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {formatTime(selectedIntervention.date_prevue)} • {selectedIntervention.duree_estimee} min
                  </span>
                </div>

                {/* Quick Actions */}
                <QuickActions
                  intervention={selectedIntervention}
                  onCall={() => handleCall(selectedIntervention.client?.telephone)}
                  onNavigate={() => handleNavigate(selectedIntervention)}
                  onStart={() => handleStartIntervention(selectedIntervention.id)}
                  onComplete={() => handleCompleteIntervention(selectedIntervention.id)}
                />

                {/* Client Info */}
                <Card className="border-slate-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Client</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <p className="font-medium">
                      {selectedIntervention.client?.nom} {selectedIntervention.client?.prenom}
                    </p>
                    {selectedIntervention.client?.telephone && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${selectedIntervention.client.telephone}`} className="text-blue-600">
                          {selectedIntervention.client.telephone}
                        </a>
                      </p>
                    )}
                    {selectedIntervention.adresse && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {selectedIntervention.adresse}, {selectedIntervention.code_postal} {selectedIntervention.ville}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Description */}
                {selectedIntervention.description && (
                  <div>
                    <Label className="text-sm text-slate-500">Description</Label>
                    <p className="mt-1">{selectedIntervention.description}</p>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes terrain</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ajoutez vos observations..."
                    rows={3}
                    data-testid="tech-notes"
                  />
                </div>

                {/* Photos */}
                <PhotoUpload
                  interventionId={selectedIntervention.id}
                  photos={photos}
                  onUpload={handlePhotoUpload}
                />

                {/* Checklist */}
                {selectedCategorie && (
                  <div className="space-y-3">
                    <ChecklistView
                      categorie={selectedCategorie}
                      responses={checklistResponses}
                      onChange={setChecklistResponses}
                      readOnly={selectedIntervention.statut === 'terminee' || selectedIntervention.statut === 'annulee'}
                    />
                    {selectedIntervention.statut !== 'terminee' && selectedIntervention.statut !== 'annulee' && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleSaveChecklist}
                        data-testid="save-checklist-btn"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Sauvegarder la checklist
                      </Button>
                    )}
                  </div>
                )}

                {/* Create Devis Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    openDevisForClient(selectedIntervention.client_id);
                    setSelectedIntervention(null);
                  }}
                  data-testid="create-devis-from-intervention"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Créer un devis
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TechnicianApp;
