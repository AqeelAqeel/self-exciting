// PostBridge API Client for Social Media Distribution
// See: https://postbridge.io/docs

const POSTBRIDGE_API_URL = 'https://api.postbridge.io/v1';

export interface PostBridgeConfig {
  apiKey: string;
}

export interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  profileUrl?: string;
}

export interface CreateUploadUrlResponse {
  uploadUrl: string;
  mediaId: string;
  expiresAt: string;
}

export interface CreatePostRequest {
  mediaId: string;
  caption: string;
  socialAccounts: string[];
  hashtags?: string[];
  scheduledFor?: string; // ISO 8601 datetime
}

export interface PostResult {
  id: string;
  status: 'pending' | 'published' | 'scheduled' | 'failed';
  platforms: Array<{
    accountId: string;
    platform: string;
    status: string;
    postUrl?: string;
    postId?: string;
    error?: string;
  }>;
  createdAt: string;
}

export class PostBridgeClient {
  private apiKey: string;

  constructor(config: PostBridgeConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${POSTBRIDGE_API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PostBridge API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * List connected social accounts
   */
  async listAccounts(): Promise<SocialAccount[]> {
    const result = await this.request<{ accounts: SocialAccount[] }>('/accounts');
    return result.accounts;
  }

  /**
   * Get a specific account
   */
  async getAccount(accountId: string): Promise<SocialAccount> {
    return this.request<SocialAccount>(`/accounts/${accountId}`);
  }

  /**
   * Create an upload URL for media
   */
  async createUploadUrl(
    filename: string,
    contentType: string
  ): Promise<CreateUploadUrlResponse> {
    return this.request<CreateUploadUrlResponse>('/media/create-upload-url', {
      method: 'POST',
      body: JSON.stringify({
        filename,
        contentType,
      }),
    });
  }

  /**
   * Upload media to the signed URL
   */
  async uploadMedia(uploadUrl: string, buffer: Buffer, contentType: string): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload media: ${response.statusText}`);
    }
  }

  /**
   * Create a post
   */
  async createPost(request: CreatePostRequest): Promise<PostResult> {
    return this.request<PostResult>('/posts', {
      method: 'POST',
      body: JSON.stringify({
        media_id: request.mediaId,
        caption: request.caption,
        social_accounts: request.socialAccounts,
        hashtags: request.hashtags,
        scheduled_for: request.scheduledFor,
      }),
    });
  }

  /**
   * Get post status
   */
  async getPost(postId: string): Promise<PostResult> {
    return this.request<PostResult>(`/posts/${postId}`);
  }

  /**
   * List recent posts
   */
  async listPosts(limit = 20): Promise<PostResult[]> {
    const result = await this.request<{ posts: PostResult[] }>(`/posts?limit=${limit}`);
    return result.posts;
  }
}

/**
 * Upload a video and create a post to multiple platforms
 */
export async function distributeVideo(
  client: PostBridgeClient,
  videoBuffer: Buffer,
  options: {
    filename: string;
    caption: string;
    hashtags?: string[];
    platforms: string[]; // Account IDs
    scheduledFor?: Date;
  }
): Promise<PostResult> {
  // 1. Get upload URL
  const { uploadUrl, mediaId } = await client.createUploadUrl(
    options.filename,
    'video/mp4'
  );

  // 2. Upload the video
  await client.uploadMedia(uploadUrl, videoBuffer, 'video/mp4');

  // 3. Create the post
  const post = await client.createPost({
    mediaId,
    caption: options.caption,
    socialAccounts: options.platforms,
    hashtags: options.hashtags,
    scheduledFor: options.scheduledFor?.toISOString(),
  });

  return post;
}

/**
 * Get PostBridge client using API key from environment or Supabase config
 */
export async function getPostBridgeClient(): Promise<PostBridgeClient> {
  // First try environment variable
  let apiKey = process.env.POSTBRIDGE_API_KEY;

  // If not in env, try to get from Supabase config table
  if (!apiKey) {
    const { getServerClient } = await import('./supabase-client');
    const supabase = getServerClient() as ReturnType<typeof getServerClient>;

    const { data } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'postbridge_api_key')
      .single() as { data: { value: string } | null };

    if (data?.value) {
      apiKey = data.value;
    }
  }

  if (!apiKey) {
    throw new Error('PostBridge API key not configured');
  }

  return new PostBridgeClient({ apiKey });
}
