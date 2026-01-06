/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/pipeline/supabase-client';
import { createEmptyProject } from '@/types/pipeline';
import type { Project } from '@/types/pipeline';

type DbResult = { data: any; error: any };

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

// GET /api/pipeline/project/[projectId] - Get project with all step data
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const supabase = getServerClient() as any;

    // Fetch project and all related data in parallel
    const [
      projectResult,
      contentIdeaResult,
      scriptResult,
      segmentsResult,
      imagePromptsResult,
      imageAssetsResult,
      videoAssetsResult,
      compositeVideoResult,
      thumbnailResult,
      distributionsResult,
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('content_ideas').select('*').eq('project_id', projectId).single(),
      supabase.from('scripts').select('*').eq('project_id', projectId).single(),
      supabase.from('segments').select('*').eq('project_id', projectId).order('segment_index'),
      supabase.from('image_prompts').select('*').eq('project_id', projectId).order('segment_index'),
      supabase.from('image_assets').select('*').eq('project_id', projectId).order('segment_index'),
      supabase.from('video_assets').select('*').eq('project_id', projectId).order('segment_index'),
      supabase.from('composite_videos').select('*').eq('project_id', projectId).single(),
      supabase.from('thumbnails').select('*').eq('project_id', projectId).single(),
      supabase.from('distributions').select('*').eq('project_id', projectId),
    ]) as DbResult[];

    if (projectResult.error || !projectResult.data) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const dbProject = projectResult.data;

    // Build the full project object with all step data
    const project: Project = {
      ...createEmptyProject(dbProject.id, dbProject.name),
      status: dbProject.status,
      currentStepId: dbProject.current_step_id,
      createdAt: new Date(dbProject.created_at),
      updatedAt: new Date(dbProject.updated_at),
    };

    // Populate content idea
    if (contentIdeaResult.data) {
      const ci = contentIdeaResult.data;
      project.contentIdea = {
        id: 'content_idea',
        status: ci.status,
        progress: ci.progress,
        error: ci.error,
        startedAt: ci.started_at ? new Date(ci.started_at) : null,
        completedAt: ci.completed_at ? new Date(ci.completed_at) : null,
        retryCount: 0,
        data: {
          topic: ci.topic,
          niche: ci.niche,
          style: ci.style,
          targetPlatform: ci.target_platform,
          targetDuration: ci.target_duration,
          tone: ci.tone,
          keywords: ci.keywords,
        },
      };
    }

    // Populate script
    if (scriptResult.data) {
      const s = scriptResult.data;
      project.scriptGeneration = {
        id: 'script_generation',
        status: s.status,
        progress: s.progress,
        error: s.error,
        startedAt: s.started_at ? new Date(s.started_at) : null,
        completedAt: s.completed_at ? new Date(s.completed_at) : null,
        retryCount: 0,
        data: s.full_text ? {
          title: s.title || '',
          hook: s.hook || '',
          body: s.body || '',
          cta: s.cta || '',
          fullText: s.full_text,
          estimatedDuration: s.estimated_duration || 0,
          hashtags: s.hashtags || [],
          captionText: s.caption_text || '',
          generatedAt: new Date(s.completed_at || s.created_at),
        } : null,
      };
    }

    // Populate segments (with consistency profile from first segment or separate table)
    if (segmentsResult.data && segmentsResult.data.length > 0) {
      const firstSeg = segmentsResult.data[0];
      project.segments = {
        id: 'segments',
        status: firstSeg.status,
        progress: firstSeg.progress,
        error: firstSeg.error,
        startedAt: firstSeg.started_at ? new Date(firstSeg.started_at) : null,
        completedAt: firstSeg.completed_at ? new Date(firstSeg.completed_at) : null,
        retryCount: 0,
        data: {
          consistencyProfile: {
            backgroundStyle: '',
            artStyle: '',
            characterDescription: null,
            colorPalette: [],
            moodKeywords: [],
            avoidKeywords: [],
          },
          segments: segmentsResult.data.map((seg: any) => ({
            id: seg.id,
            index: seg.segment_index,
            position: seg.position,
            narration: seg.narration || '',
            sceneDescription: seg.scene_description || '',
            duration: seg.duration,
            motionDirection: seg.motion_direction || 'static',
            keyElements: seg.key_elements || [],
          })),
        },
      };
    }

    // Populate image prompts
    if (imagePromptsResult.data && imagePromptsResult.data.length > 0) {
      const prompts = imagePromptsResult.data;
      project.imagePrompts = {
        id: 'image_prompts',
        status: prompts[0].status,
        progress: prompts[0].progress,
        error: prompts[0].error,
        startedAt: prompts[0].started_at ? new Date(prompts[0].started_at) : null,
        completedAt: prompts[0].completed_at ? new Date(prompts[0].completed_at) : null,
        retryCount: 0,
        data: prompts.map((p: any) => ({
          segmentId: p.segment_id,
          segmentIndex: p.segment_index,
          prompt: p.prompt,
          negativePrompt: p.negative_prompt || '',
          aspectRatio: p.aspect_ratio,
          styleEmphasis: p.style_emphasis || [],
        })),
      };
    }

    // Populate image assets
    if (imageAssetsResult.data && imageAssetsResult.data.length > 0) {
      const images = imageAssetsResult.data;
      const allComplete = images.every((i: any) => i.status === 'complete');
      const anyError = images.some((i: any) => i.status === 'error');
      project.imageGeneration = {
        id: 'image_generation',
        status: anyError ? 'error' : allComplete ? 'complete' : images[0].status,
        progress: Math.round(images.filter((i: any) => i.status === 'complete').length / images.length * 100),
        error: images.find((i: any) => i.error)?.error || null,
        startedAt: images[0].started_at ? new Date(images[0].started_at) : null,
        completedAt: allComplete && images[0].completed_at ? new Date(images[0].completed_at) : null,
        retryCount: 0,
        data: images.map((img: any) => ({
          segmentId: img.segment_id,
          segmentIndex: img.segment_index,
          promptId: img.prompt_id || '',
          url: img.storage_url || '',
          storageUrl: img.storage_url || '',
          thumbnailUrl: img.thumbnail_url,
          width: img.width || 0,
          height: img.height || 0,
          seed: img.seed,
          generatedAt: new Date(img.completed_at || img.created_at),
        })),
      };
    }

    // Populate video assets
    if (videoAssetsResult.data && videoAssetsResult.data.length > 0) {
      const videos = videoAssetsResult.data;
      const allComplete = videos.every((v: any) => v.status === 'complete');
      const anyError = videos.some((v: any) => v.status === 'error');
      project.videoGeneration = {
        id: 'video_generation',
        status: anyError ? 'error' : allComplete ? 'complete' : videos[0].status,
        progress: Math.round(videos.filter((v: any) => v.status === 'complete').length / videos.length * 100),
        error: videos.find((v: any) => v.error)?.error || null,
        startedAt: videos[0].started_at ? new Date(videos[0].started_at) : null,
        completedAt: allComplete && videos[0].completed_at ? new Date(videos[0].completed_at) : null,
        retryCount: 0,
        data: videos.map((vid: any) => ({
          segmentId: vid.segment_id,
          segmentIndex: vid.segment_index,
          imageId: vid.image_asset_id || '',
          url: vid.storage_url || '',
          storageUrl: vid.storage_url || '',
          thumbnailUrl: vid.thumbnail_url,
          duration: vid.duration || 0,
          falRequestId: vid.fal_request_id,
          generatedAt: new Date(vid.completed_at || vid.created_at),
        })),
      };
    }

    // Populate composite video
    if (compositeVideoResult.data) {
      const cv = compositeVideoResult.data;
      project.videoComposition = {
        id: 'video_composition',
        status: cv.status,
        progress: cv.progress,
        error: cv.error,
        startedAt: cv.started_at ? new Date(cv.started_at) : null,
        completedAt: cv.completed_at ? new Date(cv.completed_at) : null,
        retryCount: 0,
        data: cv.storage_url ? {
          url: cv.storage_url,
          storageUrl: cv.storage_url,
          thumbnailUrl: cv.thumbnail_url,
          duration: cv.duration || 0,
          resolution: cv.resolution,
          audioTrackId: cv.audio_track_id,
          ffmpegCommand: cv.ffmpeg_command,
          composedAt: new Date(cv.completed_at || cv.created_at),
        } : null,
      };
    }

    // Populate thumbnail
    if (thumbnailResult.data) {
      const th = thumbnailResult.data;
      project.thumbnail = {
        id: 'thumbnail',
        status: th.status,
        progress: th.progress,
        error: th.error,
        startedAt: th.started_at ? new Date(th.started_at) : null,
        completedAt: th.completed_at ? new Date(th.completed_at) : null,
        retryCount: 0,
        data: th.storage_url ? {
          url: th.storage_url,
          storageUrl: th.storage_url,
          style: th.style as 'meme' | 'clean' | 'dramatic',
          mainText: th.main_text,
          subText: th.sub_text,
          textColor: th.text_color,
          generatedAt: new Date(th.completed_at || th.created_at),
        } : null,
      };
    }

    // Populate distributions
    if (distributionsResult.data && distributionsResult.data.length > 0) {
      const dists = distributionsResult.data;
      const allComplete = dists.every((d: any) => d.status === 'published');
      project.distribution = {
        id: 'distribution',
        status: allComplete ? 'complete' : dists[0].status === 'pending' ? 'pending' : 'in_progress',
        progress: Math.round(dists.filter((d: any) => d.status === 'published').length / dists.length * 100),
        error: dists.find((d: any) => d.error)?.error || null,
        startedAt: null,
        completedAt: allComplete ? new Date() : null,
        retryCount: 0,
        data: {
          postBridgePostId: dists[0].postbridge_post_id,
          postBridgeMediaId: dists[0].postbridge_media_id,
          caption: dists[0].caption || '',
          hashtags: dists[0].hashtags || [],
          platforms: dists.map((d: any) => ({
            platform: d.platform,
            accountId: d.account_id || '',
            accountName: d.account_name,
            status: d.status,
            postUrl: d.post_url,
            postId: d.post_id,
            scheduledFor: d.scheduled_for ? new Date(d.scheduled_for) : undefined,
            publishedAt: d.published_at ? new Date(d.published_at) : undefined,
            error: d.error,
          })),
        },
      };
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/pipeline/project/[projectId] - Delete a project
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params;
    const supabase = getServerClient() as any;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Failed to delete project:', error);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
