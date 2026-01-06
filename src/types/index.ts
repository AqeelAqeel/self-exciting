// Core types for the infinite canvas application

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Card {
  id: string;
  type: CardType;
  position: Position;
  size: Size;
  content: CardContent;
  zIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CardType =
  | 'text'
  | 'image'
  | 'ai-prompt'
  | 'ai-response'
  | 'input'
  | 'note'
  | 'curiosity-catalyst';

// Generation modes for AI prompt cards
export type GenerationMode = 'text' | 'image' | 'video';

// Generated asset from image/video generation
export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  model: string;
  createdAt: Date;
  // For video, might be a thumbnail
  thumbnailUrl?: string;
  // Base64 data for local storage persistence
  base64Data?: string;
}

// Prompt history for follow-on prompts
export interface PromptHistoryItem {
  id: string;
  prompt: string;
  generationMode: GenerationMode;
  asset?: GeneratedAsset;
  createdAt: Date;
}

export interface CardContent {
  title?: string;
  text?: string;
  imageUrl?: string;
  prompt?: string;
  response?: string;
  metadata?: Record<string, unknown>;
  // For curiosity-catalyst cards
  referenceImages?: ReferenceImage[];
  // For AI generation cards
  generationMode?: GenerationMode;
  generatedAsset?: GeneratedAsset;
  promptHistory?: PromptHistoryItem[];
  isGenerating?: boolean;
}

export interface ReferenceImage {
  id: string;
  url: string;
  filename: string;
  addedAt: Date;
}

export interface PersonalizationContext {
  isReady: boolean;
  imageCount: number;
  requiredCount: number;
  analysis?: StyleAnalysis;
  analyzedAt?: Date;
}

export interface StyleAnalysis {
  features: string[];
  themes: string[];
  colors: string[];
  styles: string[];
  mood: string;
  rawAnalysis: string;
}

export interface CanvasState {
  scale: number;
  position: Position;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

export interface ProcessingTask {
  id: string;
  type: 'image' | 'text' | 'ai';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: unknown;
  output?: unknown;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Image generation request/response
export interface ImageGenerationRequest {
  prompt: string;
  model?: 'dall-e-3' | 'dall-e-2' | 'gpt-image-1';
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '256x256';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface ImageGenerationResponse {
  success: boolean;
  url?: string;
  base64?: string;
  model: string;
  error?: string;
}

// Video generation request/response
export interface VideoGenerationRequest {
  prompt: string;
  model?: 'sora';
  duration?: number;
  resolution?: '1080p' | '720p' | '480p';
}

export interface VideoGenerationResponse {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  model: string;
  error?: string;
  // For polling video generation status
  taskId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}
