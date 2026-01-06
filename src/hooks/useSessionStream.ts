'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSalienceStore } from '@/store/salience-store';
import type { StreamEvent, StreamEventType } from '@/types/salience';

interface UseSessionStreamOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

interface UseSessionStreamReturn {
  isConnected: boolean;
  lastEvent: StreamEvent | null;
  events: StreamEvent[];
  reconnect: () => void;
}

export function useSessionStream(
  sessionId: string | null,
  options: UseSessionStreamOptions = {}
): UseSessionStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    updateNodeProgress,
    completeNode,
    failNode,
    setSession,
    session,
  } = useSalienceStore();

  // Handle incoming events
  const handleEvent = useCallback(
    (event: StreamEvent) => {
      setLastEvent(event);
      setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events

      switch (event.type) {
        case 'generation_progress': {
          const payload = event.payload as {
            nodeId: string;
            progress: number;
            message: string;
          };
          updateNodeProgress(payload.nodeId, payload.progress, payload.message);
          break;
        }

        case 'generation_complete': {
          const payload = event.payload as {
            nodeId: string;
            outputUrl: string;
            explanationShort: string;
          };
          completeNode(payload.nodeId, payload.outputUrl, payload.explanationShort);
          break;
        }

        case 'error': {
          const payload = event.payload as {
            nodeId: string | null;
            error: string;
          };
          if (payload.nodeId) {
            failNode(payload.nodeId, payload.error);
          }
          options.onError?.(payload.error);
          break;
        }

        case 'session_update': {
          // Optionally refresh session from server
          break;
        }

        case 'salience_extracted':
        case 'directions_planned':
        case 'node_created':
          // These events may warrant a session refresh
          // For now, they're just logged
          break;

        case 'heartbeat':
          // Just a keepalive, no action needed
          break;
      }
    },
    [updateNodeProgress, completeNode, failNode, options]
  );

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!sessionId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/salience/session/${sessionId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      options.onConnect?.();

      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    eventSource.onmessage = (messageEvent) => {
      try {
        const event = JSON.parse(messageEvent.data) as StreamEvent;
        handleEvent(event);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      options.onDisconnect?.();

      // Attempt to reconnect after 3 seconds
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    };
  }, [sessionId, handleEvent, options]);

  // Reconnect function exposed to consumers
  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  // Effect to connect/disconnect based on sessionId
  useEffect(() => {
    if (sessionId) {
      connect();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [sessionId, connect]);

  return {
    isConnected,
    lastEvent,
    events,
    reconnect,
  };
}

export default useSessionStream;
