import { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/pipeline/supabase-client';
import { addConnection, removeConnection } from '@/lib/pipeline/events';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

// GET /api/pipeline/project/[projectId]/stream - SSE endpoint for real-time updates
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { projectId } = await context.params;
  const supabase = getServerClient() as any;

  // Verify project exists
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let heartbeatInterval: NodeJS.Timeout | null = null;

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the shared connections map
      addConnection(projectId, controller);

      // Send initial connected event
      const connectedEvent = {
        type: 'connected',
        timestamp: new Date().toISOString(),
        payload: {
          projectId,
          message: 'Connected to pipeline stream',
        },
      };
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(connectedEvent)}\n\n`)
      );

      // Set up heartbeat interval
      heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(heartbeat)}\n\n`)
          );
        } catch {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          removeConnection(projectId, controller);
        }
      }, 30000); // Send heartbeat every 30 seconds
    },
    cancel() {
      // Connection was closed by client
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
