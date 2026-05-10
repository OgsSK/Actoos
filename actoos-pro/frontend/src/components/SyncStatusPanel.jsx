import React, { useState, useEffect } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from './ui/dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  Wifi, WifiOff, RefreshCw, Clock, CheckCircle, XCircle, 
  AlertTriangle, History, Info, Trash2, Database, ArrowUpDown,
  CloudOff, Cloud, Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * SyncStatusPanel - Displays offline sync status and history
 * Implements transparency for LWW (Last-Write-Wins) conflict resolution
 */
const SyncStatusPanel = ({ compact = false }) => {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingCount,
    syncPendingActions,
    getSyncHistory,
    getSyncStats,
    clearOfflineData,
    dbStats
  } = useOffline();

  const [syncHistory, setSyncHistory] = useState([]);
  const [syncStats, setSyncStats] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  // Load sync history and stats when dialog opens
  useEffect(() => {
    if (showDialog) {
      loadSyncData();
    }
  }, [showDialog]);

  const loadSyncData = async () => {
    setLoading(true);
    try {
      const [history, stats] = await Promise.all([
        getSyncHistory({ limit: 50 }),
        getSyncStats()
      ]);
      setSyncHistory(history);
      setSyncStats(stats);
    } catch (error) {
      console.error('Failed to load sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    await syncPendingActions();
    await loadSyncData();
  };

  const handleClearData = async () => {
    if (window.confirm('Voulez-vous vraiment effacer toutes les données hors ligne ? Cette action est irréversible.')) {
      await clearOfflineData();
      await loadSyncData();
    }
  };

  // Compact view (for header/sidebar)
  if (compact) {
    return (
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            data-testid="sync-status-btn"
          >
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-orange-500" />
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {pendingCount}
              </Badge>
            )}
            {isSyncing && <Loader2 className="w-3 h-3 animate-spin" />}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              État de la synchronisation
            </DialogTitle>
            <DialogDescription>
              Gérez le mode hors ligne et consultez l'historique de synchronisation
            </DialogDescription>
          </DialogHeader>
          <SyncPanelContent 
            {...{ isOnline, isSyncing, lastSyncTime, pendingCount, syncHistory, syncStats, 
                  loading, activeTab, setActiveTab, handleForceSync, handleClearData, dbStats }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Full panel view
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          Synchronisation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SyncPanelContent 
          {...{ isOnline, isSyncing, lastSyncTime, pendingCount, syncHistory, syncStats, 
                loading, activeTab, setActiveTab, handleForceSync, handleClearData, dbStats }}
        />
      </CardContent>
    </Card>
  );
};

// Inner content component
const SyncPanelContent = ({
  isOnline, isSyncing, lastSyncTime, pendingCount, syncHistory, syncStats,
  loading, activeTab, setActiveTab, handleForceSync, handleClearData, dbStats
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="status" className="text-sm">
          <Cloud className="w-3 h-3 mr-1" />
          État
        </TabsTrigger>
        <TabsTrigger value="history" className="text-sm">
          <History className="w-3 h-3 mr-1" />
          Historique
        </TabsTrigger>
        <TabsTrigger value="help" className="text-sm">
          <Info className="w-3 h-3 mr-1" />
          Aide
        </TabsTrigger>
      </TabsList>

      {/* Status Tab */}
      <TabsContent value="status" className="space-y-4 mt-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">En ligne</p>
                  <p className="text-xs text-slate-500">Connecté au serveur</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Hors ligne</p>
                  <p className="text-xs text-slate-500">Mode déconnecté actif</p>
                </div>
              </>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceSync}
            disabled={!isOnline || isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Pending Actions */}
        {pendingCount > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Actions en attente</AlertTitle>
            <AlertDescription className="text-amber-700">
              {pendingCount} action(s) en attente de synchronisation.
              {!isOnline && " Elles seront envoyées dès que vous serez reconnecté."}
            </AlertDescription>
          </Alert>
        )}

        {/* Last Sync */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">Dernière sync</span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {lastSyncTime 
                ? formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true, locale: fr })
                : 'Jamais'
              }
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Database className="w-3 h-3" />
              <span className="text-xs">Cache local</span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {dbStats?.interventions || 0} interventions
            </p>
          </div>
        </div>

        {/* Sync Stats */}
        {syncStats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-green-50">
              <p className="text-lg font-bold text-green-700">{syncStats.successful}</p>
              <p className="text-xs text-green-600">Réussies</p>
            </div>
            <div className="p-2 rounded bg-red-50">
              <p className="text-lg font-bold text-red-700">{syncStats.failed}</p>
              <p className="text-xs text-red-600">Échouées</p>
            </div>
            <div className="p-2 rounded bg-amber-50">
              <p className="text-lg font-bold text-amber-700">{syncStats.conflicts}</p>
              <p className="text-xs text-amber-600">Conflits</p>
            </div>
          </div>
        )}

        {/* Clear Data */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleClearData}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Effacer les données hors ligne
        </Button>
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history" className="mt-4">
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : syncHistory.length > 0 ? (
            <div className="space-y-2">
              {syncHistory.map((event, idx) => (
                <SyncHistoryItem key={idx} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Aucun historique de synchronisation</p>
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      {/* Help Tab */}
      <TabsContent value="help" className="mt-4 space-y-4">
        <div className="space-y-3 text-sm text-slate-600">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
              <CloudOff className="w-4 h-4" />
              Mode hors ligne
            </h4>
            <p className="text-blue-700 text-xs">
              L'application fonctionne même sans connexion internet. Vos actions sont 
              enregistrées localement et seront synchronisées automatiquement dès que 
              vous serez reconnecté.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2">
              <ArrowUpDown className="w-4 h-4" />
              Résolution des conflits (LWW)
            </h4>
            <p className="text-amber-700 text-xs">
              Si plusieurs personnes modifient la même intervention, le système applique 
              la règle <strong>Last-Write-Wins</strong> : la modification la plus récente 
              est conservée. L'historique montre tous les conflits résolus.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-green-50 border border-green-100">
            <h4 className="font-medium text-green-800 flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" />
              Bonnes pratiques
            </h4>
            <ul className="text-green-700 text-xs space-y-1 list-disc list-inside">
              <li>Synchronisez régulièrement quand vous avez du réseau</li>
              <li>Vérifiez les actions en attente avant de fermer l'app</li>
              <li>En cas de conflit, vérifiez l'historique pour voir les changements</li>
            </ul>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

// Individual sync history item
const SyncHistoryItem = ({ event }) => {
  const getIcon = () => {
    if (event.conflictResolved) {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    switch (event.result) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      'start_intervention': 'Démarrage',
      'complete_intervention': 'Terminaison',
      'update_notes': 'Mise à jour notes',
      'update_checklist': 'Mise à jour checklist',
      'claim_intervention': 'Attribution',
      'upload_photo': 'Upload photo'
    };
    return labels[action] || action;
  };

  return (
    <div className={`p-2 rounded border ${
      event.conflictResolved 
        ? 'border-amber-200 bg-amber-50' 
        : event.result === 'error' 
          ? 'border-red-200 bg-red-50'
          : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">
              {getActionLabel(event.action)}
            </span>
            <span className="text-xs text-slate-500">
              {format(new Date(event.timestamp), 'HH:mm', { locale: fr })}
            </span>
          </div>
          {event.details && (
            <p className="text-xs text-slate-600 truncate mt-0.5">
              {event.details}
            </p>
          )}
          {event.conflictResolved && (
            <Badge variant="secondary" className="mt-1 text-xs bg-amber-100 text-amber-700">
              Conflit LWW résolu
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncStatusPanel;
