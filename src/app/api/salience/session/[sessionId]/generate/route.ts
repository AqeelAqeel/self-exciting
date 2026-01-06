// POST /api/salience/session/[sessionId]/generate
// Enqueue a generation job for a node

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/salience/store/session-store';
import { enqueueGeneration } from '@/lib/salience/pipeline';
import type { MediaType } from '@/types/salience';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { directionId, parentNodeId, mediaType = 'image', depth } = body as {
      directionId: string;
      parentNodeId?: string | null;
      mediaType?: MediaType;
      depth?: number;
    };

    // Validate required fields
    if (!directionId) {
      return NextResponse.json(
        { error: 'directionId is required' },
        { status: 400 }
      );
    }

    // Get session
    const session = await sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Validate session state
    if (!session.salienceProfile || session.directions.length === 0) {
      return NextResponse.json(
        { error: 'Session must be analyzed before generation' },
        { status: 400 }
      );
    }

    // Find direction
    const direction = session.directions.find((d) => d.id === directionId);
    if (!direction) {
      return NextResponse.json(
        { error: 'Direction not found' },
        { status: 404 }
      );
    }

    // Calculate depth if not provided
    const actualDepth = depth ?? direction.nodes.length + 1;

    // Check max depth
    if (actualDepth > 5) {
      return NextResponse.json(
        {
          error: 'Maximum depth reached',
          message: 'Depth 5/5 reached. Branch from any node to continue.',
        },
        { status: 400 }
      );
    }

    // Validate parent node if provided
    if (parentNodeId) {
      const parentNode = await sessionStore.getNode(sessionId, parentNodeId);
      if (!parentNode) {
        return NextResponse.json(
          { error: 'Parent node not found' },
          { status: 404 }
        );
      }
    }

    // Enqueue generation
    const { nodeId, jobId } = await enqueueGeneration(
      sessionId,
      directionId,
      parentNodeId ?? null,
      mediaType,
      actualDepth
    );

    // Update session state
    await sessionStore.setState(sessionId, 'generating');

    return NextResponse.json({
      success: true,
      nodeId,
      jobId,
      directionId,
      depth: actualDepth,
      mediaType,
      message: 'Generation started. Connect to SSE stream for updates.',
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const session = await sessionStore.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all nodes across all directions
    const allNodes = session.directions.flatMap((d) =>
      d.nodes.map((n) => ({
        id: n.id,
        directionId: d.id,
        directionLabel: d.label,
        depth: n.depth,
        status: n.status,
        progress: n.progress,
        mediaType: n.mediaType,
        outputUrl: n.outputUrl,
        createdAt: n.createdAt,
        completedAt: n.completedAt,
      }))
    );

    return NextResponse.json({
      success: true,
      totalNodes: allNodes.length,
      generating: allNodes.filter((n) => n.status === 'generating').length,
      complete: allNodes.filter((n) => n.status === 'complete').length,
      nodes: allNodes,
    });
  } catch (error) {
    console.error('Get generations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get generations' },
      { status: 500 }
    );
  }
}
