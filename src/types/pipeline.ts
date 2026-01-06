// Content Factory Pipeline - Type Definitions

// =============================================================================
// PIPELINE STEP DEFINITIONS
// =============================================================================

export type PipelineStepId =
  | 'content_idea'
  | 'script_generation'
  | 'segments'
  | 'image_prompts'
  | 'image_generation'
  | 'video_generation'
  | 'video_composition'
  | 'thumbnail'
  | 'distribution';

export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';

export interface PipelineStepMeta {
  id: PipelineStepId;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

export const PIPELINE_STEPS: PipelineStepMeta[] = [
  {
    id: 'content_idea',
    index: 0,
    label: 'Content Idea',
    shortLabel: 'Idea',
    description: 'Define topic, niche, and format',
    icon: '1',
  },
  {
    id: 'script_generation',
    index: 1,
    label: 'Script Generation',
    shortLabel: 'Script',
    description: 'AI generates the video script',
    icon: '2',
  },
  {
    id: 'segments',
    index: 2,
    label: 'Segments',
    shortLabel: 'Segments',
    description: 'Script broken into 3-4 video segments',
    icon: '3',
  },
  {
    id: 'image_prompts',
    index: 3,
    label: 'Image Prompts',
    shortLabel: 'Prompts',
    description: 'Generate prompts for each segment',
    icon: '4',
  },
  {
    id: 'image_generation',
    index: 4,
    label: 'Image Generation',
    shortLabel: 'Images',
    description: 'Create images for each segment',
    icon: '5',
  },
  {
    id: 'video_generation',
    index: 5,
    label: 'Video Generation',
    shortLabel: 'Videos',
    description: 'Convert images to video via FAL minimax',
    icon: '6',
  },
  {
    id: 'video_composition',
    index: 6,
    label: 'Video Composition',
    shortLabel: 'Compose',
    description: 'FFmpeg stitches videos + audio',
    icon: '7',
  },
  {
    id: 'thumbnail',
    index: 7,
    label: 'Thumbnail',
    shortLabel: 'Thumb',
    description: 'Generate meme-style thumbnail',
    icon: '8',
  },
  {
    id: 'distribution',
    index: 8,
    label: 'Distribution',
    shortLabel: 'Publish',
    description: 'Push to social via PostBridge API',
    icon: '9',
  },
];

// =============================================================================
// STEP DATA TYPES
// =============================================================================

export type ContentStyle = 'educational' | 'entertainment' | 'viral' | 'storytelling';
export type TargetPlatform = 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'youtube';

export interface ContentIdeaData {
  topic: string;
  niche: string;
  style: ContentStyle;
  targetPlatform: TargetPlatform;
  targetDuration: number; // seconds (30-60 typical)
  tone?: string;
  keywords?: string[];
}

export interface ScriptData {
  title: string;
  hook: string;             // First 3 seconds - attention grabber
  body: string;             // Main content
  cta: string;              // Call to action
  fullText: string;         // Complete narration
  estimatedDuration: number; // seconds
  hashtags: string[];
  captionText: string;      // Social media caption (max 300 chars)
  generatedAt: Date;
}

export interface ConsistencyProfile {
  backgroundStyle: string;    // "gradient purple-blue neon"
  artStyle: string;           // "3D render, smooth surfaces"
  characterDescription: string | null;
  colorPalette: string[];     // ["#6B46C1", "#3182CE", "#ED64A6"]
  moodKeywords: string[];     // ["energetic", "modern", "bold"]
  avoidKeywords: string[];    // ["vintage", "muted", "dark"]
}

export interface SegmentData {
  id: string;
  index: number;              // 0-3
  position: string;           // "1/4", "2/4", etc.
  narration: string;          // Voiceover text for this segment
  sceneDescription: string;   // What should be shown visually
  duration: number;           // seconds
  motionDirection: string;    // "zoom in", "pan left", "static"
  keyElements: string[];      // ["floating text", "character gesture"]
}

export interface SegmentsData {
  consistencyProfile: ConsistencyProfile;
  segments: SegmentData[];
}

export interface ImagePromptData {
  segmentId: string;
  segmentIndex: number;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;        // "9:16" for shorts
  styleEmphasis: string[];
}

export interface GeneratedImageData {
  segmentId: string;
  segmentIndex: number;
  promptId: string;
  url: string;
  storageUrl: string;         // Supabase storage URL
  thumbnailUrl?: string;
  width: number;
  height: number;
  seed?: number;
  generatedAt: Date;
}

export interface GeneratedVideoData {
  segmentId: string;
  segmentIndex: number;
  imageId: string;
  url: string;
  storageUrl: string;         // Supabase storage URL
  thumbnailUrl?: string;
  duration: number;
  falRequestId?: string;      // FAL queue tracking
  generatedAt: Date;
}

export interface ComposedVideoData {
  url: string;
  storageUrl: string;         // Supabase storage URL
  thumbnailUrl?: string;
  duration: number;
  resolution: string;         // "1080x1920"
  audioTrackId?: string;
  audioTrackName?: string;
  ffmpegCommand?: string;     // For debugging/logging
  composedAt: Date;
}

export interface ThumbnailData {
  url: string;
  storageUrl: string;         // Supabase storage URL
  style: 'meme' | 'clean' | 'dramatic';
  mainText?: string;          // Big bold text overlay
  subText?: string;           // Optional smaller text
  textColor?: string;
  generatedAt: Date;
}

export type DistributionPlatform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'threads'
  | 'bluesky';

export type DistributionStatus = 'pending' | 'uploading' | 'published' | 'scheduled' | 'failed';

export interface PlatformDistribution {
  platform: DistributionPlatform;
  accountId: string;
  accountName?: string;
  status: DistributionStatus;
  postUrl?: string;
  postId?: string;
  scheduledFor?: Date;
  publishedAt?: Date;
  error?: string;
}

export interface DistributionData {
  postBridgePostId?: string;
  postBridgeMediaId?: string;
  caption: string;
  hashtags: string[];
  platforms: PlatformDistribution[];
  distributedAt?: Date;
}

// =============================================================================
// PIPELINE STEP STATE
// =============================================================================

export interface PipelineStep<T = unknown> {
  id: PipelineStepId;
  status: StepStatus;
  progress: number;           // 0-100
  data: T | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  retryCount: number;
}

// =============================================================================
// PROJECT (FULL PIPELINE STATE)
// =============================================================================

export type ProjectStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'archived';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  currentStepId: PipelineStepId | null;

  // Pipeline steps with typed data
  contentIdea: PipelineStep<ContentIdeaData>;
  scriptGeneration: PipelineStep<ScriptData>;
  segments: PipelineStep<SegmentsData>;
  imagePrompts: PipelineStep<ImagePromptData[]>;
  imageGeneration: PipelineStep<GeneratedImageData[]>;
  videoGeneration: PipelineStep<GeneratedVideoData[]>;
  videoComposition: PipelineStep<ComposedVideoData>;
  thumbnail: PipelineStep<ThumbnailData>;
  distribution: PipelineStep<DistributionData>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// SSE EVENT TYPES FOR PIPELINE
// =============================================================================

export type PipelineEventType =
  | 'connected'
  | 'step_started'
  | 'step_progress'
  | 'step_complete'
  | 'step_error'
  | 'project_update'
  | 'heartbeat';

export interface PipelineStreamEvent {
  type: PipelineEventType;
  timestamp: string; // ISO 8601 string for serialization
  payload: unknown;
}

export interface StepProgressPayload {
  stepId: PipelineStepId;
  progress: number;
  message: string;
  partialData?: unknown;
}

export interface StepCompletePayload {
  stepId: PipelineStepId;
  data: unknown;
}

export interface StepErrorPayload {
  stepId: PipelineStepId;
  error: string;
  retryable: boolean;
}

// =============================================================================
// AUDIO TRACKS
// =============================================================================

export interface AudioTrack {
  id: string;
  name: string;
  artist?: string;
  storageUrl: string;
  duration: number;           // seconds
  mood: string[];             // ["upbeat", "energetic"]
  genre: string;              // "electronic", "acoustic"
  bpm?: number;
  isLibraryTrack: boolean;    // Part of reusable library
}

// =============================================================================
// POSTBRIDGE TYPES
// =============================================================================

export interface PostBridgeSocialAccount {
  id: number;
  platform: string;
  username: string;
}

export interface PostBridgeMediaUpload {
  mediaId: string;
  uploadUrl: string;
}

export interface PostBridgePost {
  id: string;
  caption: string;
  status: 'posted' | 'scheduled' | 'processing';
  scheduledAt?: Date;
  socialAccounts: number[];
  media: string[];
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// FAL TYPES
// =============================================================================

export interface FalVideoInput {
  prompt: string;
  image_url: string;
  prompt_optimizer?: boolean;
}

export interface FalVideoOutput {
  video: {
    url: string;
  };
}

export type FalQueueStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface FalQueueUpdate {
  status: FalQueueStatus;
  queue_position?: number;
  logs?: Array<{ message: string }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function createEmptyStep<T>(id: PipelineStepId): PipelineStep<T> {
  return {
    id,
    status: 'pending',
    progress: 0,
    data: null,
    error: null,
    startedAt: null,
    completedAt: null,
    retryCount: 0,
  };
}

export function createEmptyProject(id: string, name: string): Project {
  return {
    id,
    name,
    status: 'draft',
    currentStepId: null,
    contentIdea: createEmptyStep('content_idea'),
    scriptGeneration: createEmptyStep('script_generation'),
    segments: createEmptyStep('segments'),
    imagePrompts: createEmptyStep('image_prompts'),
    imageGeneration: createEmptyStep('image_generation'),
    videoGeneration: createEmptyStep('video_generation'),
    videoComposition: createEmptyStep('video_composition'),
    thumbnail: createEmptyStep('thumbnail'),
    distribution: createEmptyStep('distribution'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Map step ID to project key for dynamic access
export const STEP_ID_TO_KEY: Record<PipelineStepId, keyof Project> = {
  content_idea: 'contentIdea',
  script_generation: 'scriptGeneration',
  segments: 'segments',
  image_prompts: 'imagePrompts',
  image_generation: 'imageGeneration',
  video_generation: 'videoGeneration',
  video_composition: 'videoComposition',
  thumbnail: 'thumbnail',
  distribution: 'distribution',
};

// Get step by ID from project
export function getStepFromProject(
  project: Project,
  stepId: PipelineStepId
): PipelineStep<unknown> {
  const key = STEP_ID_TO_KEY[stepId];
  return project[key] as PipelineStep<unknown>;
}

// Calculate overall project progress
export function calculateProjectProgress(project: Project): number {
  const steps: PipelineStepId[] = [
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

  let totalProgress = 0;
  for (const stepId of steps) {
    const step = getStepFromProject(project, stepId);
    if (step.status === 'complete') {
      totalProgress += 100;
    } else if (step.status === 'in_progress') {
      totalProgress += step.progress;
    }
  }

  return Math.round(totalProgress / steps.length);
}
