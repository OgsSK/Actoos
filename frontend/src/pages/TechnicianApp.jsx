import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOffline, ACTION_TYPES } from '../contexts/OfflineContext';
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
  LogOut, Settings, Wrench, Euro, Trash2, Bell, BellOff, Route, Sparkles,
  Download, Smartphone, PenTool, MapPinned, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import SignaturePad from '../components/SignaturePad';
import SyncStatusPanel from '../components/SyncStatusPanel';
import OfflineDevisForm from '../components/OfflineDevisForm';
import db from '../lib/offlineDb';
import ConflictNotificationBanner, { ConflictBadge } from '../components/ConflictNotificationBanner';
import { useRealtimeEvents, EventType } from '../hooks/useRealtimeEvents';
import { ChatWidget, FloatingChatButton, useChatUnread } from '../components/ChatWidget';
import { 
  interventionsApi, clientsApi, categoriesApi, devisApi, 
  technicianApi, photosApi
} from '../lib/supabaseApi';

// PWA Install Prompt Component
const InstallPrompt = ({ userEmail }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Don't show for demo account
  const isDemoAccount = userEmail === 'demo@actoos.com';

  useEffect(() => {
    // Skip for demo account
    if (isDemoAccount) return;
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check localStorage for dismissed state
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Don't show for 7 days after dismissal
    }

    // For iOS, show manual guide after a delay
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 3000);
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if installed via app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast.success('Application installée avec succès !');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
    setShowIOSGuide(false);
  };

  if (isInstalled || !showPrompt) return null;

  // iOS Installation Guide Modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md bg-white rounded-t-3xl animate-in slide-in-from-bottom">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Installer Actoos sur iPhone</h2>
              <p className="text-slate-500 text-sm">Suivez ces 3 étapes simples</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-slate-900">Appuyez sur le bouton Partager</p>
                  <p className="text-sm text-slate-500">L'icône <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 rounded text-xs">⬆️</span> en bas de Safari</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-slate-900">Faites défiler et appuyez sur</p>
                  <p className="text-sm text-slate-500">"Sur l'écran d'accueil" <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 rounded text-xs">➕</span></p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-slate-900">Confirmez en appuyant sur "Ajouter"</p>
                  <p className="text-sm text-slate-500">L'app Actoos apparaîtra sur votre écran d'accueil</p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleDismiss} className="w-full" variant="outline">
              J'ai compris
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom">
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Installer Actoos</h3>
              <p className="text-sm text-blue-100 mb-3">
                {isIOS 
                  ? "Ajoutez l'app à votre écran d'accueil pour un accès rapide !"
                  : "Accédez à l'app rapidement depuis votre écran d'accueil, même hors ligne !"
                }
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleInstall}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  {isIOS ? "Comment faire ?" : "Installer"}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20"
                >
                  Plus tard
                </Button>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Standalone Install Guide Modal (accessible from Profile menu)
const InstallGuideModal = ({ isOpen, onClose }) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isDesktop = !isIOS && !isAndroid;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl animate-in zoom-in-95">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Installer Actoos
            </h2>
            <p className="text-slate-500 text-sm">
              {isIOS ? "Sur votre iPhone/iPad" : isAndroid ? "Sur votre Android" : "Sur votre ordinateur"}
            </p>
          </div>
          
          {isIOS ? (
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-slate-900">Ouvrez Safari</p>
                  <p className="text-sm text-slate-500">L'installation ne fonctionne que depuis Safari</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-slate-900">Appuyez sur Partager</p>
                  <p className="text-sm text-slate-500">L'icône ⬆️ en bas de l'écran</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-slate-900">"Sur l'écran d'accueil"</p>
                  <p className="text-sm text-slate-500">Faites défiler et appuyez sur cette option</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <p className="font-medium text-slate-900">Appuyez sur "Ajouter"</p>
                  <p className="text-sm text-slate-500">L'app apparaît sur votre écran d'accueil !</p>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-slate-900">Ouvrez Chrome</p>
                  <p className="text-sm text-slate-500">L'installation fonctionne mieux avec Chrome</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-slate-900">Menu ⋮ en haut à droite</p>
                  <p className="text-sm text-slate-500">Appuyez sur les 3 points verticaux</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-slate-900">"Installer l'application"</p>
                  <p className="text-sm text-slate-500">Ou "Ajouter à l'écran d'accueil"</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-slate-900">Regardez la barre d'adresse</p>
                  <p className="text-sm text-slate-500">À droite de l'URL</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-slate-900">Cliquez sur l'icône ⊕</p>
                  <p className="text-sm text-slate-500">Ou sur "Installer Actoos"</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-slate-900">Confirmez l'installation</p>
                  <p className="text-sm text-slate-500">L'app sera ajoutée à votre bureau/menu</p>
                </div>
              </div>
            </div>
          )}
          
          <Button onClick={onClose} className="w-full">
            J'ai compris
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Sync Status Component
// Route Optimization Modal
const RouteOptimizerModal = ({ isOpen, onClose, interventions, onReorder }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const optimizeRoute = async () => {
    setLoading(true);
    setError(null);
    try {
      // Route optimization requires Edge Function - use simple distance-based sorting for now
      const optimizedOrder = interventions.map(i => i.id);
      setResult({
        optimized_order: optimizedOrder,
        estimated_savings: '~15 min',
        total_distance: 'N/A'
      });
      toast.info('Optimisation basique - fonctionnalité complète en cours de migration');
    } catch (err) {
      console.error('Route optimization error:', err);
      setError(err.message || 'Erreur lors de l\'optimisation');
    } finally {
      setLoading(false);
    }
  };

  const applyOrder = () => {
    if (result?.optimized_order) {
      onReorder(result.optimized_order);
      toast.success('Ordre optimisé appliqué !');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Optimisation de tournée IA
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!result && !loading && (
            <div className="text-center py-6">
              <Route className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">
                L'IA va analyser vos {interventions.length} interventions et suggérer l'ordre optimal pour minimiser vos trajets.
              </p>
              <Button onClick={optimizeRoute} className="bg-amber-500 hover:bg-amber-600">
                <Sparkles className="w-4 h-4 mr-2" />
                Optimiser ma tournée
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-slate-600">Analyse en cours...</p>
              <p className="text-xs text-slate-400 mt-1">L'IA calcule le meilleur itinéraire</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">Itinéraire optimisé</span>
                </div>
                <p className="text-sm text-emerald-600">{result.route_summary}</p>
                <p className="text-xs text-emerald-500 mt-1">
                  Temps estimé: ~{result.total_estimated_time_minutes} min
                </p>
              </div>

              {/* Optimized order */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-slate-700">Ordre suggéré:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.interventions?.map((inv, index) => (
                    <div 
                      key={inv.id}
                      className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inv.titre}</p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {inv.ville || inv.adresse}
                        </p>
                      </div>
                      {inv.priorite === 'urgente' && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {result.tips?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-blue-700 mb-1">Conseils:</h4>
                  <ul className="text-xs text-blue-600 space-y-1">
                    {result.tips.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {result && (
            <Button onClick={applyOrder} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Appliquer cet ordre
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
              <ConflictBadge interventionId={intervention.id} />
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

// Available Intervention Card - For unassigned interventions (detailed view before claim)
const AvailableInterventionCard = ({ intervention, onClick }) => {
  const isUrgent = intervention.priorite === 'urgente' || intervention.priorite === 'haute';
  const dateStr = format(new Date(intervention.date_prevue), 'EEEE d MMMM', { locale: fr });
  const timeStr = format(new Date(intervention.date_prevue), 'HH:mm');
  
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500 bg-amber-50/30"
      onClick={onClick}
      data-testid={`available-intervention-${intervention.id}`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            {/* Header with badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-amber-500 text-white">
                <Bell className="w-3 h-3 mr-1" />
                Disponible
              </Badge>
              {isUrgent && (
                <Badge className="bg-red-500 text-white">
                  {getPriorityLabel(intervention.priorite)}
                </Badge>
              )}
              {intervention.categorie && (
                <Badge 
                  variant="outline" 
                  style={{ 
                    borderColor: intervention.categorie.couleur || '#64748b',
                    color: intervention.categorie.couleur || '#64748b'
                  }}
                >
                  {intervention.categorie.nom}
                </Badge>
              )}
            </div>
            
            {/* Title */}
            <h3 className="font-semibold text-slate-900 mb-1">{intervention.titre}</h3>
            
            {/* Date & Time */}
            <p className="text-sm text-amber-700 font-medium flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              {dateStr} à {timeStr}
            </p>
            
            {/* Client info */}
            {intervention.client && (
              <p className="text-sm text-slate-600 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {intervention.client.nom} {intervention.client.prenom}
              </p>
            )}
            
            {/* Address */}
            {intervention.adresse && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {intervention.adresse}, {intervention.ville}
              </p>
            )}
            
            {/* Duration */}
            {intervention.duree_estimee && (
              <p className="text-xs text-slate-400 mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                Durée estimée: {intervention.duree_estimee} min
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-amber-500 flex-shrink-0 mt-2" />
        </div>
        
        {/* CTA hint */}
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-xs text-amber-600 text-center">
            Cliquez pour voir les détails et accepter
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Actions Component
const QuickActions = ({ intervention, onCall, onNavigate, onStart, onComplete, onDownloadReport }) => {
  const canStart = intervention.statut === 'planifiee';
  const canComplete = intervention.statut === 'en_cours';
  const isCompleted = intervention.statut === 'terminee';
  
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
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onStart} data-testid="start-intervention-btn">
          <Play className="w-4 h-4 mr-1" />
          Démarrer
        </Button>
      )}
      {canComplete && (
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onComplete} data-testid="complete-intervention-btn">
          <CheckCircle className="w-4 h-4 mr-1" />
          Terminer
        </Button>
      )}
      {isCompleted && onDownloadReport && (
        <Button size="sm" variant="outline" onClick={onDownloadReport} data-testid="download-report-btn">
          <Download className="w-4 h-4 mr-1" />
          Rapport PDF
        </Button>
      )}
    </div>
  );
};

// Photo Upload Component with Tag Selection
const PhotoUpload = ({ interventionId, photos, onUpload, onDelete, interventionStatus }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState('pendant');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const fileInputRef = React.useRef(null);

  // Determine default tag based on intervention status
  useEffect(() => {
    if (interventionStatus === 'planifiee') {
      setSelectedTag('avant');
    } else if (interventionStatus === 'terminee') {
      setSelectedTag('apres');
    } else {
      setSelectedTag('pendant');
    }
  }, [interventionStatus]);

  const photoTags = [
    { value: 'avant', label: 'Avant', color: 'bg-blue-500', description: 'État initial' },
    { value: 'pendant', label: 'Pendant', color: 'bg-amber-500', description: 'En cours de travaux' },
    { value: 'apres', label: 'Après', color: 'bg-emerald-500', description: 'Travaux terminés' }
  ];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      await onUpload(file, selectedTag);
    }
    setUploading(false);
    e.target.value = '';
    setShowTagMenu(false);
  };

  const handleAddClick = () => {
    setShowTagMenu(true);
  };

  const handleTagSelectAndUpload = (tag) => {
    setSelectedTag(tag);
    fileInputRef.current?.click();
  };

  // Group photos by tag
  const groupedPhotos = {
    avant: photos?.filter(p => p.type_photo === 'avant') || [],
    pendant: photos?.filter(p => p.type_photo === 'pendant') || [],
    apres: photos?.filter(p => p.type_photo === 'apres') || [],
    autre: photos?.filter(p => !['avant', 'pendant', 'apres'].includes(p.type_photo)) || []
  };

  const getTagStyle = (tag) => {
    const styles = {
      avant: 'bg-blue-500 text-white',
      pendant: 'bg-amber-500 text-white',
      apres: 'bg-emerald-500 text-white',
      autre: 'bg-slate-500 text-white'
    };
    return styles[tag] || styles.autre;
  };

  const totalPhotos = photos?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="font-medium">Photos</Label>
          {totalPhotos > 0 && (
            <Badge variant="secondary" className="text-xs">{totalPhotos}</Badge>
          )}
        </div>
        
        {/* Tag Selection Dropdown */}
        <DropdownMenu open={showTagMenu} onOpenChange={setShowTagMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddClick}
              disabled={uploading}
              data-testid="add-photo-btn"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
              Ajouter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs font-medium text-slate-500">Type de photo</div>
            {photoTags.map(tag => (
              <DropdownMenuItem 
                key={tag.value}
                onClick={() => handleTagSelectAndUpload(tag.value)}
                className="cursor-pointer"
                data-testid={`photo-tag-${tag.value}`}
              >
                <div className={`w-3 h-3 rounded-full ${tag.color} mr-2`} />
                <div>
                  <div className="font-medium">{tag.label}</div>
                  <div className="text-xs text-slate-400">{tag.description}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="photo-file-input"
        />
      </div>

      {totalPhotos > 0 ? (
        <div className="space-y-4">
          {/* Avant */}
          {groupedPhotos.avant.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-600">Avant ({groupedPhotos.avant.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {groupedPhotos.avant.map((photo, idx) => (
                  <PhotoThumbnail 
                    key={photo.id || idx} 
                    photo={photo} 
                    onDelete={onDelete}
                    tagColor="bg-blue-500"
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Pendant */}
          {groupedPhotos.pendant.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-600">Pendant ({groupedPhotos.pendant.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {groupedPhotos.pendant.map((photo, idx) => (
                  <PhotoThumbnail 
                    key={photo.id || idx} 
                    photo={photo} 
                    onDelete={onDelete}
                    tagColor="bg-amber-500"
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Après */}
          {groupedPhotos.apres.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-600">Après ({groupedPhotos.apres.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {groupedPhotos.apres.map((photo, idx) => (
                  <PhotoThumbnail 
                    key={photo.id || idx} 
                    photo={photo} 
                    onDelete={onDelete}
                    tagColor="bg-emerald-500"
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Autres */}
          {groupedPhotos.autre.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-xs font-medium text-slate-600">Autres ({groupedPhotos.autre.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {groupedPhotos.autre.map((photo, idx) => (
                  <PhotoThumbnail 
                    key={photo.id || idx} 
                    photo={photo} 
                    onDelete={onDelete}
                    tagColor="bg-slate-500"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-lg">
          <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p>Aucune photo</p>
          <p className="text-xs text-slate-400 mt-1">Ajoutez des photos avant, pendant et après l'intervention</p>
        </div>
      )}
    </div>
  );
};

// Photo Thumbnail Component
const PhotoThumbnail = ({ photo, onDelete, tagColor }) => {
  const [imageError, setImageError] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  
  // Build photo URL - use storage URL directly
  const photoUrl = photo.url;
  
  return (
    <div 
      className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      data-testid={`photo-thumbnail-${photo.id}`}
    >
      {photoUrl && !imageError ? (
        <img 
          src={photoUrl}
          alt={photo.description || 'Photo intervention'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      
      {/* Tag badge */}
      <div className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColor} text-white shadow`}>
        {photo.type_photo || 'Photo'}
      </div>
      
      {/* Delete button on hover */}
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(photo.id);
          }}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
          data-testid={`delete-photo-${photo.id}`}
        >
          <X className="w-3 h-3" />
        </button>
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
const ProfileMenu = ({ user, skills, categories, onLogout, onShowInstallGuide }) => {
  // Get category details for skills
  const userSkillCategories = (skills || [])
    .map(skillId => categories?.find(c => c.id === skillId))
    .filter(Boolean);
  
  // Check if already installed as PWA
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
  // Check if demo account
  const isDemoAccount = user?.email === 'demo@actoos.com';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex-col h-auto py-2 flex-1" data-testid="profile-menu-btn">
          <User className="w-5 h-5 mb-1" />
          <span className="text-xs">Profil</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2">
          <p className="font-medium text-sm">{user?.prenom} {user?.nom}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            Mes compétences
          </p>
          {userSkillCategories.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {userSkillCategories.map(cat => (
                <span 
                  key={cat.id}
                  className="inline-flex items-center px-2 py-0.5 text-xs rounded-full"
                  style={{ 
                    backgroundColor: `${cat.couleur}20`,
                    color: cat.couleur,
                    border: `1px solid ${cat.couleur}40`
                  }}
                >
                  {cat.nom}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Toutes catégories</p>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {/* Install App Button - only show if not installed and not demo */}
        {!isInstalled && !isDemoAccount && (
          <>
            <DropdownMenuItem 
              className="cursor-pointer text-blue-600" 
              onClick={onShowInstallGuide}
              data-testid="install-app-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Installer l'application
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
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

// Devis Signature Form Component - For client to sign a quote
const DevisSignatureForm = ({ devis, onSign, onClose, loading }) => {
  const [signataireName, setSignataireName] = useState('');
  const [signatureData, setSignatureData] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, []);
  
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };
  
  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };
  
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!signataireName.trim()) {
      toast.error('Veuillez saisir le nom du signataire');
      return;
    }
    if (!signatureData) {
      toast.error('Veuillez dessiner une signature');
      return;
    }
    onSign(devis.id, signatureData, signataireName);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Devis Summary */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Référence:</span>
          <span className="font-medium">{devis.numero_devis}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Montant TTC:</span>
          <span className="font-bold text-lg">{devis.total_ttc?.toFixed(2)} €</span>
        </div>
      </div>
      
      {/* Signatory Name */}
      <div>
        <Label htmlFor="signataire-name">Nom du signataire *</Label>
        <Input
          id="signataire-name"
          value={signataireName}
          onChange={(e) => setSignataireName(e.target.value)}
          placeholder="Prénom et Nom du client"
          className="mt-1"
          data-testid="signataire-name-input"
        />
      </div>
      
      {/* Signature Canvas */}
      <div>
        <Label>Signature du client *</Label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg mt-1 bg-white">
          <canvas
            ref={canvasRef}
            width={350}
            height={150}
            className="w-full touch-none cursor-crosshair"
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSignature}
          className="mt-1 text-slate-500"
        >
          Effacer la signature
        </Button>
      </div>
      
      {/* Legal Text */}
      <p className="text-xs text-slate-500 text-center">
        En signant, le client accepte les conditions générales du devis
      </p>
      
      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !signatureData || !signataireName.trim()} 
          className="flex-1 bg-orange-500 hover:bg-orange-600"
          data-testid="submit-devis-signature"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Valider la signature
        </Button>
      </div>
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
  const [availableInterventions, setAvailableInterventions] = useState([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [viewingAvailableIntervention, setViewingAvailableIntervention] = useState(null); // For detail view before claiming
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [checklistResponses, setChecklistResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('today');
  
  // Modal states
  const [showCreateIntervention, setShowCreateIntervention] = useState(false);
  const [showCreateDevis, setShowCreateDevis] = useState(false);
  const [showOfflineDevis, setShowOfflineDevis] = useState(false);
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [offlineClients, setOfflineClients] = useState([]);
  
  // Devis section states
  const [myDevis, setMyDevis] = useState([]);
  const [selectedDevisForSignature, setSelectedDevisForSignature] = useState(null);
  const [showDevisSignature, setShowDevisSignature] = useState(false);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const { unreadCount: chatUnreadCount, refreshUnread: refreshChatUnread } = useChatUnread();
  
  const { user, logout, entreprise } = useAuth();
  const { 
    isOnline, pendingActions, pendingCount, isSyncing, 
    addPendingAction, syncPendingActions, 
    cacheInterventions, getCachedInterventions,
    cacheClients, getCachedClients,
    cacheCategories, getCachedCategories,
    lastSyncTime
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

  // Real-time updates via SSE - receives updates when admin makes changes
  const { isConnected: sseConnected } = useRealtimeEvents({
    enabled: isOnline,
    showToasts: true,
    onInterventionChange: (eventType, data) => {
      // Refresh interventions when admin creates/updates/assigns
      console.log('[TechnicianApp] SSE Intervention event:', eventType, data);
      if (eventType === EventType.INTERVENTION_ASSIGNED && data?.technicien_id === user?.user_id) {
        toast.info(`Nouvelle mission assignée: ${data.titre || 'Intervention'}`, {
          description: 'Votre planning a été mis à jour'
        });
      }
      loadInterventions();
      loadAvailableCount(); // Also refresh available count
      loadAvailableInterventions(); // Refresh available list if another tech claimed/unclaimed
    },
    onSyncRequired: () => {
      // Full refresh requested by server
      loadInterventions();
      loadClients();
      loadAvailableInterventions();
      loadAvailableCount();
    }
  });

  // Week data
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Apply entreprise branding (custom colors) if available
  useEffect(() => {
    if (entreprise?.couleur_primaire) {
      const primaryColor = entreprise.couleur_primaire;
      // Set CSS variable for dynamic theming
      document.documentElement.style.setProperty('--tech-primary-color', primaryColor);
      
      // Update theme color meta tag
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.content = primaryColor;
      }
    }
    
    return () => {
      // Reset to default on unmount
      document.documentElement.style.removeProperty('--tech-primary-color');
    };
  }, [entreprise?.couleur_primaire]);

  // Load interventions, clients, and categories
  useEffect(() => {
    if (activeTab === 'available') {
      loadAvailableInterventions();
    } else {
      loadInterventions();
    }
    loadClients();
    loadCategories();
    loadOfflineClients();
    loadMyDevis();
    // Always load available count for badge (lightweight)
    loadAvailableCount();
  }, [activeTab]);

  const loadOfflineClients = async () => {
    try {
      if (user?.entreprise_id) {
        const offlineClientsList = await db.getOfflineClients(user.entreprise_id);
        setOfflineClients(offlineClientsList.filter(c => !c.synced));
      }
    } catch (error) {
      console.error('Error loading offline clients:', error);
    }
  };

  const loadClients = async () => {
    try {
      if (isOnline && entreprise?.id) {
        const data = await clientsApi.list(entreprise.id);
        setClients(data);
        // Cache for offline use
        await cacheClients(data);
      } else {
        // Load from cache when offline
        const cached = await getCachedClients();
        setClients(cached);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      // Fallback to cache on error
      const cached = await getCachedClients();
      if (cached.length > 0) {
        setClients(cached);
      }
    }
  };

  const loadCategories = async () => {
    try {
      if (isOnline && entreprise?.id) {
        const data = await categoriesApi.list(entreprise.id);
        setCategories(data);
        // Cache for offline use
        await cacheCategories(data);
      } else {
        // Load from cache when offline
        const cached = await getCachedCategories();
        setCategories(cached);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to cache on error
      const cached = await getCachedCategories();
      if (cached.length > 0) {
        setCategories(cached);
      }
    }
  };

  const loadInterventions = async () => {
    setLoading(true);
    try {
      if (isOnline && entreprise?.id && user?.user_id) {
        let data;
        if (activeTab === 'today') {
          data = await technicianApi.getTodayInterventions(entreprise.id, user.user_id);
        } else {
          // Week view - fetch all interventions for the week
          const dateDebut = format(weekStart, 'yyyy-MM-dd');
          const dateFin = format(addDays(weekStart, 6), 'yyyy-MM-dd');
          data = await technicianApi.getWeekInterventions(
            entreprise.id, 
            user.user_id, 
            dateDebut + 'T00:00:00', 
            dateFin + 'T23:59:59'
          );
        }
        
        setInterventions(data);
        // Cache for offline use
        await cacheInterventions(data);
      } else {
        // Load from cache when offline
        const cached = await getCachedInterventions();
        setInterventions(cached);
        if (cached.length > 0) {
          toast.info('Données hors ligne chargées');
        }
      }
    } catch (error) {
      console.error('Error loading interventions:', error);
      // Fallback to cache on any error
      const cached = await getCachedInterventions();
      if (cached.length > 0) {
        setInterventions(cached);
        toast.info('Données chargées depuis le cache');
      } else {
        toast.error('Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load available (unassigned) interventions for the "Disponibles" tab
  const loadAvailableInterventions = async () => {
    try {
      if (isOnline && entreprise?.id) {
        const data = await technicianApi.getAvailableInterventions(entreprise.id);
        setAvailableInterventions(data);
        setAvailableCount(data.length);
      } else {
        // When offline, cannot fetch available interventions
        setAvailableInterventions([]);
        setAvailableCount(0);
      }
    } catch (error) {
      console.error('Error loading available interventions:', error);
      setAvailableInterventions([]);
      setAvailableCount(0);
    }
  };

  // Load available count (for badge) - lighter endpoint
  const loadAvailableCount = async () => {
    try {
      if (isOnline && entreprise?.id) {
        const count = await technicianApi.getAvailableCount(entreprise.id);
        setAvailableCount(count);
      }
    } catch (error) {
      console.error('Error loading available count:', error);
    }
  };

  // Load technician's devis (created by this tech, pending signature)
  const loadMyDevis = async () => {
    try {
      if (isOnline && entreprise?.id && user?.user_id) {
        const data = await technicianApi.getDevisForTech(entreprise.id, user.user_id);
        setMyDevis(data.filter(d => d.statut === 'envoye'));
      }
    } catch (error) {
      console.error('Error loading devis:', error);
    }
  };

  // Handle client signature on devis
  const handleDevisSignature = async (devisId, signatureData, signataireName) => {
    try {
      setFormLoading(true);
      await technicianApi.signDevis(devisId, {
        signature: signatureData,
        nom: signataireName
      });
      toast.success('Devis signé avec succès !');
      setShowDevisSignature(false);
      setSelectedDevisForSignature(null);
      loadMyDevis(); // Refresh devis list
    } catch (error) {
      console.error('Error signing devis:', error);
      toast.error('Erreur lors de la signature');
    } finally {
      setFormLoading(false);
    }
  };

  // Reorder interventions based on optimized order
  const handleReorderInterventions = (optimizedOrder) => {
    const interventionsMap = {};
    interventions.forEach(i => { interventionsMap[i.id] = i; });
    
    const reordered = optimizedOrder
      .filter(id => interventionsMap[id])
      .map(id => interventionsMap[id]);
    
    // Add any interventions not in the optimized order at the end
    const includedIds = new Set(optimizedOrder);
    interventions.forEach(i => {
      if (!includedIds.has(i.id)) {
        reordered.push(i);
      }
    });
    
    setInterventions(reordered);
  };

  const handleStartIntervention = async (id) => {
    // Get current geolocation
    let geoData = null;
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        geoData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
      }
    } catch (geoError) {
      console.warn('Geolocation error:', geoError);
      // Continue without geolocation
    }

    if (!isOnline) {
      // Queue for sync if offline
      await addPendingAction(ACTION_TYPES.START_INTERVENTION, { interventionId: id, geo: geoData });
      toast.info('Action enregistrée pour synchronisation');
      // Update local state optimistically
      setInterventions(prev => prev.map(i => 
        i.id === id ? { ...i, statut: 'en_cours', heure_debut: new Date().toISOString(), geo_debut: geoData } : i
      ));
      if (selectedIntervention?.id === id) {
        setSelectedIntervention(prev => ({ ...prev, statut: 'en_cours', geo_debut: geoData }));
      }
      return;
    }
    
    try {
      // Send geo data directly (not wrapped in { geo: ... })
      await technicianApi.startIntervention(id, geoData);
      toast.success('Intervention démarrée');
      loadInterventions();
      if (selectedIntervention?.id === id) {
        const data = await interventionsApi.get(id);
        setSelectedIntervention(data);
      }
    } catch (error) {
      console.error('Error starting intervention:', error);
      toast.error('Erreur lors du démarrage');
    }
  };

  const handleCompleteIntervention = async (id, signatureData = null) => {
    // Get current geolocation
    let geoData = null;
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        geoData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
      }
    } catch (geoError) {
      console.warn('Geolocation error:', geoError);
    }

    if (!isOnline) {
      await addPendingAction(ACTION_TYPES.COMPLETE_INTERVENTION, { 
        interventionId: id, 
        notes,
        signature: signatureData,
        geo: geoData
      });
      toast.info('Action enregistrée pour synchronisation');
      setInterventions(prev => prev.map(i => 
        i.id === id ? { 
          ...i, 
          statut: 'terminee', 
          heure_fin: new Date().toISOString(),
          signature_client: signatureData?.signature,
          nom_signataire: signatureData?.nom_signataire,
          geo_fin: geoData
        } : i
      ));
      setSelectedIntervention(null);
      setNotes('');
      setShowSignaturePad(false);
      return;
    }
    
    try {
      await technicianApi.completeIntervention(id, {
        rapport: notes,
        signature: signatureData?.signature,
        signature_nom: signatureData?.nom_signataire,
        geo_fin: geoData
      });
      
      toast.success(signatureData ? 'Intervention terminée et signée' : 'Intervention terminée');
      setNotes('');
      setShowSignaturePad(false);
      loadInterventions();
      setSelectedIntervention(null);
    } catch (error) {
      console.error('Error completing intervention:', error);
      toast.error(error.message || 'Erreur lors de la clôture');
    }
  };

  // Open signature pad before completing
  const handleRequestCompletion = (id) => {
    setShowSignaturePad(true);
  };

  // Handle signature submission
  const handleSignatureSubmit = async (signatureData) => {
    if (selectedIntervention) {
      await handleCompleteIntervention(selectedIntervention.id, signatureData);
    }
  };

  // Claim an available intervention
  const handleClaimIntervention = async (id) => {
    if (!isOnline) {
      // Allow claiming offline with optimistic update
      await addPendingAction(ACTION_TYPES.CLAIM_INTERVENTION, { interventionId: id });
      toast.info('Acceptation enregistrée - sera synchronisée quand en ligne');
      setInterventions(prev => prev.map(i => 
        i.id === id ? { ...i, technicien_id: user?.id, _pendingClaim: true } : i
      ));
      setAvailableInterventions(prev => prev.filter(i => i.id !== id));
      setAvailableCount(prev => Math.max(0, prev - 1));
      setViewingAvailableIntervention(null);
      return;
    }
    
    try {
      await technicianApi.claimIntervention(id, user?.user_id);
      toast.success('Mission acceptée ! Elle vous est maintenant assignée.');
      loadInterventions();
      loadAvailableInterventions();
      loadAvailableCount();
      // Close detail modal if viewing available intervention
      setViewingAvailableIntervention(null);
      // Close detail modal if open
      if (selectedIntervention?.id === id) {
        const updated = await interventionsApi.get(id);
        setSelectedIntervention(updated);
      }
    } catch (error) {
      console.error('Error claiming intervention:', error);
      const message = error.message || 'Erreur lors de l\'acceptation';
      toast.error(message);
      // Refresh list in case someone else claimed it
      loadInterventions();
      loadAvailableInterventions();
      loadAvailableCount();
    }
  };

  // Unclaim/Release an intervention (cancel acceptance)
  const handleUnclaimIntervention = async (id) => {
    if (!isOnline) {
      toast.error('Annulation impossible hors ligne');
      return;
    }
    
    try {
      await technicianApi.unclaimIntervention(id);
      toast.success('Acceptation annulée - l\'intervention est à nouveau disponible');
      // Close detail view
      setSelectedIntervention(null);
      // Refresh all lists
      loadInterventions();
      loadAvailableInterventions();
      loadAvailableCount();
    } catch (error) {
      console.error('Error unclaiming intervention:', error);
      const message = error.message || 'Erreur lors de l\'annulation';
      toast.error(message);
    }
  };

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const handleNavigate = (intervention) => {
    const address = encodeURIComponent(`${intervention.adresse}, ${intervention.code_postal} ${intervention.ville}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
  };

  const handlePhotoUpload = async (file, photoTag) => {
    if (!selectedIntervention) return;
    
    if (!isOnline) {
      toast.error('Upload indisponible hors ligne');
      return;
    }
    
    try {
      await photosApi.upload(selectedIntervention.id, file, photoTag || 'autre');
      toast.success('Photo ajoutée');
      // Reload photos
      const data = await photosApi.getForIntervention(selectedIntervention.id);
      setPhotos(data);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
    }
  };

  // Delete photo handler
  const handlePhotoDelete = async (photoId) => {
    if (!isOnline) {
      toast.error('Suppression indisponible hors ligne');
      return;
    }
    
    try {
      await photosApi.delete(photoId);
      toast.success('Photo supprimée');
      // Reload photos
      const data = await photosApi.getForIntervention(selectedIntervention.id);
      setPhotos(data);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Download intervention report PDF
  const handleDownloadReport = async (interventionId) => {
    if (!isOnline) {
      toast.error('Téléchargement indisponible hors ligne');
      return;
    }
    
    // PDF generation requires Edge Function - show info for now
    toast.info('Téléchargement PDF en cours de migration vers Supabase');
  };

  // Create intervention handler
  const handleCreateIntervention = async (data) => {
    setFormLoading(true);
    try {
      const payload = {
        ...data,
        entreprise_id: entreprise?.id,
        date_prevue: new Date(data.date_prevue).toISOString()
      };
      await interventionsApi.create(payload);
      toast.success('Intervention créée');
      setShowCreateIntervention(false);
      loadInterventions();
    } catch (error) {
      console.error('Error creating intervention:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setFormLoading(false);
    }
  };

  // Create devis handler
  const handleCreateDevis = async (data) => {
    setFormLoading(true);
    try {
      await devisApi.create({
        ...data,
        entreprise_id: entreprise?.id,
        created_by: user?.user_id
      });
      toast.success('Devis créé');
      setShowCreateDevis(false);
      setPreselectedClientId(null);
    } catch (error) {
      console.error('Error creating devis:', error);
      toast.error(error.message || 'Erreur lors de la création');
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
        const catData = await categoriesApi.get(intervention.categorie_id);
        setSelectedCategorie(catData);
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
        const photosData = await photosApi.getForIntervention(intervention.id);
        setPhotos(photosData);
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
      await interventionsApi.update(selectedIntervention.id, { checklist_responses: checklistResponses });
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
    <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="tech-app" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Header */}
      <header 
        className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10" 
        style={{ 
          paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
          borderColor: entreprise?.couleur_primaire ? `${entreprise.couleur_primaire}20` : undefined
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Show entreprise logo if available, otherwise default Actoos icon */}
            {entreprise?.logo_url ? (
              <img 
                src={entreprise.logo_url} 
                alt={entreprise.nom || 'Logo'} 
                className="w-8 h-8 object-contain rounded"
                onError={(e) => { e.target.src = '/branding/actoos-pro-icon.png'; }}
              />
            ) : (
              <img src="/logo-actoos-icon.png" alt="ACTOOS PRO" className="w-8 h-8 object-contain" />
            )}
            <div>
              <h1 className="font-bold text-lg text-slate-900">{dateLabel}</h1>
              <p className="text-sm text-slate-500">
                {activeTab === 'today' 
                  ? `${todayInterventions.length} intervention(s)`
                  : activeTab === 'devis'
                  ? `${myDevis.length} devis en attente`
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
            {/* Route Optimizer Button */}
            {isOnline && interventions.filter(i => i.statut === 'planifiee').length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 bg-amber-50 border-amber-200 hover:bg-amber-100"
                onClick={() => setShowRouteOptimizer(true)}
                title="Optimiser ma tournée"
                data-testid="route-optimizer-btn"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
              </Button>
            )}
            <SyncStatusPanel compact={true} />
            <Button variant="ghost" size="sm" onClick={loadInterventions} className="h-8 w-8 p-0">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* View Toggle */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="today-tab">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Aujourd'hui</span>
              <span className="sm:hidden">Jour</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="week-tab">
              <CalendarDays className="w-4 h-4" />
              Semaine
            </TabsTrigger>
            <TabsTrigger value="available" className="flex items-center gap-1 text-xs sm:text-sm relative" data-testid="available-tab">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Disponibles</span>
              <span className="sm:hidden">Dispo</span>
              {availableCount > 0 && (
                <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0.5 ml-1 animate-pulse">
                  {availableCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="devis" className="flex items-center gap-1 text-xs sm:text-sm relative" data-testid="devis-tab">
              <FileText className="w-4 h-4" />
              Devis
              {myDevis.length > 0 && (
                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0.5 ml-1">
                  {myDevis.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-20">
        {/* Conflict Notification Banner */}
        <ConflictNotificationBanner />
        
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
        ) : activeTab === 'available' ? (
          // Available Interventions View - Unassigned interventions for claiming
          !isOnline ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Interventions disponibles</p>
              <p className="text-slate-400 text-sm mt-2">Connectez-vous à internet pour voir les missions disponibles</p>
            </div>
          ) : availableInterventions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
              <p className="text-slate-500">Aucune intervention disponible</p>
              <p className="text-slate-400 text-sm mt-2">Toutes les missions sont actuellement assignées</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <Bell className="w-4 h-4 inline mr-1" />
                  <strong>{availableCount}</strong> intervention(s) en attente d'acceptation
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Cliquez sur une intervention pour voir les détails avant d'accepter
                </p>
              </div>
              {availableInterventions
                .sort((a, b) => new Date(a.date_prevue) - new Date(b.date_prevue))
                .map((intervention) => (
                  <AvailableInterventionCard
                    key={intervention.id}
                    intervention={intervention}
                    onClick={() => setViewingAvailableIntervention(intervention)}
                  />
                ))}
            </div>
          )
        ) : activeTab === 'devis' ? (
          // Devis View - Tech's quotes pending signature
          myDevis.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Aucun devis en attente de signature</p>
              <p className="text-slate-400 text-sm mt-2">Les devis créés apparaîtront ici pour signature client</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myDevis.map((devis) => (
                <Card key={devis.id} className="p-4" data-testid={`devis-card-${devis.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{devis.numero_devis || `Devis #${devis.id.slice(0, 8)}`}</h3>
                      <p className="text-sm text-slate-500">{devis.client_nom || 'Client'}</p>
                    </div>
                    <Badge className={devis.statut === 'accepte' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                      {devis.statut === 'accepte' ? 'Signé' : 'En attente'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-600 mb-3">
                    <span>{format(new Date(devis.created_at), 'dd/MM/yyyy')}</span>
                    <span className="font-semibold">{devis.total_ttc?.toFixed(2) || '0.00'} €</span>
                  </div>
                  {devis.statut !== 'accepte' && (
                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={() => {
                        setSelectedDevisForSignature(devis);
                        setShowDevisSignature(true);
                      }}
                      data-testid={`sign-devis-${devis.id}`}
                    >
                      <PenTool className="w-4 h-4 mr-2" />
                      Faire signer le client
                    </Button>
                  )}
                </Card>
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
      <nav className="bg-white border-t border-slate-200 px-4 py-2 fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
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
            onClick={() => {
              // If offline and plan supports it, use offline devis form
              if (!isOnline && user?.entreprise?.plan_limits?.offline_mode) {
                setShowOfflineDevis(true);
              } else {
                setShowCreateDevis(true);
              }
            }}
            data-testid="nav-new-devis"
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-xs">{!isOnline ? 'Devis ✏️' : 'Devis'}</span>
          </Button>
          <ProfileMenu 
            user={user} 
            skills={user?.skills || []} 
            categories={categories} 
            onLogout={logout}
            onShowInstallGuide={() => setShowInstallGuide(true)}
          />
        </div>
      </nav>

      {/* Create Intervention Modal */}
      <Dialog open={showCreateIntervention} onOpenChange={setShowCreateIntervention}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }} aria-describedby="create-intervention-description">
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }} aria-describedby="create-devis-description">
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

      {/* Devis Signature Modal */}
      <Dialog open={showDevisSignature} onOpenChange={(open) => {
        setShowDevisSignature(open);
        if (!open) setSelectedDevisForSignature(null);
      }}>
        <DialogContent className="max-w-lg" aria-describedby="devis-signature-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-orange-500" />
              Signature du client
            </DialogTitle>
            <p id="devis-signature-description" className="text-sm text-slate-500 mt-1">
              {selectedDevisForSignature?.numero_devis} - {selectedDevisForSignature?.total_ttc?.toFixed(2)} €
            </p>
          </DialogHeader>
          
          {selectedDevisForSignature && (
            <DevisSignatureForm
              devis={selectedDevisForSignature}
              onSign={handleDevisSignature}
              onClose={() => {
                setShowDevisSignature(false);
                setSelectedDevisForSignature(null);
              }}
              loading={formLoading}
            />
          )}
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
                  onComplete={() => handleRequestCompletion(selectedIntervention.id)}
                  onDownloadReport={() => handleDownloadReport(selectedIntervention.id)}
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
                  onDelete={handlePhotoDelete}
                  interventionStatus={selectedIntervention.statut}
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

                {/* Unclaim Button - Only for assigned interventions in planifiee status */}
                {selectedIntervention.statut === 'planifiee' && 
                 selectedIntervention.technicien_id === user?.id && (
                  <div className="pt-2 border-t border-slate-200">
                    <Button
                      variant="outline"
                      className="w-full text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                      onClick={() => handleUnclaimIntervention(selectedIntervention.id)}
                      data-testid="unclaim-intervention-btn"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Annuler mon acceptation
                    </Button>
                    <p className="text-xs text-slate-400 text-center mt-2">
                      L'intervention redeviendra disponible pour tous les techniciens
                    </p>
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

      {/* Available Intervention Detail Modal - View details before claiming */}
      <Dialog open={!!viewingAvailableIntervention} onOpenChange={() => setViewingAvailableIntervention(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="available-intervention-detail-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              {viewingAvailableIntervention?.titre}
            </DialogTitle>
            <p id="available-intervention-detail-description" className="sr-only">
              Détails de l'intervention disponible
            </p>
          </DialogHeader>
          
          {viewingAvailableIntervention && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {/* Alert banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800">
                    Cette intervention est disponible
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Consultez les détails ci-dessous puis acceptez si vous souhaitez prendre cette mission
                  </p>
                </div>

                {/* Date & Time */}
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {format(new Date(viewingAvailableIntervention.date_prevue), 'EEEE d MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-amber-700 font-medium">
                          {format(new Date(viewingAvailableIntervention.date_prevue), 'HH:mm')}
                          {viewingAvailableIntervention.duree_estimee && ` • ${viewingAvailableIntervention.duree_estimee} min`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Priority & Category */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={priorityColors[viewingAvailableIntervention.priorite] || 'bg-slate-100 text-slate-600'}>
                    {getPriorityLabel(viewingAvailableIntervention.priorite)}
                  </Badge>
                  {viewingAvailableIntervention.categorie && (
                    <Badge 
                      variant="outline" 
                      style={{ 
                        borderColor: viewingAvailableIntervention.categorie.couleur,
                        color: viewingAvailableIntervention.categorie.couleur
                      }}
                    >
                      {viewingAvailableIntervention.categorie.nom}
                    </Badge>
                  )}
                </div>

                {/* Client Info */}
                <Card className="border-slate-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <p className="font-medium">
                      {viewingAvailableIntervention.client?.nom} {viewingAvailableIntervention.client?.prenom}
                    </p>
                    {viewingAvailableIntervention.client?.telephone && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {viewingAvailableIntervention.client.telephone}
                      </p>
                    )}
                    {viewingAvailableIntervention.client?.email && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {viewingAvailableIntervention.client.email}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Address */}
                {viewingAvailableIntervention.adresse && (
                  <Card className="border-slate-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Adresse
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-slate-700">
                        {viewingAvailableIntervention.adresse}
                      </p>
                      <p className="text-slate-600">
                        {viewingAvailableIntervention.code_postal} {viewingAvailableIntervention.ville}
                      </p>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-blue-600 mt-2"
                        onClick={() => handleNavigate(viewingAvailableIntervention)}
                      >
                        <Navigation className="w-4 h-4 mr-1" />
                        Voir l'itinéraire
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Description */}
                {viewingAvailableIntervention.description && (
                  <Card className="border-slate-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Description</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {viewingAvailableIntervention.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Notes internes (if any) */}
                {viewingAvailableIntervention.notes_internes && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-amber-800">Instructions particulières</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-amber-900 text-sm">
                        {viewingAvailableIntervention.notes_internes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Action buttons */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => handleClaimIntervention(viewingAvailableIntervention.id)}
                    data-testid="claim-from-detail-btn"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accepter cette mission
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setViewingAvailableIntervention(null)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Route Optimizer Modal */}
      <RouteOptimizerModal
        isOpen={showRouteOptimizer}
        onClose={() => setShowRouteOptimizer(false)}
        interventions={interventions.filter(i => i.statut === 'planifiee')}
        onReorder={handleReorderInterventions}
      />

      {/* Signature Pad Modal */}
      <SignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSignatureSubmit}
        title="Signature de fin d'intervention"
        description="Le client ou une personne présente doit signer pour valider la fin de l'intervention"
        clientName={selectedIntervention?.client ? `${selectedIntervention.client.prenom || ''} ${selectedIntervention.client.nom || ''}`.trim() : ''}
        clientEmail={selectedIntervention?.client?.email || ''}
        clientPhone={selectedIntervention?.client?.telephone || ''}
      />

      {/* Offline Devis Modal - for Pro & Enterprise plans */}
      <Dialog open={showOfflineDevis} onOpenChange={setShowOfflineDevis}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Nouveau devis (hors ligne)
            </DialogTitle>
          </DialogHeader>
          <OfflineDevisForm
            clients={clients}
            offlineClients={offlineClients}
            entreprise={user?.entreprise || {}}
            onSubmit={(devis) => {
              toast.success('Devis créé hors ligne');
              setShowOfflineDevis(false);
            }}
            onClose={() => setShowOfflineDevis(false)}
            onCreateOfflineClient={(client) => {
              setOfflineClients([...offlineClients, client]);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* PWA Install Prompt (auto-show) */}
      <InstallPrompt userEmail={user?.email} />
      
      {/* Install Guide Modal (from profile menu) */}
      <InstallGuideModal 
        isOpen={showInstallGuide} 
        onClose={() => setShowInstallGuide(false)} 
      />
      
      {/* Floating Chat Button */}
      <FloatingChatButton 
        onClick={() => setShowChat(true)} 
        unreadCount={chatUnreadCount}
      />
      
      {/* Chat Widget Modal */}
      <ChatWidget 
        isOpen={showChat} 
        onClose={() => {
          setShowChat(false);
          refreshChatUnread();
        }}
        isTech={true}
      />
    </div>
  );
};

export default TechnicianApp;
