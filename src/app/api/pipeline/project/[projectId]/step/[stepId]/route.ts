/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/pipeline/supabase-client';
import type { PipelineStepId } from '@/types/pipeline';

interface RouteContext {
  params: Promise<{ projectId: string; stepId: string }>;
}

// POST /api/pipeline/project/[projectId]/step/[stepId] - Trigger a pipeline step
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId, stepId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const supabase = getServerClient() as any;

    // Validate step ID
    const validSteps: PipelineStepId[] = [
      'content_idea',
      'script_generation',
      'segments',
      'image_prompts',
      'image_generation',
      'video_generation',
      'video_composition',
      'thumbnail',
      'distribution',
    ];

    if (!validSteps.includes(stepId as PipelineStepId)) {
      return NextResponse.json(
        { error: `Invalid step ID: ${stepId}` },
        { status: 400 }
      );
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Handle each step type
    switch (stepId as PipelineStepId) {
      case 'content_idea': {
        const { topic, niche, style, targetPlatform, targetDuration, tone, keywords } = body;

        if (!topic || !niche) {
          return NextResponse.json(
            { error: 'Topic and niche are required' },
            { status: 400 }
          );
        }

        // Upsert content idea
        const { data, error } = await supabase
          .from('content_ideas')
          .upsert({
            project_id: projectId,
            topic,
            niche,
            style: style || 'educational',
            target_platform: targetPlatform || 'tiktok',
            target_duration: targetDuration || 45,
            tone,
            keywords,
            status: 'complete',
            progress: 100,
            completed_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id',
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to save content idea:', error);
          return NextResponse.json(
            { error: 'Failed to save content idea' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            topic: data.topic,
            niche: data.niche,
            style: data.style,
            targetPlatform: data.target_platform,
            targetDuration: data.target_duration,
            tone: data.tone,
            keywords: data.keywords,
          },
        });
      }

      case 'script_generation': {
        // Mark as in progress
        await supabase
          .from('scripts')
          .upsert({
            project_id: projectId,
            status: 'in_progress',
            progress: 0,
            started_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id',
          });

        // TODO: Trigger actual script generation via LLM
        // For now, return success - actual generation would be async
        return NextResponse.json({
          success: true,
          message: 'Script generation started',
        });
      }

      case 'segments': {
        // Mark as in progress
        const { error } = await supabase
          .from('segments')
          .upsert({
            project_id: projectId,
            segment_index: 0,
            position: '1/4',
            status: 'in_progress',
            progress: 0,
            started_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id,segment_index',
          });

        if (error) {
          console.error('Failed to start segment generation:', error);
        }

        // TODO: Trigger actual segment planning
        return NextResponse.json({
          success: true,
          message: 'Segment planning started',
        });
      }

      case 'image_prompts': {
        // TODO: Trigger image prompt generation
        return NextResponse.json({
          success: true,
          message: 'Image prompt generation started',
        });
      }

      case 'image_generation': {
        // TODO: Trigger image generation
        return NextResponse.json({
          success: true,
          message: 'Image generation started',
        });
      }

      case 'video_generation': {
        // TODO: Trigger FAL video generation
        return NextResponse.json({
          success: true,
          message: 'Video generation started',
        });
      }

      case 'video_composition': {
        const { audioTrackId } = body;

        // Upsert composite video record
        await supabase
          .from('composite_videos')
          .upsert({
            project_id: projectId,
            audio_track_id: audioTrackId,
            status: 'in_progress',
            progress: 0,
            started_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id',
          });

        // TODO: Trigger FFmpeg composition
        return NextResponse.json({
          success: true,
          message: 'Video composition started',
        });
      }

      case 'thumbnail': {
        // Upsert thumbnail record
        await supabase
          .from('thumbnails')
          .upsert({
            project_id: projectId,
            style: 'meme',
            status: 'in_progress',
            progress: 0,
            started_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id',
          });

        // TODO: Trigger thumbnail generation
        return NextResponse.json({
          success: true,
          message: 'Thumbnail generation started',
        });
      }

      case 'distribution': {
        const { platforms } = body;

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
          return NextResponse.json(
            { error: 'At least one platform is required' },
            { status: 400 }
          );
        }

        // Create distribution records for each platform
        const distributions = platforms.map((platform: string) => ({
          project_id: projectId,
          platform,
          status: 'pending',
        }));

        const { error } = await supabase
          .from('distributions')
          .insert(distributions);

        if (error) {
          console.error('Failed to create distribution records:', error);
          return NextResponse.json(
            { error: 'Failed to start distribution' },
            { status: 500 }
          );
        }

        // TODO: Trigger PostBridge distribution
        return NextResponse.json({
          success: true,
          message: 'Distribution started',
          platforms,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Step not implemented' },
          { status: 501 }
        );
    }
  } catch (error) {
    console.error('Error triggering step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
