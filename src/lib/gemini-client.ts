// Gemini Client for Analysis Agents
// Uses Gemini for salience extraction and direction planning

const ANALYSIS_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiRequest {
  systemPrompt: string;
  userMessage: string;
  images?: string[]; // URLs to fetch and convert to base64
  maxTokens?: number;
  temperature?: number;
}

export interface GeminiResponse {
  content: string;
  model: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/**
 * Call Gemini API for analysis tasks.
 * Supports multimodal input (text + images).
 */
export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }

  // Build parts array
  const parts: GeminiPart[] = [{ text: request.userMessage }];

  // Add images if provided (fetch and convert to base64)
  if (request.images && request.images.length > 0) {
    for (const imageUrl of request.images) {
      try {
        const imageData = await fetchImageAsBase64(imageUrl);
        if (imageData) {
          parts.push({
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.base64,
            },
          });
        }
      } catch (error) {
        console.error('Failed to fetch image:', imageUrl, error);
      }
    }
  }

  // Build request body
  const body = {
    system_instruction: request.systemPrompt
      ? { parts: [{ text: request.systemPrompt }] }
      : undefined,
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 4096,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(
    `${GEMINI_API_URL}/${ANALYSIS_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const json = await response.json();

  // Extract text from response
  const content = json?.candidates?.[0]?.content?.parts
    ?.map((p: GeminiPart) => p.text)
    .filter(Boolean)
    .join('') ?? '';

  if (!content) {
    throw new Error('No content in Gemini response');
  }

  return {
    content,
    model: ANALYSIS_MODEL,
  };
}

/**
 * Fetch an image from URL and convert to base64.
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    // Handle local URLs - need to construct full URL
    if (url.startsWith('/')) {
      // For local files, we need the full server URL
      // In production, these should be served from a public URL
      console.warn('Local URL detected, skipping:', url);
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.error('Failed to fetch image:', url, error);
    return null;
  }
}

/**
 * Call Gemini with vision for analyzing reference images.
 */
export async function analyzeWithVision(
  systemPrompt: string,
  userMessage: string,
  imageUrls: string[]
): Promise<GeminiResponse> {
  return callGemini({
    systemPrompt,
    userMessage,
    images: imageUrls,
    maxTokens: 4096,
    temperature: 0.7,
  });
}

export default {
  callGemini,
  analyzeWithVision,
};
