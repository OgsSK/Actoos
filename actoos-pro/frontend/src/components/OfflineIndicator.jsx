/**
 * Offline Indicator Component
 * Shows connection status and pending sync actions
 */
import React, { useState } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Clock,
  Upload,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const OfflineIndicator = ({ className }) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    dbStats,
    syncPendingActions,
    syncInterventionsLWW,
    clearOfflineData
  } = useOffline();
  
  const [showDetails, setShowDetails] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;
    
    toast.loading('Synchronisation en cours...');
    
    try {
      await syncPendingActions();
      await syncInterventionsLWW();
      toast.dismiss();
      toast.success('Synchronisation terminée');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur de synchronisation');
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearOfflineData();
      setShowDetails(false);
    } finally {
      setIsClearing(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return 'Jamais';
    const date = new Date(time);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (time) => {
    if (!time) return '';
    const date = new Date(time);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Compact indicator for header/sidebar
  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
          isOnline 
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
            : "bg-amber-50 text-amber-700 hover:bg-amber-100",
          className
        )}
        data-testid="offline-indicator"
      >
        {isOnline ? (
          <>
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">En ligne</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="hidden sm:inline">Hors ligne</span>
          </>
        )}
        
        {pendingCount > 0 && (
          <Badge 
            variant="secondary" 
            className={cn(
              "ml-1 px-1.5 py-0 text-xs font-bold",
              isOnline ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-800"
            )}
          >
            {pendingCount}
          </Badge>
        )}
      </button>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Cloud className="w-5 h-5 text-emerald-500" />
                  Connecté
                </>
              ) : (
                <>
                  <CloudOff className="w-5 h-5 text-amber-500" />
                  Mode hors ligne
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isOnline 
                ? "Vos données sont synchronisées avec le serveur" 
                : "Vos modifications seront synchronisées dès que la connexion sera rétablie"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Upload className="w-4 h-4" />
                  <span className="text-xs font-medium">Actions en attente</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Dernière sync</span>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {formatTime(lastSyncTime)}
                </p>
                <p className="text-xs text-slate-500">{formatDate(lastSyncTime)}</p>
              </div>
            </div>

            {/* Cached Data Stats */}
            {dbStats && (
              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Données en cache
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{dbStats.interventions || 0}</p>
                    <p className="text-xs text-slate-500">Interventions</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{dbStats.clients || 0}</p>
                    <p className="text-xs text-slate-500">Clients</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{dbStats.photos || 0}</p>
                    <p className="text-xs text-slate-500">Photos</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sync Status */}
            {isSyncing && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Synchronisation en cours...</p>
                  <p className="text-xs text-blue-700">Ne fermez pas l'application</p>
                </div>
              </div>
            )}

            {/* Pending Actions Warning */}
            {pendingCount > 0 && !isOnline && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {pendingCount} action(s) en attente
                  </p>
                  <p className="text-xs text-amber-700">
                    Sera synchronisé automatiquement dès que vous serez en ligne
                  </p>
                </div>
              </div>
            )}

            {/* All Synced */}
            {pendingCount === 0 && isOnline && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">Tout est synchronisé</p>
                  <p className="text-xs text-emerald-700">Vos données sont à jour</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearData}
              disabled={isClearing}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Effacer le cache
            </Button>
            
            <Button
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              size="sm"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Synchroniser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OfflineIndicator;
