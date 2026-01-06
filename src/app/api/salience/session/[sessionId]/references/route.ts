// POST /api/salience/session/[sessionId]/references - Add reference URLs
// GET /api/salience/session/[sessionId]/references - List references

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/salience/store/session-store';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { urls } = body as { urls?: string[] };

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400 }
      );
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Merge with existing references
    const allUrls = [...new Set([...session.referenceUrls, ...urls])];
    const updated = await sessionStore.setReferences(sessionId, allUrls);

    return NextResponse.json({
      success: true,
      session: updated,
      addedCount: urls.length,
      totalCount: allUrls.length,
    });
  } catch (error) {
    console.error('Add references error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add references' },
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
      references: session.referenceUrls,
      count: session.referenceUrls.length,
    });
  } catch (error) {
    console.error('Get references error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get references' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { url } = body as { url?: string };

    const session = await sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const urls = url
      ? session.referenceUrls.filter((u) => u !== url)
      : [];

    const updated = await sessionStore.setReferences(sessionId, urls);

    return NextResponse.json({
      success: true,
      session: updated,
      remainingCount: urls.length,
    });
  } catch (error) {
    console.error('Remove reference error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove reference' },
      { status: 500 }
    );
  }
}
