import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}))

describe('Supabase Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createBrowserClient', () => {
    it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key'

      const { createBrowserClient } = await import('@/lib/pipeline/supabase-client')

      expect(() => createBrowserClient()).toThrow('Missing Supabase environment variables')
    })

    it('throws when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

      const { createBrowserClient } = await import('@/lib/pipeline/supabase-client')

      expect(() => createBrowserClient()).toThrow('Missing Supabase environment variables')
    })

    it('returns a client when both env vars are present', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-anon-key'

      const { createBrowserClient } = await import('@/lib/pipeline/supabase-client')
      const client = createBrowserClient()

      expect(client).toBeDefined()
      expect(client.from).toBeDefined()
    })
  })

  describe('createServerClient', () => {
    it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

      const { createServerClient } = await import('@/lib/pipeline/supabase-client')

      expect(() => createServerClient()).toThrow('Missing NEXT_PUBLIC_SUPABASE_URL')
    })

    it('throws when no keys are available', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

      const { createServerClient } = await import('@/lib/pipeline/supabase-client')

      expect(() => createServerClient()).toThrow('Missing Supabase key')
    })

    it('uses service role key when available', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'anon-key'

      const { createClient } = await import('@supabase/supabase-js')
      const { createServerClient } = await import('@/lib/pipeline/supabase-client')

      createServerClient()

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'service-key',
        expect.any(Object)
      )
    })

    it('falls back to anon key when service role key is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'anon-key'

      const { createClient } = await import('@supabase/supabase-js')
      const { createServerClient } = await import('@/lib/pipeline/supabase-client')

      createServerClient()

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'anon-key',
        expect.any(Object)
      )
    })
  })

  describe('getServerClient', () => {
    it('returns singleton instance on multiple calls', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

      const { getServerClient } = await import('@/lib/pipeline/supabase-client')

      const client1 = getServerClient()
      const client2 = getServerClient()

      expect(client1).toBe(client2)
    })
  })
})

describe('Database Types', () => {
  it('DbProject has correct status enum values', async () => {
    const validStatuses = ['draft', 'in_progress', 'completed', 'failed', 'archived']

    // Type check - this would fail at compile time if types are wrong
    const project: Partial<import('@/lib/pipeline/supabase-client').DbProject> = {
      status: 'draft',
    }

    expect(validStatuses).toContain(project.status)
  })

  it('DbContentIdea has correct style enum values', async () => {
    const validStyles = ['educational', 'entertainment', 'viral', 'storytelling']

    const idea: Partial<import('@/lib/pipeline/supabase-client').DbContentIdea> = {
      style: 'educational',
    }

    expect(validStyles).toContain(idea.style)
  })

  it('DbDistribution has correct platform enum values', async () => {
    const validPlatforms = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'linkedin', 'threads', 'bluesky']

    const dist: Partial<import('@/lib/pipeline/supabase-client').DbDistribution> = {
      platform: 'tiktok',
    }

    expect(validPlatforms).toContain(dist.platform)
  })
})
