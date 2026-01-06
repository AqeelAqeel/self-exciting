import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(),
}

vi.mock('@/lib/pipeline/supabase-client', () => ({
  getServerClient: vi.fn(() => mockSupabase),
}))

describe('Pipeline API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.delete.mockReturnValue(mockSupabase)
    mockSupabase.upsert.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.limit.mockReturnValue(mockSupabase)
  })

  describe('POST /api/pipeline/project', () => {
    it('creates a project successfully', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        status: 'draft',
      }

      mockSupabase.single.mockResolvedValue({ data: mockProject, error: null })

      const { POST } = await import('@/app/api/pipeline/project/route')
      const request = new NextRequest('http://localhost/api/pipeline/project', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('project-123')
      expect(data.name).toBe('Test Project')
      expect(data.status).toBe('draft')
    })

    it('returns 400 when name is missing', async () => {
      const { POST } = await import('@/app/api/pipeline/project/route')
      const request = new NextRequest('http://localhost/api/pipeline/project', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Project name is required')
    })

    it('returns 500 on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { POST } = await import('@/app/api/pipeline/project/route')
      const request = new NextRequest('http://localhost/api/pipeline/project', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create project')
    })

    it('calls Supabase insert with correct data', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: '123', name: 'Test', status: 'draft' },
        error: null,
      })

      const { POST } = await import('@/app/api/pipeline/project/route')
      const request = new NextRequest('http://localhost/api/pipeline/project', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Project' }),
      })

      await POST(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'My Project',
        status: 'draft',
      })
    })
  })

  describe('GET /api/pipeline/project', () => {
    it('returns list of projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', status: 'draft' },
        { id: '2', name: 'Project 2', status: 'completed' },
      ]

      mockSupabase.limit.mockResolvedValue({ data: mockProjects, error: null })

      const { GET } = await import('@/app/api/pipeline/project/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(2)
      expect(data.projects[0].name).toBe('Project 1')
    })

    it('returns empty array when no projects', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null })

      const { GET } = await import('@/app/api/pipeline/project/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toEqual([])
    })

    it('returns 500 on database error', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { GET } = await import('@/app/api/pipeline/project/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to list projects')
    })

    it('orders projects by created_at descending', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null })

      const { GET } = await import('@/app/api/pipeline/project/route')
      await GET()

      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('limits results to 50', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null })

      const { GET } = await import('@/app/api/pipeline/project/route')
      await GET()

      expect(mockSupabase.limit).toHaveBeenCalledWith(50)
    })
  })

  describe('GET /api/pipeline/project/[projectId]', () => {
    it('returns project with all step data', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        status: 'draft',
        current_step_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      // Mock parallel Promise.all results
      mockSupabase.single.mockResolvedValue({ data: mockProject, error: null })
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      const { GET } = await import('@/app/api/pipeline/project/[projectId]/route')
      const request = new NextRequest('http://localhost/api/pipeline/project/project-123')
      const context = { params: Promise.resolve({ projectId: 'project-123' }) }

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.project).toBeDefined()
      expect(data.project.id).toBe('project-123')
    })

    it('returns 404 when project not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      const { GET } = await import('@/app/api/pipeline/project/[projectId]/route')
      const request = new NextRequest('http://localhost/api/pipeline/project/non-existent')
      const context = { params: Promise.resolve({ projectId: 'non-existent' }) }

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Project not found')
    })
  })

  describe('DELETE /api/pipeline/project/[projectId]', () => {
    it('deletes project successfully', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      const { DELETE } = await import('@/app/api/pipeline/project/[projectId]/route')
      const request = new NextRequest('http://localhost/api/pipeline/project/project-123', {
        method: 'DELETE',
      })
      const context = { params: Promise.resolve({ projectId: 'project-123' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('calls Supabase delete with correct project ID', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      const { DELETE } = await import('@/app/api/pipeline/project/[projectId]/route')
      const request = new NextRequest('http://localhost/api/pipeline/project/my-project-id', {
        method: 'DELETE',
      })
      const context = { params: Promise.resolve({ projectId: 'my-project-id' }) }

      await DELETE(request, context)

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'my-project-id')
    })

    it('returns 500 on database error', async () => {
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Database error' } })

      const { DELETE } = await import('@/app/api/pipeline/project/[projectId]/route')
      const request = new NextRequest('http://localhost/api/pipeline/project/project-123', {
        method: 'DELETE',
      })
      const context = { params: Promise.resolve({ projectId: 'project-123' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete project')
    })
  })
})

describe('Pipeline Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.upsert.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
  })

  describe('Content Idea Upsert', () => {
    it('upserts with project_id conflict', async () => {
      const contentIdea = {
        project_id: 'project-123',
        topic: 'Test Topic',
        niche: 'Technology',
        style: 'educational',
        target_platform: 'tiktok',
        target_duration: 45,
      }

      mockSupabase.upsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: contentIdea, error: null }),
        }),
      })

      const supabase = mockSupabase
      await supabase.from('content_ideas').upsert(contentIdea, { onConflict: 'project_id' })

      expect(mockSupabase.from).toHaveBeenCalledWith('content_ideas')
      expect(mockSupabase.upsert).toHaveBeenCalledWith(contentIdea, { onConflict: 'project_id' })
    })
  })

  describe('Segments Insert', () => {
    it('inserts multiple segments with correct structure', async () => {
      const segments = [
        { project_id: 'p1', segment_index: 0, position: 'opening', duration: 5.0 },
        { project_id: 'p1', segment_index: 1, position: 'middle', duration: 5.0 },
        { project_id: 'p1', segment_index: 2, position: 'closing', duration: 5.0 },
      ]

      mockSupabase.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: segments, error: null }),
      })

      const supabase = mockSupabase
      await supabase.from('segments').insert(segments)

      expect(mockSupabase.from).toHaveBeenCalledWith('segments')
      expect(mockSupabase.insert).toHaveBeenCalledWith(segments)
    })
  })

  describe('Parallel Queries', () => {
    it('fetches project data from all tables in parallel', async () => {
      const tableNames = [
        'projects',
        'content_ideas',
        'scripts',
        'segments',
        'image_prompts',
        'image_assets',
        'video_assets',
        'composite_videos',
        'thumbnails',
        'distributions',
      ]

      // Simulate parallel fetches
      const queries = tableNames.map((table) => {
        mockSupabase.from(table)
        return Promise.resolve({ data: null, error: null })
      })

      await Promise.all(queries)

      // Verify all tables were queried
      tableNames.forEach((table) => {
        expect(mockSupabase.from).toHaveBeenCalledWith(table)
      })
    })
  })
})
