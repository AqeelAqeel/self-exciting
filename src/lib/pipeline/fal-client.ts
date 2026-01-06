// FAL AI Client for Video Generation
// Uses fal-ai/minimax-video for image-to-video generation

import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export interface VideoGenerationInput {
  imageUrl: string;
  prompt: string;
  promptOptimizer?: boolean;
}

export interface VideoGenerationResult {
  videoUrl: string;
  requestId: string;
  duration?: number;
}

export interface VideoGenerationProgress {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress?: number;
  logs?: string[];
}

/**
 * Generate a video from an image using FAL minimax-video
 * This uses the subscribe method for real-time progress updates
 */
export async function generateVideo(
  input: VideoGenerationInput,
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<VideoGenerationResult> {
  const result = await fal.subscribe('fal-ai/minimax-video/image-to-video', {
    input: {
      image_url: input.imageUrl,
      prompt: input.prompt,
      prompt_optimizer: input.promptOptimizer ?? true,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (onProgress) {
        const logs = (update as { logs?: Array<{ message: string }> }).logs;
        onProgress({
          status: update.status,
          logs: logs?.map((log) => log.message),
        });
      }
    },
  });

  return {
    videoUrl: result.data.video.url,
    requestId: result.requestId,
  };
}

/**
 * Queue a video generation job and return immediately
 * Use getVideoResult to poll for completion
 */
export async function queueVideoGeneration(
  input: VideoGenerationInput
): Promise<{ requestId: string }> {
  const { request_id } = await fal.queue.submit('fal-ai/minimax-video/image-to-video', {
    input: {
      image_url: input.imageUrl,
      prompt: input.prompt,
      prompt_optimizer: input.promptOptimizer ?? true,
    },
    webhookUrl: process.env.FAL_WEBHOOK_URL,
  });

  return { requestId: request_id };
}

/**
 * Check the status of a queued video generation
 */
export async function getVideoStatus(
  requestId: string
): Promise<VideoGenerationProgress> {
  const status = await fal.queue.status('fal-ai/minimax-video/image-to-video', {
    requestId,
    logs: true,
  });

  const statusLogs = (status as { logs?: Array<{ message: string }> }).logs;
  return {
    status: status.status,
    logs: statusLogs?.map((log) => log.message),
  };
}

/**
 * Get the result of a completed video generation
 */
export async function getVideoResult(
  requestId: string
): Promise<VideoGenerationResult | null> {
  const status = await fal.queue.status('fal-ai/minimax-video/image-to-video', {
    requestId,
    logs: true,
  });

  if (status.status !== 'COMPLETED') {
    return null;
  }

  const result = await fal.queue.result('fal-ai/minimax-video/image-to-video', {
    requestId,
  });

  return {
    videoUrl: result.data.video.url,
    requestId,
  };
}

/**
 * Generate multiple videos in parallel with progress tracking
 */
export async function generateVideosParallel(
  inputs: Array<{ id: string } & VideoGenerationInput>,
  onProgress?: (id: string, progress: VideoGenerationProgress) => void
): Promise<Array<{ id: string } & VideoGenerationResult>> {
  const results = await Promise.all(
    inputs.map(async (input) => {
      const result = await generateVideo(
        {
          imageUrl: input.imageUrl,
          prompt: input.prompt,
          promptOptimizer: input.promptOptimizer,
        },
        (progress) => onProgress?.(input.id, progress)
      );
      return { id: input.id, ...result };
    })
  );

  return results;
}

/**
 * Generate an image using FAL's fast SDXL model
 * Useful for thumbnail generation
 */
export async function generateImage(
  prompt: string,
  options?: {
    negativePrompt?: string;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    numImages?: number;
  }
): Promise<{ imageUrl: string; seed: number }[]> {
  // Map aspect ratio to image size
  const imageSizeMap = {
    '9:16': { width: 768, height: 1344 },
    '16:9': { width: 1344, height: 768 },
    '1:1': { width: 1024, height: 1024 },
  };

  const imageSize = imageSizeMap[options?.aspectRatio || '9:16'];

  const result = await fal.subscribe('fal-ai/fast-sdxl', {
    input: {
      prompt,
      negative_prompt: options?.negativePrompt || 'blurry, low quality, distorted, watermark, text',
      image_size: imageSize,
      num_images: options?.numImages || 1,
    },
  });

  return result.data.images.map((img: { url: string; seed?: number }) => ({
    imageUrl: img.url,
    seed: img.seed ?? 0,
  }));
}
