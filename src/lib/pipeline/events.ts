import type { PipelineStepId, PipelineStreamEvent } from '@/types/pipeline';

// Store active connections for broadcasting (shared with stream route)
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Export for use by stream route
export function getConnections() {
  return connections;
}

export function addConnection(
  projectId: string,
  controller: ReadableStreamDefaultController
) {
  if (!connections.has(projectId)) {
    connections.set(projectId, new Set());
  }
  connections.get(projectId)!.add(controller);
}

export function removeConnection(
  projectId: string,
  controller: ReadableStreamDefaultController
) {
  const projectConnections = connections.get(projectId);
  if (projectConnections) {
    projectConnections.delete(controller);
    if (projectConnections.size === 0) {
      connections.delete(projectId);
    }
  }
}

// Broadcast an event to all connections for a project
export function emitPipelineEvent(projectId: string, event: PipelineStreamEvent) {
  const projectConnections = connections.get(projectId);
  if (!projectConnections || projectConnections.size === 0) {
    return;
  }

  const data = `data: ${JSON.stringify(event)}\n\n`;
  const deadConnections: ReadableStreamDefaultController[] = [];

  projectConnections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      deadConnections.push(controller);
    }
  });

  // Clean up dead connections
  deadConnections.forEach((controller) => {
    projectConnections.delete(controller);
  });
}

// Convenience functions for common event types
export function emitStepStarted(projectId: string, stepId: PipelineStepId) {
  emitPipelineEvent(projectId, {
    type: 'step_started',
    timestamp: new Date().toISOString(),
    payload: { stepId },
  });
}

export function emitStepProgress(
  projectId: string,
  stepId: PipelineStepId,
  progress: number,
  message?: string
) {
  emitPipelineEvent(projectId, {
    type: 'step_progress',
    timestamp: new Date().toISOString(),
    payload: { stepId, progress, message },
  });
}

export function emitStepComplete(
  projectId: string,
  stepId: PipelineStepId,
  data: unknown
) {
  emitPipelineEvent(projectId, {
    type: 'step_complete',
    timestamp: new Date().toISOString(),
    payload: { stepId, data },
  });
}

export function emitStepError(
  projectId: string,
  stepId: PipelineStepId,
  error: string
) {
  emitPipelineEvent(projectId, {
    type: 'step_error',
    timestamp: new Date().toISOString(),
    payload: { stepId, error },
  });
}

export function emitProjectUpdate(projectId: string, project: unknown) {
  emitPipelineEvent(projectId, {
    type: 'project_update',
    timestamp: new Date().toISOString(),
    payload: { project },
  });
}
