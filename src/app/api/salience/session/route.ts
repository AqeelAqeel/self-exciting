// POST /api/salience/session - Create new session
// GET /api/salience/session - List all sessions

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/salience/store/session-store';
import type { SessionMode } from '@/types/salience';

// Valid session modes
const VALID_MODES: SessionMode[] = [
  'character_design',
  'assets',
  'story_frames',
  'evolutionary_progress',
  'pm_flow',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, caption } = body as { mode?: string; caption?: string };

    // Validate mode
    if (!mode || !VALID_MODES.includes(mode as SessionMode)) {
      return NextResponse.json(
        {
          error: 'Invalid mode',
          validModes: VALID_MODES,
        },
        { status: 400 }
      );
    }

    // Create session
    const session = await sessionStore.create(mode as SessionMode, caption ?? '');

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sessions = await sessionStore.list();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        mode: s.mode,
        state: s.state,
        referenceCount: s.referenceUrls.length,
        directionCount: s.directions.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list sessions' },
      { status: 500 }
    );
  }
}
