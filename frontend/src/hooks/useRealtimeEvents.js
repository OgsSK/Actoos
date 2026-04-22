/**
 * useRealtimeEvents hook - Subscribe to real-time events via Server-Sent Events (SSE)
 * 
 * This hook provides real-time synchronization between Admin Dashboard and Technician App
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Event types from backend
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
 * useRealtimeEvents hook
 * @param {Object} options Configuration options
 * @param {boolean} options.enabled Enable/disable SSE connection (default: true)
 * @param {boolean} options.showToasts Show toast notifications (default: true)
 * @param {Function} options.onInterventionChange Callback when any intervention changes
 * @param {Function} options.onDevisChange Callback when any devis changes
 * @param {Function} options.onFactureChange Callback when any facture changes
 * @param {Function} options.onSyncRequired Callback when a full sync is required
 * @returns {Object} { isConnected, lastEvent, reconnect }
 */
export function useRealtimeEvents({
  enabled = true,
  showToasts = true,
  onInterventionChange,
  onDevisChange,
  onFactureChange,
  onSyncRequired,
} = {}) {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const handleEvent = useCallback((eventType, data) => {
    setLastEvent({ type: eventType, data, timestamp: new Date() });

    // Show toast notifications if enabled
    if (showToasts) {
      switch (eventType) {
        case EventType.INTERVENTION_CREATED:
          toast.info(`Nouvelle intervention: ${data.data?.titre || 'Sans titre'}`, {
            description: 'Cliquez pour rafraîchir'
          });
          break;
        case EventType.INTERVENTION_STARTED:
          toast.info(`Intervention démarrée: ${data.data?.titre || 'Sans titre'}`);
          break;
        case EventType.INTERVENTION_COMPLETED:
          toast.success(`Intervention terminée: ${data.data?.titre || 'Sans titre'}`);
          break;
        case EventType.INTERVENTION_CLAIMED:
          toast.info(`Intervention réclamée: ${data.data?.titre || 'Sans titre'}`);
          break;
        case EventType.INTERVENTION_ASSIGNED:
          toast.info(`Nouvelle assignation: ${data.data?.titre || 'Sans titre'}`, {
            description: data.data?.message || 'Vous avez été assigné'
          });
          break;
        case EventType.DEVIS_SIGNED:
          toast.success('Devis signé!');
          break;
        case EventType.FACTURE_PAID:
          toast.success('Facture payée!');
          break;
        case EventType.SYNC_REQUIRED:
          toast.info('Données mises à jour', {
            description: data.data?.reason || 'Rafraîchissement recommandé'
          });
          break;
        default:
          break;
      }
    }

    // Call specific callbacks
    if (eventType.startsWith('intervention_') && onInterventionChange) {
      onInterventionChange(eventType, data.data);
    }
    if (eventType.startsWith('devis_') && onDevisChange) {
      onDevisChange(eventType, data.data);
    }
    if (eventType.startsWith('facture_') && onFactureChange) {
      onFactureChange(eventType, data.data);
    }
    if (eventType === EventType.SYNC_REQUIRED && onSyncRequired) {
      onSyncRequired(data.data);
    }
  }, [showToasts, onInterventionChange, onDevisChange, onFactureChange, onSyncRequired]);

  const connect = useCallback(() => {
    if (!enabled || !token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // EventSource doesn't support custom headers, so we need to use a workaround
    // We'll use a query parameter with the token (ensure backend supports this)
    // OR use fetch with ReadableStream for SSE
    const eventSource = new EventSource(`${API_URL}/api/events/stream?token=${token}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      console.log('[SSE] Connected to real-time events');
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setIsConnected(false);
      eventSource.close();
      
      // Reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current += 1;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[SSE] Reconnecting (attempt ${reconnectAttempts.current})...`);
        connect();
      }, delay);
    };

    // Listen for specific event types
    Object.values(EventType).forEach(eventType => {
      eventSource.addEventListener(eventType, (e) => {
        try {
          const data = JSON.parse(e.data);
          handleEvent(eventType, data);
        } catch (err) {
          console.error('[SSE] Error parsing event data:', err);
        }
      });
    });

    // Handle connection confirmation
    eventSource.addEventListener('connected', (e) => {
      console.log('[SSE] Connection confirmed:', JSON.parse(e.data));
    });

    // Handle ping (keepalive)
    eventSource.addEventListener('ping', () => {
      // Connection is alive
    });

    eventSourceRef.current = eventSource;
  }, [enabled, token, handleEvent]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect when token changes
  useEffect(() => {
    if (token) {
      reconnect();
    } else {
      disconnect();
    }
  }, [token, reconnect, disconnect]);

  return {
    isConnected,
    lastEvent,
    reconnect,
  };
}

export default useRealtimeEvents;
