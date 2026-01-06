// POST /api/salience/session/[sessionId]/analyze
// Extracts salience from references and plans directions

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/salience/store/session-store';
import { extractSalience, planDirections } from '@/lib/salience/agents';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const { numDirections = 6, force = false } = body as {
      numDirections?: number;
      force?: boolean;
    };

    // Get session
    const session = await sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if we have references
    if (session.referenceUrls.length === 0) {
      return NextResponse.json(
        { error: 'No references uploaded. Upload at least one reference first.' },
        { status: 400 }
      );
    }

    // Check if already analyzed (unless force)
    if (session.salienceProfile && session.directions.length > 0 && !force) {
      return NextResponse.json({
        success: true,
        cached: true,
        session,
        message: 'Session already analyzed. Use force=true to re-analyze.',
      });
    }

    // Update state to analyzing
    await sessionStore.setState(sessionId, 'analyzing');

    try {
      // Step 1: Extract salience
      const salienceProfile = await extractSalience(
        session.referenceUrls,
        session.caption,
        session.mode,
        session.preferences?.weights
      );

      // Save salience profile
      await sessionStore.setSalienceProfile(sessionId, salienceProfile);

      // Step 2: Plan directions
      const directions = await planDirections(
        salienceProfile,
        Math.min(Math.max(numDirections, 3), 8), // Clamp between 3-8
        session.mode
      );

      // Save directions
      const updatedSession = await sessionStore.setDirections(sessionId, directions);

      return NextResponse.json({
        success: true,
        cached: false,
        session: updatedSession,
        salienceProfile,
        directions,
      });
    } catch (error) {
      // Set error state
      await sessionStore.setState(sessionId, 'error');
      throw error;
    }
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Analysis failed',
        details: error instanceof Error ? error.stack : undefined,
      },
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

    return NextResponse.json({
      success: true,
      hasProfile: !!session.salienceProfile,
      hasDirections: session.directions.length > 0,
      salienceProfile: session.salienceProfile,
      directionsCount: session.directions.length,
      directions: session.directions.map((d) => ({
        id: d.id,
        index: d.index,
        label: d.label,
        intent: d.intent,
        nodeCount: d.nodes.length,
      })),
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get analysis' },
      { status: 500 }
    );
  }
}
