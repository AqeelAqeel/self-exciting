import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AIRequest, AIResponse } from '@/types';

// AI Provider configuration
export type AIProvider = 'anthropic' | 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function callAI(
  request: AIRequest,
  provider: AIProvider = 'openai'
): Promise<AIResponse> {
  if (provider === 'anthropic') {
    return callAnthropic(request);
  } else {
    return callOpenAI(request);
  }
}

async function callAnthropic(request: AIRequest): Promise<AIResponse> {
  const systemMessage = request.messages.find((m) => m.role === 'system');
  const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');

  const response = await anthropic.messages.create({
    model: request.model || 'claude-sonnet-4-20250514',
    max_tokens: request.maxTokens || 4096,
    system: systemMessage?.content,
    messages: nonSystemMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const textContent = response.content.find((block) => block.type === 'text');

  return {
    content: textContent?.type === 'text' ? textContent.text : '',
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

async function callOpenAI(request: AIRequest): Promise<AIResponse> {
  const response = await openai.chat.completions.create({
    model: request.model || 'gpt-5.2-2025-12-11',
    max_completion_tokens: request.maxTokens || 4096,
    temperature: request.temperature || 0.7,
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return {
    content: response.choices[0]?.message?.content || '',
    model: response.model,
    usage: response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        }
      : undefined,
  };
}

// Streaming support for real-time AI responses
export async function* streamAI(
  request: AIRequest,
  provider: AIProvider = 'openai'
): AsyncGenerator<string, void, unknown> {
  if (provider === 'anthropic') {
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');

    const stream = anthropic.messages.stream({
      model: request.model || 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens || 4096,
      system: systemMessage?.content,
      messages: nonSystemMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  } else {
    const stream = await openai.chat.completions.create({
      model: request.model || 'gpt-5.2-2025-12-11',
      max_completion_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      stream: true,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
