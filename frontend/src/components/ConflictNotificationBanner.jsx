import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { AlertTriangle, X, Clock, ArrowUpDown, Check, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * ConflictNotificationBanner - Shows a dismissible banner when LWW conflicts were resolved
 * Displays recent conflicts and helps technicians understand what happened
 */
const ConflictNotificationBanner = ({ onViewDetails }) => {
  const [conflicts, setConflicts] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadConflicts();
    
    // Listen for new conflicts
    const handleStorageChange = (e) => {
      if (e.key === 'lww_conflicts') {
        loadConflicts();
        setDismissed(false); // Show banner again on new conflicts
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab updates)
    const interval = setInterval(loadConflicts, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadConflicts = () => {
    try {
      const stored = localStorage.getItem('lww_conflicts');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only show conflicts from the last hour as "recent"
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentConflicts = parsed.filter(c => new Date(c.resolvedAt) > oneHourAgo);
        setConflicts(recentConflicts);
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
    }
  };

  const dismissBanner = () => {
    setDismissed(true);
  };

  const clearAllConflicts = () => {
    localStorage.removeItem('lww_conflicts');
    setConflicts([]);
    setShowDetails(false);
  };

  const markAsRead = (interventionId) => {
    const stored = JSON.parse(localStorage.getItem('lww_conflicts') || '[]');
    const updated = stored.filter(c => c.interventionId !== interventionId);
    localStorage.setItem('lww_conflicts', JSON.stringify(updated));
    loadConflicts();
  };

  // Don't show if no recent conflicts or dismissed
  if (conflicts.length === 0 || dismissed) {
    return null;
  }

  return (
    <>
      <Alert className="border-amber-300 bg-amber-50 mb-4 relative" data-testid="conflict-banner">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 pr-8">
          {conflicts.length === 1 
            ? 'Une modification a été écrasée'
            : `${conflicts.length} modifications ont été écrasées`
          }
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          <p className="text-sm mb-2">
            Des modifications que vous avez faites hors ligne ont été remplacées par des versions 
            plus récentes du serveur.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber-400 text-amber-700 hover:bg-amber-100"
              onClick={() => setShowDetails(true)}
            >
              <Info className="w-3 h-3 mr-1" />
              Voir les détails
            </Button>
          </div>
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
          onClick={dismissBanner}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-amber-500" />
              Conflits de synchronisation
            </DialogTitle>
            <DialogDescription>
              Ces modifications ont été remplacées par des versions plus récentes
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {conflicts.map((conflict, idx) => (
                <ConflictItem 
                  key={idx} 
                  conflict={conflict} 
                  onMarkRead={() => markAsRead(conflict.interventionId)}
                />
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-500"
              onClick={clearAllConflicts}
            >
              Tout effacer
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setShowDetails(false)}
            >
              Compris
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Individual conflict item in the details dialog
 */
const ConflictItem = ({ conflict, onMarkRead }) => {
  return (
    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-900">
              Intervention modifiée
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            {conflict.message || 'Vos modifications ont été remplacées par la version du serveur'}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(conflict.resolvedAt), { addSuffix: true, locale: fr })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={onMarkRead}
          title="Marquer comme lu"
        >
          <Check className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

/**
 * Badge indicator for interventions that had conflicts
 * Use this next to intervention titles
 */
export const ConflictBadge = ({ interventionId }) => {
  const [hasConflict, setHasConflict] = useState(false);

  useEffect(() => {
    checkConflict();
  }, [interventionId]);

  const checkConflict = () => {
    try {
      const stored = localStorage.getItem('lww_conflicts');
      if (stored) {
        const conflicts = JSON.parse(stored);
        const hasRecentConflict = conflicts.some(c => 
          c.interventionId === interventionId &&
          new Date(c.resolvedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
        );
        setHasConflict(hasRecentConflict);
      }
    } catch (error) {
      console.error('Error checking conflict:', error);
    }
  };

  if (!hasConflict) return null;

  return (
    <Badge 
      variant="secondary" 
      className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1"
      title="Cette intervention a eu un conflit de synchronisation récemment"
    >
      <ArrowUpDown className="w-3 h-3" />
      Sync
    </Badge>
  );
};

export default ConflictNotificationBanner;
