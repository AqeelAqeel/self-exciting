// Generation Pipeline
// Orchestrates prompt composition, gating, and media generation

import { sessionStore } from './store/session-store';
import { composePrompt, gatePrompt } from './agents';
import { emitProgress, emitComplete, emitError, emitNodeCreated } from './events';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import type {
  GenerationNode,
  Direction,
  Session,
  ContextPack,
  GatedPackage,
  MediaType,
  ModelType,
} from '@/types/salience';

// Initialize OpenAI client for image/video generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Model versions
const IMAGE_MODEL = 'gpt-image-1.5-2025-12-16';
const VIDEO_MODEL = 'sora-2-2025-10-06';

// Ensure uploads directory exists
async function ensureUploadsDir(sessionId: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'generated', sessionId);
  await fs.mkdir(uploadsDir, { recursive: true });
  return uploadsDir;
}

// =============================================================================
// TYPES
// =============================================================================

interface GenerationJob {
  id: string;
  sessionId: string;
  directionId: string;
  nodeId: string;
  parentNodeId: string | null;
  mediaType: MediaType;
  depth: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error: string | null;
}

// =============================================================================
// JOB QUEUE (In-Memory)
// =============================================================================

const jobQueue: GenerationJob[] = [];
let isProcessing = false;

/**
 * Enqueue a generation job.
 */
export async function enqueueGeneration(
  sessionId: string,
  directionId: string,
  parentNodeId: string | null,
  mediaType: MediaType,
  depth: number
): Promise<{ nodeId: string; jobId: string }> {
  const session = await sessionStore.get(sessionId);
  if (!session) throw new Error('Session not found');

  const direction = session.directions.find((d) => d.id === directionId);
  if (!direction) throw new Error('Direction not found');

  // Create node
  const nodeId = crypto.randomUUID();
  const jobId = crypto.randomUUID();

  const node: GenerationNode = {
    id: nodeId,
    directionId,
    depth,
    status: 'queued',
    mediaType,
    model: mediaType === 'image' ? 'gpt-image-1.5-2025-12-16' : 'sora-2-2025-10-06',
    prompt: null,
    promptMeta: null,
    negative: [],
    explanationShort: null,
    outputUrl: null,
    thumbnailUrl: null,
    progress: 0,
    error: null,
    isPinned: false,
    parentNodeId,
    salienceDelta: [],
    createdAt: new Date(),
    completedAt: null,
  };

  // Add node to session
  await sessionStore.addNode(sessionId, directionId, node);

  // Emit node created event
  emitNodeCreated(sessionId, nodeId, directionId, depth);

  // Create job
  const job: GenerationJob = {
    id: jobId,
    sessionId,
    directionId,
    nodeId,
    parentNodeId,
    mediaType,
    depth,
    status: 'queued',
    error: null,
  };

  jobQueue.push(job);

  // Start processing if not already running
  if (!isProcessing) {
    processQueue().catch(console.error);
  }

  return { nodeId, jobId };
}

// =============================================================================
// QUEUE PROCESSOR
// =============================================================================

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) break;

    try {
      job.status = 'processing';
      await processJob(job);
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Job failed:', job.id, job.error);

      // Update node with error
      await sessionStore.updateNode(job.sessionId, job.nodeId, {
        status: 'error',
        error: job.error,
      });

      emitError(job.sessionId, job.nodeId, job.error);
    }
  }

  isProcessing = false;
}

// =============================================================================
// JOB PROCESSOR
// =============================================================================

async function processJob(job: GenerationJob): Promise<void> {
  const { sessionId, nodeId, directionId, parentNodeId, mediaType, depth } = job;

  // Get session and related data
  const session = await sessionStore.get(sessionId);
  if (!session) throw new Error('Session not found');

  const direction = session.directions.find((d) => d.id === directionId);
  if (!direction) throw new Error('Direction not found');

  // Update status to generating
  await sessionStore.updateNode(sessionId, nodeId, {
    status: 'generating',
    progress: 5,
  });

  emitProgress(sessionId, nodeId, directionId, 5, 'composing', 'Composing prompt...');

  // Build context pack
  const parentNode = parentNodeId
    ? await sessionStore.getNode(sessionId, parentNodeId)
    : null;

  const contextPack: ContextPack = {
    nodeTarget: {
      mediaType,
      depth,
      maxDepth: 5,
    },
    mode: session.mode,
    direction,
    salienceProfile: session.salienceProfile!,
    parentNode,
    preferenceState: session.preferences,
    recentActions: [], // TODO: Track actions
  };

  // Compose prompt
  emitProgress(sessionId, nodeId, directionId, 15, 'composing', 'Composing prompt...');
  const promptPackage = await composePrompt(contextPack);

  if (promptPackage.needsRevision) {
    throw new Error(`Prompt composition failed: ${promptPackage.issues.join('; ')}`);
  }

  // Gate prompt
  emitProgress(sessionId, nodeId, directionId, 30, 'gating', 'Validating prompt...');
  const gatedPackage = await gatePrompt(promptPackage);

  if (!gatedPackage.approved) {
    throw new Error(`Prompt rejected: ${gatedPackage.gateIssues.join('; ')}`);
  }

  // Update node with prompt
  await sessionStore.updateNode(sessionId, nodeId, {
    prompt: gatedPackage.prompt,
    promptMeta: gatedPackage.params,
    negative: gatedPackage.negative,
    explanationShort: gatedPackage.explanationShort,
    salienceDelta: gatedPackage.salienceDelta,
    progress: 40,
  });

  // Generate media
  emitProgress(sessionId, nodeId, directionId, 40, 'generating', 'Generating...');

  let outputUrl: string;
  if (mediaType === 'image') {
    outputUrl = await generateImage(sessionId, nodeId, directionId, gatedPackage);
  } else {
    outputUrl = await generateVideo(sessionId, nodeId, directionId, gatedPackage);
  }

  // Update node as complete
  emitProgress(sessionId, nodeId, directionId, 95, 'saving', 'Saving...');

  await sessionStore.updateNode(sessionId, nodeId, {
    status: 'complete',
    outputUrl,
    thumbnailUrl: outputUrl, // For now, same as output
    progress: 100,
    completedAt: new Date(),
  });

  emitComplete(
    sessionId,
    nodeId,
    directionId,
    outputUrl,
    outputUrl,
    gatedPackage.explanationShort
  );
}

// =============================================================================
// IMAGE GENERATION
// =============================================================================

/**
 * Convert aspect ratio string to OpenAI image size.
 */
function aspectToSize(aspectRatio: string): '1024x1024' | '1792x1024' | '1024x1792' {
  switch (aspectRatio) {
    case '16:9':
    case '3:2':
      return '1792x1024';
    case '9:16':
    case '2:3':
      return '1024x1792';
    case '1:1':
    default:
      return '1024x1024';
  }
}

async function generateImage(
  sessionId: string,
  nodeId: string,
  directionId: string,
  pkg: GatedPackage
): Promise<string> {
  // Start progress ticker
  const ticker = startProgressTicker(sessionId, nodeId, directionId, 40, 90);

  try {
    // Ensure uploads directory exists
    const uploadsDir = await ensureUploadsDir(sessionId);

    // Call OpenAI Image API
    emitProgress(sessionId, nodeId, directionId, 50, 'generating', 'Creating image...');

    const response = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: pkg.prompt,
      n: 1,
      size: aspectToSize(pkg.params.aspectRatio),
      response_format: 'b64_json',
    });

    ticker.stop();
    emitProgress(sessionId, nodeId, directionId, 85, 'saving', 'Saving image...');

    // Get base64 data
    if (!response.data || !response.data[0]) {
      throw new Error('No image data returned from API');
    }
    const imageData = response.data[0];
    if (!imageData.b64_json) {
      throw new Error('No base64 image data returned from API');
    }

    // Save to file
    const filename = `${nodeId}.png`;
    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(imageData.b64_json, 'base64');
    await fs.writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploads/generated/${sessionId}/${filename}`;
    return publicUrl;
  } catch (error) {
    ticker.stop();
    console.error('Image generation error:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// VIDEO GENERATION
// =============================================================================

/**
 * Convert aspect ratio string to Sora aspect ratio.
 */
function aspectToSoraRatio(aspectRatio: string): string {
  switch (aspectRatio) {
    case '16:9':
      return '16:9';
    case '9:16':
      return '9:16';
    case '1:1':
      return '1:1';
    case '4:3':
      return '4:3';
    case '3:4':
      return '3:4';
    default:
      return '16:9';
  }
}

async function generateVideo(
  sessionId: string,
  nodeId: string,
  directionId: string,
  pkg: GatedPackage
): Promise<string> {
  // Start progress ticker
  const ticker = startProgressTicker(sessionId, nodeId, directionId, 40, 90);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // Ensure uploads directory exists
    const uploadsDir = await ensureUploadsDir(sessionId);

    emitProgress(sessionId, nodeId, directionId, 45, 'generating', 'Initiating video generation...');

    // Create video generation job using Sora API
    const createResponse = await fetch('https://api.openai.com/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: VIDEO_MODEL,
        prompt: pkg.prompt,
        duration: pkg.params.duration || 6,
        aspect_ratio: aspectToSoraRatio(pkg.params.aspectRatio),
        n: 1,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${createResponse.status}`);
    }

    const createData = await createResponse.json() as { id: string; status: string };
    const jobId = createData.id;
    emitProgress(sessionId, nodeId, directionId, 50, 'generating', 'Video rendering in progress...');

    // Poll for completion
    let videoUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (5s intervals)

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const progress = 50 + Math.min(35, attempts * 0.5);
      emitProgress(sessionId, nodeId, directionId, progress, 'generating', 'Rendering video...');

      // Check job status
      const statusResponse = await fetch(`https://api.openai.com/v1/videos/generations/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!statusResponse.ok) {
        continue; // Retry on transient errors
      }

      const statusData = await statusResponse.json() as {
        status: string;
        output?: { url: string }[];
        error?: { message: string };
      };

      if (statusData.status === 'completed' && statusData.output?.[0]?.url) {
        videoUrl = statusData.output[0].url;
      } else if (statusData.status === 'failed') {
        throw new Error(statusData.error?.message || 'Video generation failed');
      }
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    ticker.stop();
    emitProgress(sessionId, nodeId, directionId, 88, 'saving', 'Downloading video...');

    // Download video and save locally
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download generated video');
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const filename = `${nodeId}.mp4`;
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, videoBuffer);

    // Return public URL
    const publicUrl = `/uploads/generated/${sessionId}/${filename}`;
    return publicUrl;
  } catch (error) {
    ticker.stop();
    console.error('Video generation error:', error);
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// PROGRESS TICKER
// =============================================================================

function startProgressTicker(
  sessionId: string,
  nodeId: string,
  directionId: string,
  startProgress: number,
  endProgress: number
): { stop: () => void } {
  let currentProgress = startProgress;
  const step = (endProgress - startProgress) / 50; // 50 steps

  const interval = setInterval(async () => {
    if (currentProgress < endProgress) {
      currentProgress = Math.min(currentProgress + step, endProgress);

      await sessionStore.updateNode(sessionId, nodeId, {
        progress: currentProgress,
      });

      emitProgress(
        sessionId,
        nodeId,
        directionId,
        currentProgress,
        'generating',
        'Generating...'
      );
    }
  }, 200);

  return {
    stop: () => clearInterval(interval),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  enqueueGeneration,
};
