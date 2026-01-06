import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { VideoGenerationRequest, VideoGenerationResponse } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest): Promise<NextResponse<VideoGenerationResponse>> {
  try {
    const body: VideoGenerationRequest = await request.json();
    const { prompt, model = 'sora' } = body;

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

    // Attempt to use Sora API
    // Note: Sora API access may be limited. This uses the responses API format.
    try {
      const response = await openai.responses.create({
        model: 'sora',
        input: prompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoOutput = (response as any).output?.find((item: any) => item.type === 'video_generation');

      if (videoOutput?.video_url) {
        return NextResponse.json({
          success: true,
          url: videoOutput.video_url,
          model: 'sora',
          status: 'completed',
        });
      }

      // If the response includes a task ID for async generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((response as any).id) {
        return NextResponse.json({
          success: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          taskId: (response as any).id,
          model: 'sora',
          status: 'processing',
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Video generation did not return expected output',
        model: 'sora',
      });
    } catch (apiError) {
      // Handle cases where Sora API isn't available
      const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown error';

      // Check if it's a model not found error
      if (errorMsg.includes('model') || errorMsg.includes('not found') || errorMsg.includes('access')) {
        return NextResponse.json({
          success: false,
          error: 'Video generation (Sora) is not yet available for your API key. Please check OpenAI API access.',
          model: 'sora',
          status: 'failed',
        });
      }

      throw apiError;
    }
  } catch (error) {
    console.error('Video generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { success: false, error: error.message, model: 'sora', status: 'failed' },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage, model: 'sora', status: 'failed' },
      { status: 500 }
    );
  }
}

// Check status of async video generation
export async function GET(request: NextRequest): Promise<NextResponse<VideoGenerationResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required', model: 'sora' },
        { status: 400 }
      );
    }

    // Poll for video generation status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await openai.responses.retrieve(taskId as any) as any;

    if (response.status === 'completed') {
      const videoOutput = response.output?.find((item: { type: string }) => item.type === 'video_generation');

      return NextResponse.json({
        success: true,
        url: videoOutput?.video_url,
        model: 'sora',
        status: 'completed',
      });
    }

    return NextResponse.json({
      success: true,
      taskId,
      model: 'sora',
      status: response.status === 'in_progress' ? 'processing' : response.status,
    });
  } catch (error) {
    console.error('Video status check error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to check video status', model: 'sora', status: 'failed' },
      { status: 500 }
    );
  }
}
