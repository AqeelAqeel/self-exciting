// Agent Executor for Content Factory Pipeline
// Runs LLM agents and parses their outputs

import { callAI } from '@/lib/ai-client';
import type {
  ContentIdeaData,
  ScriptData,
  SegmentData,
  SegmentsData,
  ImagePromptData,
  ThumbnailData,
  ConsistencyProfile
} from '@/types/pipeline';
import {
  getScriptGeneratorPrompt,
  getSegmentPlannerPrompt,
  getImagePromptGeneratorPrompt,
  getThumbnailPrompt,
  getCaptionPrompt,
} from './prompts';

/**
 * Parse JSON from LLM response, handling markdown code blocks
 */
function parseJsonResponse<T>(response: string): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}

/**
 * Generate a video script from a content idea
 */
export async function generateScript(contentIdea: ContentIdeaData): Promise<ScriptData> {
  const prompt = getScriptGeneratorPrompt(contentIdea);

  const response = await callAI({
    messages: [
      { role: 'system', content: 'You are a viral video scriptwriter. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 2000,
  });

  const result = parseJsonResponse<{
    title: string;
    hook: string;
    body: string;
    cta: string;
    fullText: string;
    estimatedDuration: number;
    hashtags: string[];
    captionText: string;
  }>(response.content);

  return {
    title: result.title,
    hook: result.hook,
    body: result.body,
    cta: result.cta,
    fullText: result.fullText,
    estimatedDuration: result.estimatedDuration,
    hashtags: result.hashtags,
    captionText: result.captionText,
    generatedAt: new Date(),
  };
}

/**
 * Plan segments from a script
 */
export async function planSegments(
  script: ScriptData,
  contentIdea: ContentIdeaData
): Promise<SegmentsData> {
  const prompt = getSegmentPlannerPrompt(
    {
      fullText: script.fullText,
      title: script.title,
      estimatedDuration: script.estimatedDuration,
    },
    contentIdea
  );

  const response = await callAI({
    messages: [
      { role: 'system', content: 'You are a visual director for short-form video. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 3000,
  });

  const result = parseJsonResponse<{
    consistencyProfile: ConsistencyProfile;
    segments: Array<{
      index: number;
      position: string;
      narration: string;
      sceneDescription: string;
      duration: number;
      motionDirection: string;
      keyElements: string[];
    }>;
  }>(response.content);

  return {
    consistencyProfile: result.consistencyProfile,
    segments: result.segments.map((seg, idx) => ({
      id: `segment-${idx}`,
      index: seg.index,
      position: seg.position,
      narration: seg.narration,
      sceneDescription: seg.sceneDescription,
      duration: seg.duration,
      motionDirection: seg.motionDirection as SegmentData['motionDirection'],
      keyElements: seg.keyElements,
    })),
  };
}

/**
 * Generate image prompts for all segments
 */
export async function generateImagePrompts(
  segments: SegmentsData,
  contentIdea: ContentIdeaData
): Promise<ImagePromptData[]> {
  const prompts: ImagePromptData[] = [];

  for (const segment of segments.segments) {
    const prompt = getImagePromptGeneratorPrompt(
      segment,
      segments.consistencyProfile,
      contentIdea
    );

    const response = await callAI({
      messages: [
        { role: 'system', content: 'You are an expert prompt engineer for AI image generation. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1000,
    });

    const result = parseJsonResponse<{
      prompt: string;
      negativePrompt: string;
      aspectRatio: string;
      styleEmphasis: string[];
    }>(response.content);

    prompts.push({
      segmentId: segment.id,
      segmentIndex: segment.index,
      prompt: result.prompt,
      negativePrompt: result.negativePrompt,
      aspectRatio: result.aspectRatio as '9:16' | '16:9' | '1:1',
      styleEmphasis: result.styleEmphasis,
    });
  }

  return prompts;
}

/**
 * Generate a single image prompt for a specific segment
 */
export async function generateImagePrompt(
  segment: SegmentData,
  consistencyProfile: ConsistencyProfile,
  contentIdea: ContentIdeaData
): Promise<ImagePromptData> {
  const prompt = getImagePromptGeneratorPrompt(
    segment,
    consistencyProfile,
    contentIdea
  );

  const response = await callAI({
    messages: [
      { role: 'system', content: 'You are an expert prompt engineer for AI image generation. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 1000,
  });

  const result = parseJsonResponse<{
    prompt: string;
    negativePrompt: string;
    aspectRatio: string;
    styleEmphasis: string[];
  }>(response.content);

  return {
    segmentId: segment.id,
    segmentIndex: segment.index,
    prompt: result.prompt,
    negativePrompt: result.negativePrompt,
    aspectRatio: result.aspectRatio as '9:16' | '16:9' | '1:1',
    styleEmphasis: result.styleEmphasis,
  };
}

/**
 * Generate thumbnail concept
 */
export async function generateThumbnailPrompt(
  script: ScriptData,
  contentIdea: ContentIdeaData,
  consistencyProfile?: ConsistencyProfile
): Promise<Omit<ThumbnailData, 'url' | 'storageUrl' | 'generatedAt'>> {
  const prompt = getThumbnailPrompt(
    { title: script.title, hook: script.hook },
    contentIdea,
    consistencyProfile
  );

  const response = await callAI({
    messages: [
      { role: 'system', content: 'You are an expert at creating viral video thumbnails. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 800,
  });

  const result = parseJsonResponse<{
    prompt: string;
    negativePrompt: string;
    style: 'meme' | 'clean' | 'dramatic';
    mainText: string | null;
    subText: string | null;
    textColor: string;
  }>(response.content);

  return {
    style: result.style,
    mainText: result.mainText || undefined,
    subText: result.subText || undefined,
    textColor: result.textColor,
  };
}

/**
 * Generate platform-specific caption
 */
export async function generateCaption(
  script: ScriptData,
  contentIdea: ContentIdeaData,
  platform: string
): Promise<{ caption: string; hashtags: string[] }> {
  const prompt = getCaptionPrompt(script, contentIdea, platform);

  const response = await callAI({
    messages: [
      { role: 'system', content: 'You are a social media expert. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 800,
  });

  const result = parseJsonResponse<{
    caption: string;
    hashtags: string[];
    characterCount: number;
  }>(response.content);

  return {
    caption: result.caption,
    hashtags: result.hashtags,
  };
}
