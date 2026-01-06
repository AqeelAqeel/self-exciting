'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import type { PipelineStreamEvent, PipelineStepId } from '@/types/pipeline';

interface UsePipelineStreamReturn {
  isConnected: boolean;
  lastEvent: PipelineStreamEvent | null;
  reconnect: () => void;
}

export function usePipelineStream(projectId: string | null): UsePipelineStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<PipelineStreamEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { updateStepProgress, completeStep, failStep, startStep, setProject } =
    usePipelineStore();

  const handleEvent = useCallback(
    (event: PipelineStreamEvent) => {
      setLastEvent(event);

      switch (event.type) {
        case 'connected': {
          // Initial connection with project state
          const payload = event.payload as { project?: unknown };
          if (payload.project) {
            setProject(payload.project as Parameters<typeof setProject>[0]);
          }
          break;
        }

        case 'step_started': {
          const payload = event.payload as { stepId: PipelineStepId };
          startStep(payload.stepId);
          break;
        }

        case 'step_progress': {
          const payload = event.payload as {
            stepId: PipelineStepId;
            progress: number;
            message?: string;
          };
          updateStepProgress(payload.stepId, payload.progress, payload.message);
          break;
        }

        case 'step_complete': {
          const payload = event.payload as {
            stepId: PipelineStepId;
            data: unknown;
          };
          completeStep(payload.stepId, payload.data);
          break;
        }

        case 'step_error': {
          const payload = event.payload as {
            stepId: PipelineStepId;
            error: string;
          };
          failStep(payload.stepId, payload.error);
          break;
        }

        case 'project_update': {
          const payload = event.payload as { project: unknown };
          if (payload.project) {
            setProject(payload.project as Parameters<typeof setProject>[0]);
          }
          break;
        }

        case 'heartbeat':
          // Keep-alive, no action needed
          break;
      }
    },
    [updateStepProgress, completeStep, failStep, startStep, setProject]
  );

  const connect = useCallback(() => {
    if (!projectId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/pipeline/project/${projectId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    eventSource.onmessage = (messageEvent) => {
      try {
        const event = JSON.parse(messageEvent.data) as PipelineStreamEvent;
        handleEvent(event);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Reconnect after 3 seconds
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    };
  }, [projectId, handleEvent]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (projectId) {
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
  }, [projectId, connect]);

  return { isConnected, lastEvent, reconnect };
}

export default usePipelineStream;
