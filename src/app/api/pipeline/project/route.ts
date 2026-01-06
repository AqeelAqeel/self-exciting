/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/pipeline/supabase-client';

// POST /api/pipeline/project - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const supabase = getServerClient() as any;

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create project:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      status: project.status,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/pipeline/project - List all projects
export async function GET() {
  try {
    const supabase = getServerClient() as any;

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to list projects:', error);
      return NextResponse.json(
        { error: 'Failed to list projects' },
        { status: 500 }
      );
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
