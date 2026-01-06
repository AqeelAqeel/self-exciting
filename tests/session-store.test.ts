import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn().mockResolvedValue([]),
  unlink: vi.fn(),
}))

// Mock crypto.randomUUID
const mockUUID = '123e4567-e89b-12d3-a456-426614174000'
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUID),
})

describe('SessionStore', () => {
  let sessionStore: typeof import('@/lib/salience/store/session-store').sessionStore

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    // Re-import to get fresh instance
    const module = await import('@/lib/salience/store/session-store')
    sessionStore = module.sessionStore
  })

  afterEach(async () => {
    // Clean up
    if (sessionStore) {
      await sessionStore.shutdown()
    }
  })

  describe('create', () => {
    it('creates a session with unique UUID', async () => {
      const session = await sessionStore.create('character_design', 'Test caption')

      expect(session.id).toBe(mockUUID)
    })

    it('initializes with correct default state', async () => {
      const session = await sessionStore.create('character_design')

      expect(session.state).toBe('initializing')
    })

    it('sets the mode correctly', async () => {
      const session = await sessionStore.create('assets')

      expect(session.mode).toBe('assets')
    })

    it('sets caption when provided', async () => {
      const session = await sessionStore.create('story_frames', 'My caption')

      expect(session.caption).toBe('My caption')
    })

    it('defaults caption to empty string', async () => {
      const session = await sessionStore.create('character_design')

      expect(session.caption).toBe('')
    })

    it('initializes preferences with default explorationRate', async () => {
      const session = await sessionStore.create('character_design')

      expect(session.preferences.explorationRate).toBe(0.3)
    })

    it('initializes with empty referenceUrls', async () => {
      const session = await sessionStore.create('character_design')

      expect(session.referenceUrls).toEqual([])
    })

    it('initializes with empty directions', async () => {
      const session = await sessionStore.create('character_design')

      expect(session.directions).toEqual([])
    })

    it('initializes salienceProfile as null', async () => {
      const session = await sessionStore.create('character_design')

      expect(session.salienceProfile).toBeNull()
    })

    it('sets createdAt and updatedAt timestamps', async () => {
      const before = new Date()
      const session = await sessionStore.create('character_design')
      const after = new Date()

      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })
  })

  describe('get', () => {
    it('returns null for non-existent session', async () => {
      const result = await sessionStore.get('non-existent-id')

      expect(result).toBeNull()
    })

    it('returns session after create', async () => {
      const created = await sessionStore.create('character_design')
      const retrieved = await sessionStore.get(created.id)

      expect(retrieved).toEqual(created)
    })
  })

  describe('update', () => {
    it('returns null for non-existent session', async () => {
      const result = await sessionStore.update('non-existent-id', { caption: 'test' })

      expect(result).toBeNull()
    })

    it('updates specified fields', async () => {
      const session = await sessionStore.create('character_design')
      const updated = await sessionStore.update(session.id, { caption: 'Updated caption' })

      expect(updated?.caption).toBe('Updated caption')
    })

    it('preserves non-updated fields', async () => {
      const session = await sessionStore.create('character_design', 'Original')
      await sessionStore.update(session.id, { state: 'analyzing' })
      const retrieved = await sessionStore.get(session.id)

      expect(retrieved?.caption).toBe('Original')
      expect(retrieved?.mode).toBe('character_design')
    })

    it('updates updatedAt timestamp', async () => {
      const session = await sessionStore.create('character_design')
      const originalUpdatedAt = session.updatedAt

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await sessionStore.update(session.id, { caption: 'test' })

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('delete', () => {
    it('returns false for non-existent session', async () => {
      const result = await sessionStore.delete('non-existent-id')

      expect(result).toBe(false)
    })

    it('returns true and removes session', async () => {
      const session = await sessionStore.create('character_design')
      const deleted = await sessionStore.delete(session.id)
      const retrieved = await sessionStore.get(session.id)

      expect(deleted).toBe(true)
      expect(retrieved).toBeNull()
    })
  })

  describe('list', () => {
    it('returns empty array when no sessions', async () => {
      const sessions = await sessionStore.list()

      expect(sessions).toEqual([])
    })

    it('returns all sessions', async () => {
      // Create multiple sessions with different UUIDs
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce('id-1')
        .mockReturnValueOnce('id-2')
        .mockReturnValueOnce('id-3')

      await sessionStore.create('character_design')
      await sessionStore.create('assets')
      await sessionStore.create('story_frames')

      const sessions = await sessionStore.list()

      expect(sessions).toHaveLength(3)
    })

    it('returns sessions sorted by createdAt descending', async () => {
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce('id-1')
        .mockReturnValueOnce('id-2')

      await sessionStore.create('character_design', 'First')
      await new Promise(resolve => setTimeout(resolve, 10))
      await sessionStore.create('assets', 'Second')

      const sessions = await sessionStore.list()

      expect(sessions[0].caption).toBe('Second')
      expect(sessions[1].caption).toBe('First')
    })
  })

  describe('setState', () => {
    it('updates session state', async () => {
      const session = await sessionStore.create('character_design')
      await sessionStore.setState(session.id, 'analyzing')
      const updated = await sessionStore.get(session.id)

      expect(updated?.state).toBe('analyzing')
    })
  })

  describe('setReferences', () => {
    it('sets reference URLs', async () => {
      const session = await sessionStore.create('character_design')
      const urls = ['http://example.com/1.jpg', 'http://example.com/2.jpg']

      await sessionStore.setReferences(session.id, urls)
      const updated = await sessionStore.get(session.id)

      expect(updated?.referenceUrls).toEqual(urls)
    })

    it('changes state to references_uploaded when urls provided', async () => {
      const session = await sessionStore.create('character_design')
      await sessionStore.setReferences(session.id, ['http://example.com/1.jpg'])
      const updated = await sessionStore.get(session.id)

      expect(updated?.state).toBe('references_uploaded')
    })

    it('does not change state when empty urls provided', async () => {
      const session = await sessionStore.create('character_design')
      await sessionStore.setState(session.id, 'analyzing')
      await sessionStore.setReferences(session.id, [])
      const updated = await sessionStore.get(session.id)

      expect(updated?.state).toBe('analyzing')
    })
  })

  describe('setDirections', () => {
    it('sets directions and changes state to directions_planned', async () => {
      const session = await sessionStore.create('character_design')
      const directions = [
        {
          id: 'dir-1',
          label: 'Test Direction',
          intent: 'Testing',
          vector: { push: { cinematic_scale: 0.5 }, pull: {}, styleTags: [], moodNotes: '' },
          promptSkeleton: 'Test prompt',
          nodes: [],
        },
      ]

      await sessionStore.setDirections(session.id, directions)
      const updated = await sessionStore.get(session.id)

      expect(updated?.directions).toEqual(directions)
      expect(updated?.state).toBe('directions_planned')
    })
  })

  describe('Node Operations', () => {
    const createSessionWithDirection = async () => {
      const session = await sessionStore.create('character_design')
      await sessionStore.setDirections(session.id, [
        {
          id: 'dir-1',
          label: 'Direction 1',
          intent: 'Test',
          vector: { push: {}, pull: {}, styleTags: [], moodNotes: '' },
          promptSkeleton: '',
          nodes: [],
        },
      ])
      return session
    }

    describe('addNode', () => {
      it('appends node to correct direction', async () => {
        const session = await createSessionWithDirection()
        const node = {
          id: 'node-1',
          depth: 1,
          status: 'pending' as const,
          prompt: 'Test prompt',
          outputUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await sessionStore.addNode(session.id, 'dir-1', node)
        const updated = await sessionStore.get(session.id)

        expect(updated?.directions[0].nodes).toHaveLength(1)
        expect(updated?.directions[0].nodes[0].id).toBe('node-1')
      })
    })

    describe('updateNode', () => {
      it('updates specified node', async () => {
        const session = await createSessionWithDirection()
        const node = {
          id: 'node-1',
          depth: 1,
          status: 'pending' as const,
          prompt: 'Test prompt',
          outputUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await sessionStore.addNode(session.id, 'dir-1', node)
        await sessionStore.updateNode(session.id, 'node-1', {
          status: 'complete',
          outputUrl: 'http://example.com/output.jpg',
        })

        const updated = await sessionStore.get(session.id)
        expect(updated?.directions[0].nodes[0].status).toBe('complete')
        expect(updated?.directions[0].nodes[0].outputUrl).toBe('http://example.com/output.jpg')
      })
    })

    describe('deleteNode', () => {
      it('removes node from direction', async () => {
        const session = await createSessionWithDirection()
        const node = {
          id: 'node-1',
          depth: 1,
          status: 'pending' as const,
          prompt: 'Test',
          outputUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await sessionStore.addNode(session.id, 'dir-1', node)
        await sessionStore.deleteNode(session.id, 'node-1')

        const updated = await sessionStore.get(session.id)
        expect(updated?.directions[0].nodes).toHaveLength(0)
      })
    })

    describe('getNode', () => {
      it('returns node if exists', async () => {
        const session = await createSessionWithDirection()
        const node = {
          id: 'node-1',
          depth: 1,
          status: 'pending' as const,
          prompt: 'Test',
          outputUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await sessionStore.addNode(session.id, 'dir-1', node)
        const retrieved = await sessionStore.getNode(session.id, 'node-1')

        expect(retrieved?.id).toBe('node-1')
      })

      it('returns null for non-existent node', async () => {
        const session = await createSessionWithDirection()
        const retrieved = await sessionStore.getNode(session.id, 'non-existent')

        expect(retrieved).toBeNull()
      })
    })

    describe('getDirection', () => {
      it('returns direction if exists', async () => {
        const session = await createSessionWithDirection()
        const direction = await sessionStore.getDirection(session.id, 'dir-1')

        expect(direction?.id).toBe('dir-1')
        expect(direction?.label).toBe('Direction 1')
      })

      it('returns null for non-existent direction', async () => {
        const session = await createSessionWithDirection()
        const direction = await sessionStore.getDirection(session.id, 'non-existent')

        expect(direction).toBeNull()
      })
    })
  })

  describe('Preference Updates', () => {
    it('updates preference weights', async () => {
      const session = await sessionStore.create('character_design')
      await sessionStore.updatePreferences(session.id, {
        weights: { cinematic_scale: 0.8 },
      })

      const updated = await sessionStore.get(session.id)
      expect(updated?.preferences.weights.cinematic_scale).toBe(0.8)
    })

    it('updates explorationRate', async () => {
      const session = await sessionStore.create('character_design')
      await sessionStore.updatePreferences(session.id, {
        explorationRate: 0.5,
      })

      const updated = await sessionStore.get(session.id)
      expect(updated?.preferences.explorationRate).toBe(0.5)
    })

    it('updates preferences.updatedAt', async () => {
      const session = await sessionStore.create('character_design')
      const originalUpdatedAt = session.preferences.updatedAt

      await new Promise(resolve => setTimeout(resolve, 10))
      await sessionStore.updatePreferences(session.id, { explorationRate: 0.5 })

      const updated = await sessionStore.get(session.id)
      expect(updated?.preferences.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })
})
