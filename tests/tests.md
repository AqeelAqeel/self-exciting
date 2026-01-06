# Test Documentation

This document outlines expected behaviors for the Self-Exciting Generative Loop application's core functions, API routes, and database operations.

## Test Setup

```bash
npm install          # Install dependencies including vitest
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run with coverage report
```

## Architecture Overview

The app has two main systems:
1. **Pipeline System** - Content factory with Supabase persistence
2. **Salience System** - In-memory session store with JSON file backup

---

## 1. Supabase Client (`src/lib/pipeline/supabase-client.ts`)

### Expected Behaviors

| Function | Behavior | Error Conditions |
|----------|----------|------------------|
| `createBrowserClient()` | Returns Supabase client using anon key | Throws if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` missing |
| `createServerClient()` | Returns Supabase client with service key (or falls back to anon) | Throws if URL missing; throws if no key available |
| `getServerClient()` | Returns singleton instance; creates on first call | Same as `createServerClient()` |

### Test Cases

- [ ] `createBrowserClient` throws when URL missing
- [ ] `createBrowserClient` throws when anon key missing
- [ ] `createBrowserClient` returns valid client with proper env vars
- [ ] `createServerClient` falls back to anon key when service key missing
- [ ] `createServerClient` throws when no keys available
- [ ] `getServerClient` returns same instance on multiple calls (singleton)

---

## 2. Session Store (`src/lib/salience/store/session-store.ts`)

### Expected Behaviors

| Method | Input | Output | Side Effects |
|--------|-------|--------|--------------|
| `create(mode, caption)` | SessionMode, string | Session object | Marks dirty, adds to map |
| `get(sessionId)` | string | Session \| null | None |
| `update(sessionId, updates)` | string, Partial<Session> | Session \| null | Marks dirty, updates timestamp |
| `delete(sessionId)` | string | boolean | Removes from map, deletes file |
| `list()` | - | Session[] | None (sorted by createdAt desc) |
| `setState(sessionId, state)` | string, SessionState | Session \| null | Updates state field |
| `setReferences(sessionId, urls)` | string, string[] | Session \| null | Updates refs + state |
| `addNode(sessionId, directionId, node)` | ... | Session \| null | Appends node to direction |
| `updateNode(sessionId, nodeId, updates)` | ... | Session \| null | Patches node |
| `deleteNode(sessionId, nodeId)` | ... | Session \| null | Removes node |
| `flush()` | - | void | Writes dirty sessions to disk |

### Test Cases

- [ ] `create` generates unique UUID
- [ ] `create` initializes with correct default state ('initializing')
- [ ] `create` sets preferences with default explorationRate (0.3)
- [ ] `get` returns null for non-existent session
- [ ] `get` returns session after create
- [ ] `update` returns null for non-existent session
- [ ] `update` updates `updatedAt` timestamp
- [ ] `delete` returns false for non-existent session
- [ ] `delete` returns true and removes from map
- [ ] `list` returns sessions sorted by createdAt descending
- [ ] `setReferences` changes state to 'references_uploaded' when urls provided
- [ ] `addNode` appends to correct direction
- [ ] `updateNode` only updates specified node
- [ ] `deleteNode` removes node from direction
- [ ] `flush` writes dirty sessions to JSON files
- [ ] Session loaded from disk has Date objects (not strings)

---

## 3. Pipeline API Routes

### POST `/api/pipeline/project`

| Scenario | Request Body | Response | Status |
|----------|--------------|----------|--------|
| Valid | `{ name: "Test" }` | `{ id, name, status }` | 200 |
| Missing name | `{}` | `{ error: "Project name is required" }` | 400 |
| DB error | - | `{ error: "Failed to create project" }` | 500 |

### GET `/api/pipeline/project`

| Scenario | Response | Status |
|----------|----------|--------|
| Success | `{ projects: [...] }` | 200 |
| Empty | `{ projects: [] }` | 200 |
| DB error | `{ error: "Failed to list projects" }` | 500 |

### GET `/api/pipeline/project/[projectId]`

| Scenario | Response | Status |
|----------|----------|--------|
| Found | `{ project: {...} }` | 200 |
| Not found | `{ error: "Project not found" }` | 404 |
| Invalid ID | `{ error: "Project not found" }` | 404 |

### DELETE `/api/pipeline/project/[projectId]`

| Scenario | Response | Status |
|----------|----------|--------|
| Success | `{ success: true }` | 200 |
| Not found | `{ success: true }` | 200 (Supabase doesn't error) |
| DB error | `{ error: "Failed to delete project" }` | 500 |

### POST `/api/pipeline/project/[projectId]/step/[stepId]`

| Step ID | Expected Fields | Upsert Conflict |
|---------|-----------------|-----------------|
| `content_idea` | topic, niche, style, target_platform... | `project_id` |
| `script` | title, hook, body, cta, full_text... | `project_id` |
| `segments` | segments array with index, narration... | `project_id, segment_index` |
| `image_prompts` | prompts array with prompt, segment_id... | `segment_id` |
| `image_generation` | segment_id, storage_url... | `segment_id` |
| `video_generation` | segment_id, fal_request_id... | `segment_id` |
| `video_composition` | storage_url, duration, resolution... | `project_id` |
| `thumbnail` | storage_url, style, main_text... | `project_id` |
| `distribution` | platform, caption, hashtags... | `project_id, platform` |

---

## 4. Salience Session API Routes

### POST `/api/salience/session`

| Scenario | Request | Response | Status |
|----------|---------|----------|--------|
| Valid | `{ mode: "character_design" }` | Session object | 200 |
| With caption | `{ mode: "assets", caption: "test" }` | Session with caption | 200 |
| Invalid mode | `{ mode: "invalid" }` | Validation error | 400 |

### GET `/api/salience/session`

| Scenario | Response | Status |
|----------|----------|--------|
| Has sessions | `{ sessions: [...] }` | 200 |
| Empty | `{ sessions: [] }` | 200 |

### GET `/api/salience/session/[sessionId]`

| Scenario | Response | Status |
|----------|----------|--------|
| Found | Session object | 200 |
| Not found | `{ error: "Session not found" }` | 404 |

### POST `/api/salience/session/[sessionId]/references`

| Scenario | Request | Response | Status |
|----------|---------|----------|--------|
| Add URLs | `{ urls: ["http://..."] }` | Updated session | 200 |
| Empty URLs | `{ urls: [] }` | Session (state unchanged) | 200 |
| Not found | - | Error | 404 |

### POST `/api/salience/session/[sessionId]/analyze`

| Scenario | Response | Status |
|----------|----------|--------|
| Success | Session with profile + directions | 200 |
| No references | Error | 400 |
| AI failure | Error | 500 |

### POST `/api/salience/session/[sessionId]/generate`

| Scenario | Request | Response | Status |
|----------|---------|----------|--------|
| Valid | `{ directionId, depth }` | Generation node | 200 |
| Invalid direction | - | Error | 400 |
| Max depth exceeded | - | Error | 400 |

---

## 5. File Upload (`/api/upload`)

### POST (Single file)

| Scenario | Response | Status |
|----------|----------|--------|
| Valid image | `{ url: "/uploads/..." }` | 200 |
| Too large (>10MB) | Error | 400 |
| Invalid type | Error | 400 |
| No file | Error | 400 |

### PUT (Multiple files)

| Scenario | Response | Status |
|----------|----------|--------|
| Valid images | `{ urls: [...] }` | 200 |
| Mixed valid/invalid | Partial success or error | 400/200 |

### Allowed Types
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

---

## 6. Database Schema Constraints

### Projects Table

| Field | Constraint |
|-------|------------|
| `id` | UUID, primary key |
| `name` | NOT NULL |
| `status` | ENUM: draft, in_progress, completed, failed, archived |

### Content Ideas Table

| Field | Constraint |
|-------|------------|
| `project_id` | FK to projects, UNIQUE |
| `style` | ENUM: educational, entertainment, viral, storytelling |
| `target_platform` | ENUM: tiktok, youtube_shorts, instagram_reels, youtube |
| `target_duration` | INTEGER, default 45 |

### Segments Table

| Field | Constraint |
|-------|------------|
| `(project_id, segment_index)` | UNIQUE |
| `duration` | DECIMAL(4,1), default 5.0 |
| `position` | NOT NULL |

### Distributions Table

| Field | Constraint |
|-------|------------|
| `platform` | ENUM: tiktok, instagram, youtube, facebook, twitter, linkedin, threads, bluesky |
| `status` | ENUM: pending, uploading, published, scheduled, failed |

---

## 7. External Integrations

### PostBridge Client (`src/lib/pipeline/postbridge-client.ts`)

| Method | Expected Behavior |
|--------|-------------------|
| `listAccounts()` | Returns array of connected social accounts |
| `createUploadUrl()` | Returns presigned URL for media upload |
| `uploadMedia(file)` | Uploads to presigned URL, returns media_id |
| `createPost(mediaId, caption, platforms)` | Creates post, returns post_id |
| `getPost(postId)` | Returns post status and platform results |

### FAL API (Video Generation)

| Field | Purpose |
|-------|---------|
| `fal_request_id` | Track async video generation job |
| `fal_status` | Current job status (queued, processing, complete, error) |

---

## 8. Event Streaming (SSE)

### `/api/pipeline/project/[projectId]/stream`

| Event Type | Payload |
|------------|---------|
| `connected` | `{ projectId }` |
| `step_started` | `{ stepId, timestamp }` |
| `step_progress` | `{ stepId, progress: 0-100 }` |
| `step_complete` | `{ stepId, data }` |
| `step_error` | `{ stepId, error }` |
| `project_update` | `{ status }` |
| `heartbeat` | `{}` (every 30s) |

### `/api/salience/session/[sessionId]/stream`

| Event Type | Payload |
|------------|---------|
| `connected` | `{ sessionId }` |
| `generation_started` | `{ nodeId, directionId }` |
| `generation_progress` | `{ nodeId, progress }` |
| `generation_complete` | `{ nodeId, outputUrl }` |
| `generation_error` | `{ nodeId, error }` |

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/supabase-client.test.ts

# Run with coverage
npm run test:coverage

# Run in CI mode (no watch)
npm run test:run
```

## Mocking Strategy

- **Supabase**: Mock `@supabase/supabase-js` createClient
- **File System**: Mock `fs/promises` for session store
- **Fetch**: Mock global fetch for external APIs
- **Environment**: Set test env vars in `vitest.config.ts` or per-test
