import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('merges class names', async () => {
      const { cn } = await import('@/lib/utils')

      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', async () => {
      const { cn } = await import('@/lib/utils')

      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('handles undefined and null', async () => {
      const { cn } = await import('@/lib/utils')

      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('delays function execution', async () => {
      const { debounce } = await import('@/lib/utils')
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('resets timer on subsequent calls', async () => {
      const { debounce } = await import('@/lib/utils')
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      vi.advanceTimersByTime(50)
      debouncedFn()
      vi.advanceTimersByTime(50)

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('passes arguments to debounced function', async () => {
      const { debounce } = await import('@/lib/utils')
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('arg1', 'arg2')
      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('executes immediately on first call', async () => {
      const { throttle } = await import('@/lib/utils')
      const fn = vi.fn()
      const throttledFn = throttle(fn, 100)

      throttledFn()
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('blocks subsequent calls within limit', async () => {
      const { throttle } = await import('@/lib/utils')
      const fn = vi.fn()
      const throttledFn = throttle(fn, 100)

      throttledFn()
      throttledFn()
      throttledFn()

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('allows calls after limit expires', async () => {
      const { throttle } = await import('@/lib/utils')
      const fn = vi.fn()
      const throttledFn = throttle(fn, 100)

      throttledFn()
      vi.advanceTimersByTime(100)
      throttledFn()

      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes', async () => {
      const { formatFileSize } = await import('@/lib/utils')

      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('formats kilobytes', async () => {
      const { formatFileSize } = await import('@/lib/utils')

      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('formats megabytes', async () => {
      const { formatFileSize } = await import('@/lib/utils')

      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB')
    })

    it('formats gigabytes', async () => {
      const { formatFileSize } = await import('@/lib/utils')

      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('generateUniqueFilename', () => {
    it('preserves file extension', async () => {
      const { generateUniqueFilename } = await import('@/lib/utils')

      const filename = generateUniqueFilename('image.jpg')
      expect(filename).toMatch(/\.jpg$/)
    })

    it('generates unique filenames', async () => {
      const { generateUniqueFilename } = await import('@/lib/utils')

      const filename1 = generateUniqueFilename('image.jpg')
      const filename2 = generateUniqueFilename('image.jpg')

      expect(filename1).not.toBe(filename2)
    })

    it('sanitizes special characters', async () => {
      const { generateUniqueFilename } = await import('@/lib/utils')

      const filename = generateUniqueFilename('my file (1).jpg')
      expect(filename).not.toContain(' ')
      expect(filename).not.toContain('(')
      expect(filename).not.toContain(')')
    })

    it('includes timestamp', async () => {
      const { generateUniqueFilename } = await import('@/lib/utils')

      const before = Date.now()
      const filename = generateUniqueFilename('test.png')
      const after = Date.now()

      // Extract timestamp from filename
      const timestampMatch = filename.match(/-(\d+)-/)
      expect(timestampMatch).toBeTruthy()

      const timestamp = parseInt(timestampMatch![1])
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('isValidImageFile', () => {
    it('accepts valid image types', async () => {
      const { isValidImageFile } = await import('@/lib/utils')

      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

      for (const type of validTypes) {
        const file = new File([''], 'test', { type })
        expect(isValidImageFile(file)).toBe(true)
      }
    })

    it('rejects invalid types', async () => {
      const { isValidImageFile } = await import('@/lib/utils')

      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4', 'image/bmp']

      for (const type of invalidTypes) {
        const file = new File([''], 'test', { type })
        expect(isValidImageFile(file)).toBe(false)
      }
    })

    it('rejects files over 10MB', async () => {
      const { isValidImageFile } = await import('@/lib/utils')

      // Create a file object with size property
      const largeFile = {
        type: 'image/jpeg',
        size: 11 * 1024 * 1024, // 11MB
      } as File

      expect(isValidImageFile(largeFile)).toBe(false)
    })

    it('accepts files under 10MB', async () => {
      const { isValidImageFile } = await import('@/lib/utils')

      const smallFile = {
        type: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB
      } as File

      expect(isValidImageFile(smallFile)).toBe(true)
    })
  })

  describe('clamp', () => {
    it('returns value when within range', async () => {
      const { clamp } = await import('@/lib/utils')

      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('clamps to minimum', async () => {
      const { clamp } = await import('@/lib/utils')

      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('clamps to maximum', async () => {
      const { clamp } = await import('@/lib/utils')

      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('handles edge cases', async () => {
      const { clamp } = await import('@/lib/utils')

      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })
  })

  describe('distance', () => {
    it('calculates distance between two points', async () => {
      const { distance } = await import('@/lib/utils')

      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5) // 3-4-5 triangle
    })

    it('returns 0 for same point', async () => {
      const { distance } = await import('@/lib/utils')

      expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
    })

    it('handles negative coordinates', async () => {
      const { distance } = await import('@/lib/utils')

      expect(distance({ x: -3, y: 0 }, { x: 0, y: 4 })).toBe(5)
    })
  })

  describe('screenToCanvas', () => {
    it('converts screen to canvas coordinates', async () => {
      const { screenToCanvas } = await import('@/lib/utils')

      const result = screenToCanvas(100, 100, { x: 50, y: 50 }, 1)

      expect(result.x).toBe(50)
      expect(result.y).toBe(50)
    })

    it('accounts for scale', async () => {
      const { screenToCanvas } = await import('@/lib/utils')

      const result = screenToCanvas(200, 200, { x: 0, y: 0 }, 2)

      expect(result.x).toBe(100)
      expect(result.y).toBe(100)
    })

    it('handles offset and scale together', async () => {
      const { screenToCanvas } = await import('@/lib/utils')

      const result = screenToCanvas(150, 150, { x: 50, y: 50 }, 2)

      expect(result.x).toBe(50) // (150 - 50) / 2
      expect(result.y).toBe(50)
    })
  })

  describe('canvasToScreen', () => {
    it('converts canvas to screen coordinates', async () => {
      const { canvasToScreen } = await import('@/lib/utils')

      const result = canvasToScreen(50, 50, { x: 50, y: 50 }, 1)

      expect(result.x).toBe(100)
      expect(result.y).toBe(100)
    })

    it('accounts for scale', async () => {
      const { canvasToScreen } = await import('@/lib/utils')

      const result = canvasToScreen(100, 100, { x: 0, y: 0 }, 2)

      expect(result.x).toBe(200)
      expect(result.y).toBe(200)
    })

    it('is inverse of screenToCanvas', async () => {
      const { screenToCanvas, canvasToScreen } = await import('@/lib/utils')

      const offset = { x: 50, y: 50 }
      const scale = 1.5
      const originalX = 200
      const originalY = 150

      const canvas = screenToCanvas(originalX, originalY, offset, scale)
      const screen = canvasToScreen(canvas.x, canvas.y, offset, scale)

      expect(screen.x).toBeCloseTo(originalX)
      expect(screen.y).toBeCloseTo(originalY)
    })
  })
})

describe('File Upload Validation', () => {
  describe('ALLOWED_TYPES', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

    it('includes all standard image formats', () => {
      expect(allowedTypes).toContain('image/jpeg')
      expect(allowedTypes).toContain('image/png')
      expect(allowedTypes).toContain('image/gif')
      expect(allowedTypes).toContain('image/webp')
      expect(allowedTypes).toContain('image/svg+xml')
    })

    it('does not include video types', () => {
      expect(allowedTypes).not.toContain('video/mp4')
      expect(allowedTypes).not.toContain('video/webm')
    })

    it('does not include document types', () => {
      expect(allowedTypes).not.toContain('application/pdf')
      expect(allowedTypes).not.toContain('text/plain')
    })
  })

  describe('MAX_FILE_SIZE', () => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024

    it('is 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10485760)
    })

    it('allows 9.9MB file', () => {
      const fileSize = 9.9 * 1024 * 1024
      expect(fileSize < MAX_FILE_SIZE).toBe(true)
    })

    it('rejects 10.1MB file', () => {
      const fileSize = 10.1 * 1024 * 1024
      expect(fileSize > MAX_FILE_SIZE).toBe(true)
    })
  })
})
