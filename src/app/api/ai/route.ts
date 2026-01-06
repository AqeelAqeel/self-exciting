import { NextRequest, NextResponse } from 'next/server';
import { callAI, streamAI, type AIProvider } from '@/lib/ai-client';
import type { AIRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model, maxTokens, temperature, provider, stream } = body as AIRequest & {
      provider?: AIProvider;
      stream?: boolean;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Streaming response
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const generator = streamAI(
              { messages, model, maxTokens, temperature },
              provider || 'anthropic'
            );

            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const response = await callAI(
      { messages, model, maxTokens, temperature },
      provider || 'anthropic'
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
