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

// GET /api/pipeline/project - List all projects with step completion info
export async function GET() {
  try {
    const supabase = getServerClient() as any;

    // Fetch all projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to list projects:', error);
      return NextResponse.json(
        { error: 'Failed to list projects' },
        { status: 500 }
      );
    }

    // For each project, count completed steps
    const projectsWithCounts = await Promise.all(
      (projects || []).map(async (project: any) => {
        // Check each step table for completion status
        const [
          contentIdea,
          script,
          segments,
          imagePrompts,
          imageAssets,
          videoAssets,
          compositeVideo,
          thumbnail,
          distributions,
        ] = await Promise.all([
          supabase.from('content_ideas').select('status').eq('project_id', project.id).single(),
          supabase.from('scripts').select('status').eq('project_id', project.id).single(),
          supabase.from('segments').select('status').eq('project_id', project.id).limit(1),
          supabase.from('image_prompts').select('status').eq('project_id', project.id).limit(1),
          supabase.from('image_assets').select('status').eq('project_id', project.id).limit(1),
          supabase.from('video_assets').select('status').eq('project_id', project.id).limit(1),
          supabase.from('composite_videos').select('status').eq('project_id', project.id).single(),
          supabase.from('thumbnails').select('status').eq('project_id', project.id).single(),
          supabase.from('distributions').select('status').eq('project_id', project.id).limit(1),
        ]);

        let completedSteps = 0;
        if (contentIdea.data?.status === 'complete') completedSteps++;
        if (script.data?.status === 'complete') completedSteps++;
        if (segments.data?.[0]?.status === 'complete') completedSteps++;
        if (imagePrompts.data?.[0]?.status === 'complete') completedSteps++;
        if (imageAssets.data?.[0]?.status === 'complete') completedSteps++;
        if (videoAssets.data?.[0]?.status === 'complete') completedSteps++;
        if (compositeVideo.data?.status === 'complete') completedSteps++;
        if (thumbnail.data?.status === 'complete') completedSteps++;
        if (distributions.data?.[0]?.status === 'published') completedSteps++;

        // Determine current step based on what's complete
        let currentStepId = 'content_idea';
        if (contentIdea.data?.status === 'complete') currentStepId = 'script_generation';
        if (script.data?.status === 'complete') currentStepId = 'segments';
        if (segments.data?.[0]?.status === 'complete') currentStepId = 'image_prompts';
        if (imagePrompts.data?.[0]?.status === 'complete') currentStepId = 'image_generation';
        if (imageAssets.data?.[0]?.status === 'complete') currentStepId = 'video_generation';
        if (videoAssets.data?.[0]?.status === 'complete') currentStepId = 'video_composition';
        if (compositeVideo.data?.status === 'complete') currentStepId = 'thumbnail';
        if (thumbnail.data?.status === 'complete') currentStepId = 'distribution';
        if (distributions.data?.[0]?.status === 'published') currentStepId = 'distribution';

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          currentStepId,
          completedSteps,
          totalSteps: 9,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        };
      })
    );

    return NextResponse.json({ projects: projectsWithCounts });
  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
