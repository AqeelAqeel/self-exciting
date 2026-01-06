// GET /api/salience/session/[sessionId]/stream
// Server-Sent Events stream for real-time generation updates

import { NextRequest } from 'next/server';
import { getSessionEventEmitter } from '@/lib/salience/events';
import { sessionStore } from '@/lib/salience/store/session-store';
import type { StreamEvent } from '@/types/salience';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  // Validate session exists
  const session = await sessionStore.get(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const eventEmitter = getSessionEventEmitter(sessionId);

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent: StreamEvent = {
        type: 'session_update',
        sessionId,
        timestamp: new Date(),
        payload: {
          status: 'connected',
          sessionState: session.state,
          directionsCount: session.directions.length,
        },
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`)
      );

      // Handler for all events
      const handleEvent = (event: StreamEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Connection closed
        }
      };

      // Register wildcard listener
      eventEmitter.on('*', handleEvent);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatEvent: StreamEvent = {
            type: 'heartbeat',
            sessionId,
            timestamp: new Date(),
            payload: { ping: true },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(heartbeatEvent)}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        eventEmitter.off('*', handleEvent);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
