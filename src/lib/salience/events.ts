// Event Emitter for SSE Streaming
// Manages real-time updates for generation progress

import { EventEmitter } from 'events';
import type { StreamEvent, StreamEventType } from '@/types/salience';

// =============================================================================
// SESSION EVENT EMITTERS
// =============================================================================

// Map of session ID to event emitter
const sessionEmitters = new Map<string, EventEmitter>();

/**
 * Get or create an event emitter for a session.
 */
export function getSessionEventEmitter(sessionId: string): EventEmitter {
  let emitter = sessionEmitters.get(sessionId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(100); // Allow many SSE connections
    sessionEmitters.set(sessionId, emitter);
  }
  return emitter;
}

/**
 * Remove an event emitter for a session.
 */
export function removeSessionEventEmitter(sessionId: string): void {
  const emitter = sessionEmitters.get(sessionId);
  if (emitter) {
    emitter.removeAllListeners();
    sessionEmitters.delete(sessionId);
  }
}

// =============================================================================
// EMIT HELPERS
// =============================================================================

/**
 * Emit an event to all listeners for a session.
 */
export function emitSessionEvent(
  sessionId: string,
  type: StreamEventType,
  payload: unknown
): void {
  const emitter = getSessionEventEmitter(sessionId);
  const event: StreamEvent = {
    type,
    sessionId,
    timestamp: new Date(),
    payload,
  };
  emitter.emit(type, event);
  emitter.emit('*', event); // Wildcard for all events
}

/**
 * Emit generation progress event.
 */
export function emitProgress(
  sessionId: string,
  nodeId: string,
  directionId: string,
  progress: number,
  stage: 'queued' | 'composing' | 'gating' | 'generating' | 'saving',
  message: string
): void {
  emitSessionEvent(sessionId, 'generation_progress', {
    nodeId,
    directionId,
    progress,
    stage,
    message,
  });
}

/**
 * Emit generation complete event.
 */
export function emitComplete(
  sessionId: string,
  nodeId: string,
  directionId: string,
  outputUrl: string,
  thumbnailUrl: string | null,
  explanationShort: string
): void {
  emitSessionEvent(sessionId, 'generation_complete', {
    nodeId,
    directionId,
    outputUrl,
    thumbnailUrl,
    explanationShort,
  });
}

/**
 * Emit error event.
 */
export function emitError(
  sessionId: string,
  nodeId: string | null,
  error: string
): void {
  emitSessionEvent(sessionId, 'error', {
    nodeId,
    error,
  });
}

/**
 * Emit node created event.
 */
export function emitNodeCreated(
  sessionId: string,
  nodeId: string,
  directionId: string,
  depth: number
): void {
  emitSessionEvent(sessionId, 'node_created', {
    nodeId,
    directionId,
    depth,
  });
}

/**
 * Emit session update event.
 */
export function emitSessionUpdate(
  sessionId: string,
  state: string,
  message?: string
): void {
  emitSessionEvent(sessionId, 'session_update', {
    state,
    message,
  });
}

/**
 * Emit salience extracted event.
 */
export function emitSalienceExtracted(sessionId: string): void {
  emitSessionEvent(sessionId, 'salience_extracted', {});
}

/**
 * Emit directions planned event.
 */
export function emitDirectionsPlanned(
  sessionId: string,
  directionsCount: number
): void {
  emitSessionEvent(sessionId, 'directions_planned', {
    directionsCount,
  });
}

export default {
  getSessionEventEmitter,
  removeSessionEventEmitter,
  emitSessionEvent,
  emitProgress,
  emitComplete,
  emitError,
  emitNodeCreated,
  emitSessionUpdate,
  emitSalienceExtracted,
  emitDirectionsPlanned,
};
