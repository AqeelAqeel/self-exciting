// Supabase client for Content Factory Pipeline

import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key)
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server-side Supabase client (uses service role key for full access)
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  // Fall back to anon key if service role key not available
  const key = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!key) {
    throw new Error('Missing Supabase key');
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Singleton for server-side usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serverClient: ReturnType<typeof createClient<any>> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServerClient(): ReturnType<typeof createClient<any>> {
  if (!serverClient) {
    serverClient = createServerClient();
  }
  return serverClient;
}

// =============================================================================
// DATABASE TYPES (generated from schema)
// =============================================================================

export interface DbProject {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'failed' | 'archived';
  current_step_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbContentIdea {
  id: string;
  project_id: string;
  topic: string;
  niche: string;
  style: 'educational' | 'entertainment' | 'viral' | 'storytelling';
  target_platform: 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'youtube';
  target_duration: number;
  tone: string | null;
  keywords: string[] | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbScript {
  id: string;
  project_id: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  full_text: string | null;
  estimated_duration: number | null;
  hashtags: string[] | null;
  caption_text: string | null;
  generation_prompt: string | null;
  model_used: string | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbConsistencyProfile {
  id: string;
  project_id: string;
  background_style: string | null;
  art_style: string | null;
  character_description: string | null;
  color_palette: string[] | null;
  mood_keywords: string[] | null;
  avoid_keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbSegment {
  id: string;
  project_id: string;
  segment_index: number;
  position: string;
  narration: string | null;
  scene_description: string | null;
  duration: number;
  motion_direction: string | null;
  key_elements: string[] | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbImagePrompt {
  id: string;
  project_id: string;
  segment_id: string;
  segment_index: number;
  prompt: string;
  negative_prompt: string | null;
  aspect_ratio: string;
  style_emphasis: string[] | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbImageAsset {
  id: string;
  project_id: string;
  segment_id: string;
  prompt_id: string | null;
  segment_index: number;
  storage_path: string | null;
  storage_url: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  seed: number | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbVideoAsset {
  id: string;
  project_id: string;
  segment_id: string;
  image_asset_id: string | null;
  segment_index: number;
  storage_path: string | null;
  storage_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  fal_request_id: string | null;
  fal_status: string | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAudioTrack {
  id: string;
  name: string;
  artist: string | null;
  storage_path: string | null;
  storage_url: string | null;
  duration: number | null;
  mood: string[] | null;
  genre: string | null;
  bpm: number | null;
  is_library_track: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCompositeVideo {
  id: string;
  project_id: string;
  audio_track_id: string | null;
  storage_path: string | null;
  storage_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  resolution: string;
  ffmpeg_command: string | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbThumbnail {
  id: string;
  project_id: string;
  storage_path: string | null;
  storage_url: string | null;
  style: string;
  main_text: string | null;
  sub_text: string | null;
  text_color: string | null;
  prompt: string | null;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDistribution {
  id: string;
  project_id: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'twitter' | 'linkedin' | 'threads' | 'bluesky';
  account_id: string | null;
  account_name: string | null;
  caption: string | null;
  hashtags: string[] | null;
  postbridge_post_id: string | null;
  postbridge_media_id: string | null;
  post_url: string | null;
  post_id: string | null;
  scheduled_for: string | null;
  status: 'pending' | 'uploading' | 'published' | 'scheduled' | 'failed';
  error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
