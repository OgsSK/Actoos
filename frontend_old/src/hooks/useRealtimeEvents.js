/**
 * useRealtimeEvents hook - Subscribe to real-time events via Server-Sent Events (SSE)
 * 
 * NOTE: SSE endpoints have been migrated. This hook now uses Supabase Realtime instead.
 * The legacy Railway SSE endpoint (/api/events/stream) is no longer available.
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Event types (kept for compatibility)
export const EventType = {
  INTERVENTION_CREATED: 'intervention_created',
  INTERVENTION_UPDATED: 'intervention_updated',
  INTERVENTION_STARTED: 'intervention_started',
  INTERVENTION_COMPLETED: 'intervention_completed',
  INTERVENTION_ASSIGNED: 'intervention_assigned',
  INTERVENTION_CLAIMED: 'intervention_claimed',
  DEVIS_CREATED: 'devis_created',
  DEVIS_SIGNED: 'devis_signed',
  FACTURE_CREATED: 'facture_created',
  FACTURE_PAID: 'facture_paid',
  CLIENT_CREATED: 'client_created',
  SYNC_REQUIRED: 'sync_required',
  CHAT_MESSAGE: 'chat_message',
};

/**
 * useRealtimeEvents hook - Now uses Supabase Realtime
 * @param {Object} options Configuration options
 * @param {boolean} options.enabled Enable/disable realtime connection (default: true)
 * @param {boolean} options.showToasts Show toast notifications (default: false - less intrusive)
 * @param {Function} options.onInterventionChange Callback when any intervention changes
 * @param {Function} options.onDevisChange Callback when any devis changes
 * @param {Function} options.onFactureChange Callback when any facture changes
 * @param {Function} options.onSyncRequired Callback when a full sync is required
 * @returns {Object} { isConnected, lastEvent, reconnect }
 */
export function useRealtimeEvents({
  enabled = true,
  showToasts = false, // Disabled by default to avoid spam
  onInterventionChange,
  onDevisChange,
  onFactureChange,
  onSyncRequired,
} = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const channelRef = useRef(null);

  const handleEvent = useCallback((eventType, data) => {
    setLastEvent({ type: eventType, data, timestamp: new Date() });

    // Show toast notifications if enabled (disabled by default)
    if (showToasts) {
      switch (eventType) {
        case EventType.INTERVENTION_CREATED:
          toast.info(`Nouvelle intervention: ${data?.titre || 'Sans titre'}`);
          break;
        case EventType.INTERVENTION_COMPLETED:
          toast.success(`Intervention terminée: ${data?.titre || 'Sans titre'}`);
          break;
        case EventType.DEVIS_SIGNED:
          toast.success('Devis signé!');
          break;
        case EventType.FACTURE_PAID:
          toast.success('Facture payée!');
          break;
        default:
          break;
      }
    }

    // Call specific callbacks
    if (eventType.startsWith('intervention_') && onInterventionChange) {
      onInterventionChange(eventType, data);
    }
    if (eventType.startsWith('devis_') && onDevisChange) {
      onDevisChange(eventType, data);
    }
    if (eventType.startsWith('facture_') && onFactureChange) {
      onFactureChange(eventType, data);
    }
    if (eventType === EventType.SYNC_REQUIRED && onSyncRequired) {
      onSyncRequired(data);
    }
  }, [showToasts, onInterventionChange, onDevisChange, onFactureChange, onSyncRequired]);

  const connect = useCallback(() => {
    if (!enabled || !user?.entreprise_id) return;

    // Close existing channel first
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.log('[Supabase Realtime] Error removing channel:', e);
      }
      channelRef.current = null;
    }

    try {
      // Create a unique channel name to avoid conflicts
      const channelName = `entreprise_${user.entreprise_id}_${Date.now()}`;
      
      // Subscribe to Supabase Realtime for interventions table
      // Note: All .on() calls must be chained before .subscribe()
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'interventions',
            filter: `entreprise_id=eq.${user.entreprise_id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              handleEvent(EventType.INTERVENTION_CREATED, payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const newData = payload.new;
              if (newData.statut === 'terminee') {
                handleEvent(EventType.INTERVENTION_COMPLETED, newData);
              } else if (newData.statut === 'en_cours') {
                handleEvent(EventType.INTERVENTION_STARTED, newData);
              } else {
                handleEvent(EventType.INTERVENTION_UPDATED, newData);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'devis',
            filter: `entreprise_id=eq.${user.entreprise_id}`
          },
          (payload) => {
            if (payload.new?.statut === 'signe') {
              handleEvent(EventType.DEVIS_SIGNED, payload.new);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'factures',
            filter: `entreprise_id=eq.${user.entreprise_id}`
          },
          (payload) => {
            if (payload.new?.statut === 'payee') {
              handleEvent(EventType.FACTURE_PAID, payload.new);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            console.log('[Supabase Realtime] Connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            console.log('[Supabase Realtime] Disconnected');
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('[Supabase Realtime] Error setting up channel:', error);
      setIsConnected(false);
    }
  }, [enabled, user?.entreprise_id, handleEvent]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  // Connect on mount and when user changes
  useEffect(() => {
    if (enabled && user?.entreprise_id) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.entreprise_id]);

  return {
    isConnected,
    lastEvent,
    reconnect,
  };
}

export default useRealtimeEvents;
