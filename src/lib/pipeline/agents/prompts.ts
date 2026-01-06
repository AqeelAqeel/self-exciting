// LLM Agent Prompts for Content Factory Pipeline

import type { ContentIdeaData, SegmentData, ConsistencyProfile } from '@/types/pipeline';

/**
 * Script Generator Agent
 * Creates a 30-60 second video script with hook, body, and CTA
 */
export function getScriptGeneratorPrompt(contentIdea: ContentIdeaData): string {
  return `You are an expert short-form video scriptwriter specializing in viral content for ${contentIdea.targetPlatform || 'TikTok'}.

## Task
Write a compelling ${contentIdea.targetDuration || 45}-second video script about: "${contentIdea.topic}"

## Content Parameters
- Niche: ${contentIdea.niche}
- Style: ${contentIdea.style || 'educational'}
- Tone: ${contentIdea.tone || 'engaging and conversational'}
${contentIdea.keywords?.length ? `- Keywords to include: ${contentIdea.keywords.join(', ')}` : ''}

## Script Structure Requirements

1. **HOOK (first 3 seconds)** - Must immediately grab attention. Use one of these patterns:
   - Provocative question
   - Bold claim or statistic
   - "Wait until you see..." / "You won't believe..."
   - Direct challenge to common belief

2. **BODY (main content, ~35-40 seconds)** - Deliver value through:
   - 3-4 key points or story beats
   - Conversational, first-person delivery
   - Short sentences (max 15 words each)
   - Natural pauses for visual transitions

3. **CTA (last 5 seconds)** - End with engagement hook:
   - Ask a question to encourage comments
   - Tease related content
   - Simple follow/save CTA

## Output Format (JSON)
{
  "title": "Catchy video title (max 100 chars)",
  "hook": "Opening hook text (first 3 seconds of narration)",
  "body": "Main content (narration for the body section)",
  "cta": "Call to action (final narration)",
  "fullText": "Complete narration script with natural flow",
  "estimatedDuration": <number in seconds>,
  "hashtags": ["relevant", "hashtags", "for", "discovery"],
  "captionText": "Caption for the post (max 2200 chars with hashtags)"
}

Write a script that would perform well organically. Focus on authenticity over polish.`;
}

/**
 * Segment Planner Agent
 * Splits script into 3-4 visual segments with consistency profile
 */
export function getSegmentPlannerPrompt(
  script: { fullText: string; title: string; estimatedDuration: number },
  contentIdea: ContentIdeaData
): string {
  return `You are a visual director for short-form video content. Your job is to break down a script into visual segments that will become generated images and videos.

## Script to Visualize
Title: ${script.title}
Duration: ~${script.estimatedDuration} seconds

Full Script:
"""
${script.fullText}
"""

## Content Context
- Topic: ${contentIdea.topic}
- Niche: ${contentIdea.niche}
- Style: ${contentIdea.style || 'educational'}
- Platform: ${contentIdea.targetPlatform || 'tiktok'}

## Your Task

1. **Create a Visual Consistency Profile** - Define the overall look that ALL segments will share:
   - Background style (e.g., "gradient purple-blue neon", "clean white studio", "dark moody atmosphere")
   - Art style (e.g., "3D render, smooth surfaces", "illustrated, bold lines", "photorealistic, cinematic")
   - Character description if applicable (e.g., "cartoon mascot owl", "faceless narrator hands only")
   - Color palette (3-5 hex colors)
   - Mood keywords (e.g., "energetic", "mysterious", "professional")
   - Keywords to AVOID (e.g., "text", "logos", "watermarks", "ugly", "deformed")

2. **Break into 3-4 Segments** - Each segment should:
   - Cover a logical portion of the narrative
   - Have a clear scene description
   - Specify camera motion direction for video generation
   - Last approximately equal duration

## Output Format (JSON)
{
  "consistencyProfile": {
    "backgroundStyle": "description of consistent background",
    "artStyle": "description of art/render style",
    "characterDescription": "description of recurring character if any, or null",
    "colorPalette": ["#hex1", "#hex2", "#hex3"],
    "moodKeywords": ["mood1", "mood2", "mood3"],
    "avoidKeywords": ["avoid1", "avoid2"]
  },
  "segments": [
    {
      "index": 0,
      "position": "1/4",
      "narration": "Exact narration text for this segment",
      "sceneDescription": "Detailed description of what should be visually shown",
      "duration": <seconds as number>,
      "motionDirection": "static" | "pan_left" | "pan_right" | "zoom_in" | "zoom_out" | "tilt_up" | "tilt_down",
      "keyElements": ["element1", "element2"]
    }
  ]
}

Ensure segments flow naturally into each other and maintain visual consistency.`;
}

/**
 * Image Prompt Generator Agent
 * Creates detailed image generation prompts for each segment
 */
export function getImagePromptGeneratorPrompt(
  segment: SegmentData,
  consistencyProfile: ConsistencyProfile,
  contentIdea: ContentIdeaData
): string {
  return `You are an expert prompt engineer for AI image generation (DALL-E, Midjourney style prompts).

## Segment to Visualize
Position: ${segment.position}
Scene Description: ${segment.sceneDescription}
Key Elements: ${segment.keyElements.join(', ')}
Motion Direction: ${segment.motionDirection}
Narration: "${segment.narration}"

## Visual Consistency Requirements
- Background: ${consistencyProfile.backgroundStyle}
- Art Style: ${consistencyProfile.artStyle}
${consistencyProfile.characterDescription ? `- Character: ${consistencyProfile.characterDescription}` : ''}
- Color Palette: ${consistencyProfile.colorPalette.join(', ')}
- Mood: ${consistencyProfile.moodKeywords.join(', ')}

## Content Context
- Topic: ${contentIdea.topic}
- Niche: ${contentIdea.niche}
- Platform: ${contentIdea.targetPlatform || 'tiktok'} (vertical 9:16 aspect ratio)

## Task
Create a detailed image generation prompt that:
1. Captures the scene description accurately
2. Maintains the consistency profile style
3. Is optimized for ${contentIdea.targetPlatform || 'TikTok'} vertical format (9:16)
4. Considers that this image will be animated with "${segment.motionDirection}" motion

## Output Format (JSON)
{
  "prompt": "Detailed prompt for image generation. Include style, composition, lighting, mood, and specific elements. Max 500 chars.",
  "negativePrompt": "Things to avoid: ${consistencyProfile.avoidKeywords.join(', ')}, text, watermark, blurry, low quality, distorted",
  "aspectRatio": "9:16",
  "styleEmphasis": ["key", "style", "words"]
}

Write a prompt that will generate a visually striking, scroll-stopping image.`;
}

/**
 * Thumbnail Generator Agent
 * Creates "Mr Beast style" thumbnail prompt
 */
export function getThumbnailPrompt(
  script: { title: string; hook: string },
  contentIdea: ContentIdeaData,
  consistencyProfile?: ConsistencyProfile
): string {
  return `You are an expert at creating viral video thumbnails in the style of top YouTubers/TikTokers.

## Video Info
Title: ${script.title}
Hook: ${script.hook}
Topic: ${contentIdea.topic}
Niche: ${contentIdea.niche}
${consistencyProfile ? `Style Reference: ${consistencyProfile.artStyle}` : ''}

## Thumbnail Best Practices
- High contrast, saturated colors
- Clear focal point (face with expression OR key object)
- Minimal text (2-4 words max, if any)
- "Mr Beast" style: expressive faces, bright colors, clean composition
- Must work at small sizes (scroll preview)

## Task
Design a thumbnail concept that would maximize click-through rate.

## Output Format (JSON)
{
  "prompt": "Detailed prompt for thumbnail image generation. Describe composition, colors, focal point, expression if face present. Optimized for 16:9 or 1:1. Max 400 chars.",
  "negativePrompt": "text, watermark, blurry, multiple focal points, cluttered, dark, muddy colors",
  "style": "meme" | "clean" | "dramatic",
  "mainText": "2-4 word overlay text if needed, or null",
  "subText": "Optional smaller text, or null",
  "textColor": "#hex color for text overlay"
}

Create a thumbnail that would make someone stop scrolling and click.`;
}

/**
 * Caption/Hashtag Generator Agent
 * Creates platform-optimized captions
 */
export function getCaptionPrompt(
  script: { title: string; fullText: string; hashtags?: string[] },
  contentIdea: ContentIdeaData,
  platform: string
): string {
  const platformGuidelines: Record<string, string> = {
    tiktok: 'Max 2200 chars. Hashtags in caption. Trend-aware, casual tone. Can use emojis.',
    instagram: 'Max 2200 chars. Hashtags at end or in comments. Slightly more polished than TikTok.',
    youtube_shorts: 'Max 100 chars for title. Keep concise, searchable. Less hashtag dependent.',
    twitter: 'Max 280 chars. Punchy, shareable. 1-2 hashtags max.',
    linkedin: 'Professional tone. Longer form okay (up to 3000 chars). Minimal hashtags.',
  };

  return `You are a social media expert optimizing content for ${platform}.

## Video Content
Title: ${script.title}
Script Summary: ${script.fullText.slice(0, 500)}...
Topic: ${contentIdea.topic}
Suggested Hashtags: ${script.hashtags?.join(', ') || 'none provided'}

## Platform Guidelines
${platformGuidelines[platform] || 'Standard social media best practices.'}

## Task
Write an optimized caption for ${platform} that:
1. Hooks readers in the first line
2. Provides value or intrigue
3. Includes appropriate hashtags
4. Ends with engagement prompt

## Output Format (JSON)
{
  "caption": "Full caption text with hashtags",
  "hashtags": ["list", "of", "hashtags", "used"],
  "characterCount": <number>
}`;
}
