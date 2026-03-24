import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  formatDate, formatTime, formatCurrency, getStatusLabel, getPriorityLabel,
  priorityColors, getDateLabel
} from '../lib/utils';
import {
  Calendar, Clock, MapPin, Phone, Play, CheckCircle, FileText, Camera,
  Loader2, ChevronRight, User, Navigation, Wifi, WifiOff, RefreshCw,
  Plus, X, Upload, Image as ImageIcon, ChevronLeft, CalendarDays
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
const InterventionCard = ({ intervention, onClick }) => {
  const isPast = new Date(intervention.date_prevue) < new Date();
  const isUrgent = intervention.priorite === 'urgente' || intervention.priorite === 'haute';
  
  return (
    <Card
      className={`border-slate-200 cursor-pointer hover:shadow-md transition-all ${isUrgent ? 'border-l-4 border-l-red-500' : ''}`}
      onClick={onClick}
      data-testid={`tech-intervention-${intervention.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-slate-500">
                {formatTime(intervention.date_prevue)}
              </span>
              <Badge variant="secondary" className={`status-${intervention.statut}`}>
                {getStatusLabel(intervention.statut)}
              </Badge>
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
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};

// Day Section for Week View
const DaySection = ({ date, interventions, onInterventionClick }) => {
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

// Technician App Main View
export const TechnicianApp = () => {
  const [interventions, setInterventions] = useState([]);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('today');
  
  const { api, user, logout } = useAuth();
  const { 
    isOnline, pendingActions, pendingCount, isSyncing, 
    addPendingAction, syncPendingActions, 
    cacheInterventions, getCachedInterventions 
  } = useOffline();
  const navigate = useNavigate();

  // Week data
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Load interventions
  useEffect(() => {
    loadInterventions();
  }, [activeTab]);

  const loadInterventions = async () => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'today') {
        response = await api.get('/interventions/today');
      } else {
        // Week view - fetch all interventions for the week
        const dateDebut = format(weekStart, 'yyyy-MM-dd');
        const dateFin = format(addDays(weekStart, 6), 'yyyy-MM-dd');
        response = await api.get('/interventions', { 
          params: { date_debut: dateDebut, date_fin: dateFin } 
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

  const selectIntervention = async (intervention) => {
    setSelectedIntervention(intervention);
    setNotes(intervention.notes_terrain || '');
    
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
          <div>
            <h1 className="font-bold text-lg text-slate-900">{dateLabel}</h1>
            <p className="text-sm text-slate-500">
              {activeTab === 'today' 
                ? `${todayInterventions.length} intervention(s)`
                : `${interventions.length} intervention(s) cette semaine`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-200 px-4 py-2 fixed bottom-0 left-0 right-0">
        <div className="flex justify-around max-w-lg mx-auto">
          <Button variant="ghost" className="flex-col h-auto py-2 flex-1">
            <Calendar className="w-5 h-5 mb-1" />
            <span className="text-xs">Agenda</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 flex-1"
            onClick={() => navigate('/dashboard/devis/new')}
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-xs">Devis</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 flex-1"
            onClick={logout}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profil</span>
          </Button>
        </div>
      </nav>

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

                {/* Create Devis Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedIntervention(null);
                    navigate('/dashboard/devis/new', {
                      state: {
                        client_id: selectedIntervention.client_id,
                        intervention_id: selectedIntervention.id
                      }
                    });
                  }}
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
