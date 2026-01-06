import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ImageGenerationRequest, ImageGenerationResponse } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest): Promise<NextResponse<ImageGenerationResponse>> {
  try {
    const body: ImageGenerationRequest = await request.json();
    const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard', style = 'vivid' } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required', model },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured', model },
        { status: 500 }
      );
    }

    // Generate image with DALL-E
    const response = await openai.images.generate({
      model,
      prompt,
      n: 1,
      size: model === 'dall-e-3' ? size : (size === '1024x1024' || size === '512x512' || size === '256x256' ? size : '1024x1024'),
      quality: model === 'dall-e-3' ? quality : undefined,
      style: model === 'dall-e-3' ? style : undefined,
      response_format: 'b64_json', // Get base64 for local storage
    });

    const imageData = response.data?.[0];

    if (!imageData?.b64_json) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate image', model },
        { status: 500 }
      );
    }

    // Create a data URL from base64
    const dataUrl = `data:image/png;base64,${imageData.b64_json}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      base64: imageData.b64_json,
      model,
    });
  } catch (error) {
    console.error('Image generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { success: false, error: error.message, model: 'dall-e-3' },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage, model: 'dall-e-3' },
      { status: 500 }
    );
  }
}
