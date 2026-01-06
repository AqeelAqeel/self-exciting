// POST /api/canvas/analyze
// Lightweight style analysis for canvas reference images

import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini-client';

interface AnalyzeRequest {
  imageUrls: string[];
}

interface StyleAnalysis {
  features: string[];
  themes: string[];
  colors: string[];
  styles: string[];
  mood: string;
  rawAnalysis: string;
}

const STYLE_ANALYZER_PROMPT = `You are a visual style analyzer. Analyze the provided reference images and extract the user's aesthetic preferences.

Respond ONLY with valid JSON in this exact format:
{
  "features": ["list of visual features that stand out - textures, patterns, elements"],
  "themes": ["list of thematic elements - nature, urban, abstract, etc"],
  "colors": ["dominant color palette - be specific like 'warm amber', 'deep teal'"],
  "styles": ["artistic styles - minimalist, maximalist, vintage, modern, etc"],
  "mood": "A single sentence describing the overall mood/feeling evoked",
  "rawAnalysis": "A 2-3 sentence summary of what you observe across all images"
}

Be specific and insightful. Look for patterns across images.`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { imageUrls } = body;

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    // Call Gemini with vision to analyze the images
    const response = await callGemini({
      systemPrompt: STYLE_ANALYZER_PROMPT,
      userMessage: `Analyze these ${imageUrls.length} reference images and extract the visual style preferences they represent.`,
      images: imageUrls,
      maxTokens: 2048,
      temperature: 0.7,
    });

    // Parse the response
    const analysis = JSON.parse(response.content) as StyleAnalysis;

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Canvas analyze error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}
