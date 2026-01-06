// GET /api/salience/session/[sessionId] - Get session details
// DELETE /api/salience/session/[sessionId] - Delete session

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/salience/store/session-store';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
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
      session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const deleted = await sessionStore.delete(sessionId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { caption, state } = body as { caption?: string; state?: string };

    const session = await sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (caption !== undefined) updates.caption = caption;
    if (state !== undefined) updates.state = state;

    const updated = await sessionStore.update(sessionId, updates);

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    );
  }
}
