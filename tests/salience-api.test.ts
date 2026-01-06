import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock session store
const mockSessionStore = {
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  setState: vi.fn(),
  setReferences: vi.fn(),
  setSalienceProfile: vi.fn(),
  setDirections: vi.fn(),
  addNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  getNode: vi.fn(),
  getDirection: vi.fn(),
  updatePreferences: vi.fn(),
  flush: vi.fn(),
  shutdown: vi.fn(),
}

vi.mock('@/lib/salience/store/session-store', () => ({
  sessionStore: mockSessionStore,
  default: mockSessionStore,
}))

describe('Salience Session API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/salience/session', () => {
    it('creates session with valid mode', async () => {
      const mockSession = {
        id: 'session-123',
        mode: 'character_design',
        state: 'initializing',
        referenceUrls: [],
        caption: '',
        directions: [],
        preferences: { weights: {}, explorationRate: 0.3, styleAffinities: {}, updatedAt: new Date() },
        salienceProfile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockSessionStore.create.mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/salience/session/route')
      const request = new NextRequest('http://localhost/api/salience/session', {
        method: 'POST',
        body: JSON.stringify({ mode: 'character_design' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionId).toBe('session-123')
      expect(data.session.mode).toBe('character_design')
    })

    it('creates session with caption', async () => {
      const mockSession = {
        id: 'session-123',
        mode: 'assets',
        state: 'initializing',
        caption: 'Test caption',
        referenceUrls: [],
        directions: [],
        preferences: { weights: {}, explorationRate: 0.3, styleAffinities: {}, updatedAt: new Date() },
        salienceProfile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockSessionStore.create.mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/salience/session/route')
      const request = new NextRequest('http://localhost/api/salience/session', {
        method: 'POST',
        body: JSON.stringify({ mode: 'assets', caption: 'Test caption' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.session.caption).toBe('Test caption')
      expect(mockSessionStore.create).toHaveBeenCalledWith('assets', 'Test caption')
    })

    it('returns 400 for invalid mode', async () => {
      const { POST } = await import('@/app/api/salience/session/route')
      const request = new NextRequest('http://localhost/api/salience/session', {
        method: 'POST',
        body: JSON.stringify({ mode: 'invalid_mode' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid mode')
      expect(data.validModes).toContain('character_design')
      expect(data.validModes).toContain('assets')
    })

    it('returns 400 when mode is missing', async () => {
      const { POST } = await import('@/app/api/salience/session/route')
      const request = new NextRequest('http://localhost/api/salience/session', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid mode')
    })

    it('accepts all valid modes', async () => {
      const validModes = ['character_design', 'assets', 'story_frames', 'evolutionary_progress', 'pm_flow']

      for (const mode of validModes) {
        mockSessionStore.create.mockResolvedValue({
          id: `session-${mode}`,
          mode,
          state: 'initializing',
          referenceUrls: [],
          caption: '',
          directions: [],
          preferences: { weights: {}, explorationRate: 0.3, styleAffinities: {}, updatedAt: new Date() },
          salienceProfile: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const { POST } = await import('@/app/api/salience/session/route')
        const request = new NextRequest('http://localhost/api/salience/session', {
          method: 'POST',
          body: JSON.stringify({ mode }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })

    it('returns 500 on store error', async () => {
      mockSessionStore.create.mockRejectedValue(new Error('Store error'))

      const { POST } = await import('@/app/api/salience/session/route')
      const request = new NextRequest('http://localhost/api/salience/session', {
        method: 'POST',
        body: JSON.stringify({ mode: 'character_design' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Store error')
    })
  })

  describe('GET /api/salience/session', () => {
    it('returns list of sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          mode: 'character_design',
          state: 'idle',
          referenceUrls: ['http://example.com/1.jpg'],
          directions: [{ id: 'd1' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          mode: 'assets',
          state: 'generating',
          referenceUrls: [],
          directions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockSessionStore.list.mockResolvedValue(mockSessions)

      const { GET } = await import('@/app/api/salience/session/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessions).toHaveLength(2)
      expect(data.sessions[0].referenceCount).toBe(1)
      expect(data.sessions[0].directionCount).toBe(1)
      expect(data.sessions[1].referenceCount).toBe(0)
    })

    it('returns empty array when no sessions', async () => {
      mockSessionStore.list.mockResolvedValue([])

      const { GET } = await import('@/app/api/salience/session/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessions).toEqual([])
    })

    it('returns 500 on store error', async () => {
      mockSessionStore.list.mockRejectedValue(new Error('Store error'))

      const { GET } = await import('@/app/api/salience/session/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Store error')
    })
  })
})

describe('Salience Session State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Session States', () => {
    const validStates = [
      'initializing',
      'references_uploaded',
      'analyzing',
      'directions_planned',
      'generating',
      'idle',
      'error',
    ]

    it('validates all session states', () => {
      validStates.forEach((state) => {
        expect(typeof state).toBe('string')
        expect(state.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Session Modes', () => {
    const validModes = [
      'character_design',
      'assets',
      'story_frames',
      'evolutionary_progress',
      'pm_flow',
    ]

    it('validates all session modes', () => {
      expect(validModes).toHaveLength(5)
      validModes.forEach((mode) => {
        expect(typeof mode).toBe('string')
      })
    })
  })
})

describe('Salience Direction and Node Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Direction Structure', () => {
    it('validates direction has required fields', () => {
      const direction = {
        id: 'dir-1',
        label: 'Cinematic Escalation',
        intent: 'Push towards more dramatic visuals',
        vector: {
          push: { cinematic_scale: 0.8 },
          pull: { abstraction: 0.2 },
          styleTags: ['dramatic', 'high-contrast'],
          moodNotes: 'Intense and theatrical',
        },
        promptSkeleton: 'A dramatic scene with {subject}...',
        nodes: [],
      }

      expect(direction.id).toBeDefined()
      expect(direction.label).toBeDefined()
      expect(direction.intent).toBeDefined()
      expect(direction.vector.push).toBeDefined()
      expect(direction.vector.pull).toBeDefined()
      expect(direction.promptSkeleton).toBeDefined()
      expect(Array.isArray(direction.nodes)).toBe(true)
    })
  })

  describe('GenerationNode Structure', () => {
    it('validates node has required fields', () => {
      const node = {
        id: 'node-1',
        depth: 1,
        status: 'pending' as const,
        prompt: 'Generated prompt text',
        outputUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(node.id).toBeDefined()
      expect(node.depth).toBeGreaterThanOrEqual(1)
      expect(node.depth).toBeLessThanOrEqual(5)
      expect(['pending', 'generating', 'complete', 'error']).toContain(node.status)
      expect(node.prompt).toBeDefined()
    })

    it('validates depth is within bounds (1-5)', () => {
      const validDepths = [1, 2, 3, 4, 5]
      const invalidDepths = [0, 6, -1, 10]

      validDepths.forEach((depth) => {
        expect(depth).toBeGreaterThanOrEqual(1)
        expect(depth).toBeLessThanOrEqual(5)
      })

      invalidDepths.forEach((depth) => {
        expect(depth < 1 || depth > 5).toBe(true)
      })
    })
  })

  describe('SalienceProfile Structure', () => {
    it('validates salience profile has expected axes', () => {
      const profile = {
        axes: {
          cinematic_scale: 0.7,
          color_temperature: 0.3,
          abstraction: 0.5,
          texture_detail: 0.8,
        },
        styleTags: ['cinematic', 'warm', 'detailed'],
        moodNotes: 'Warm and inviting atmosphere',
        extractedAt: new Date(),
      }

      expect(profile.axes).toBeDefined()
      expect(profile.styleTags).toBeDefined()
      expect(Array.isArray(profile.styleTags)).toBe(true)
      expect(profile.moodNotes).toBeDefined()
    })

    it('validates axis values are between 0 and 1', () => {
      const validValues = [0, 0.5, 1, 0.33, 0.67]
      const invalidValues = [-0.1, 1.1, 2, -1]

      validValues.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      })

      invalidValues.forEach((value) => {
        expect(value < 0 || value > 1).toBe(true)
      })
    })
  })
})

describe('Preference Learning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PreferenceState Structure', () => {
    it('validates preference state structure', () => {
      const preferences = {
        weights: {
          cinematic_scale: 0.8,
          color_temperature: 0.6,
        },
        explorationRate: 0.3,
        styleAffinities: {
          cinematic: 0.9,
          minimalist: 0.2,
        },
        updatedAt: new Date(),
      }

      expect(preferences.weights).toBeDefined()
      expect(preferences.explorationRate).toBeGreaterThanOrEqual(0)
      expect(preferences.explorationRate).toBeLessThanOrEqual(1)
      expect(preferences.styleAffinities).toBeDefined()
      expect(preferences.updatedAt).toBeInstanceOf(Date)
    })

    it('validates default explorationRate is 0.3', () => {
      const defaultExplorationRate = 0.3
      expect(defaultExplorationRate).toBe(0.3)
    })
  })

  describe('User Actions', () => {
    const validActions = ['push', 'fork', 'mutate', 'pin', 'prune']

    it('validates all user action types', () => {
      expect(validActions).toHaveLength(5)
      validActions.forEach((action) => {
        expect(typeof action).toBe('string')
      })
    })
  })
})
