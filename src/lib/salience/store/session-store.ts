// Server-side Session Store with In-Memory + File Backup
// This runs on the server and persists sessions to JSON files

import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import path from 'path';
import type {
  Session,
  SessionMode,
  SessionState,
  Direction,
  GenerationNode,
  SalienceProfile,
  PreferenceState,
  UserAction,
} from '@/types/salience';

// Directory for session JSON files
const DATA_DIR = path.join(process.cwd(), 'data', 'sessions');

// =============================================================================
// SESSION STORE CLASS
// =============================================================================

class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private dirty: Set<string> = new Set();
  private saveInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    // Lazy initialization - will be called on first access
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    await this.loadAll();

    // Start periodic save (every 30 seconds)
    this.saveInterval = setInterval(() => {
      this.flushDirty().catch(console.error);
    }, 30000);

    this.initialized = true;
  }

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  async create(mode: SessionMode, caption: string = ''): Promise<Session> {
    await this.ensureInitialized();

    const session: Session = {
      id: crypto.randomUUID(),
      mode,
      state: 'initializing',
      referenceUrls: [],
      caption,
      salienceProfile: null,
      directions: [],
      preferences: {
        weights: {},
        explorationRate: 0.3,
        styleAffinities: {},
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    this.dirty.add(session.id);

    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    await this.ensureInitialized();
    return this.sessions.get(sessionId) ?? null;
  }

  async update(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    await this.ensureInitialized();

    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updated: Session = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, updated);
    this.dirty.add(sessionId);

    return updated;
  }

  async delete(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    const exists = this.sessions.has(sessionId);
    if (!exists) return false;

    this.sessions.delete(sessionId);
    this.dirty.delete(sessionId);

    // Delete file
    try {
      const filePath = path.join(DATA_DIR, `${sessionId}.json`);
      await unlink(filePath);
    } catch {
      // File may not exist
    }

    return true;
  }

  async list(): Promise<Session[]> {
    await this.ensureInitialized();
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // =========================================================================
  // Session State Updates
  // =========================================================================

  async setState(sessionId: string, state: SessionState): Promise<Session | null> {
    return this.update(sessionId, { state });
  }

  async setReferences(sessionId: string, urls: string[]): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    return this.update(sessionId, {
      referenceUrls: urls,
      state: urls.length > 0 ? 'references_uploaded' : session.state,
    });
  }

  async setSalienceProfile(
    sessionId: string,
    profile: SalienceProfile
  ): Promise<Session | null> {
    return this.update(sessionId, { salienceProfile: profile });
  }

  async setDirections(sessionId: string, directions: Direction[]): Promise<Session | null> {
    return this.update(sessionId, {
      directions,
      state: 'directions_planned',
    });
  }

  // =========================================================================
  // Node Operations
  // =========================================================================

  async addNode(
    sessionId: string,
    directionId: string,
    node: GenerationNode
  ): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    const directions = session.directions.map((d) => {
      if (d.id === directionId) {
        return { ...d, nodes: [...d.nodes, node] };
      }
      return d;
    });

    return this.update(sessionId, { directions });
  }

  async updateNode(
    sessionId: string,
    nodeId: string,
    updates: Partial<GenerationNode>
  ): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    const directions = session.directions.map((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
    }));

    return this.update(sessionId, { directions });
  }

  async deleteNode(sessionId: string, nodeId: string): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    const directions = session.directions.map((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => n.id !== nodeId),
    }));

    return this.update(sessionId, { directions });
  }

  async getNode(sessionId: string, nodeId: string): Promise<GenerationNode | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    for (const direction of session.directions) {
      const node = direction.nodes.find((n) => n.id === nodeId);
      if (node) return node;
    }

    return null;
  }

  async getDirection(sessionId: string, directionId: string): Promise<Direction | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    return session.directions.find((d) => d.id === directionId) ?? null;
  }

  // =========================================================================
  // Preference Updates
  // =========================================================================

  async updatePreferences(
    sessionId: string,
    updates: Partial<PreferenceState>
  ): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    return this.update(sessionId, {
      preferences: {
        ...session.preferences,
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  // =========================================================================
  // Persistence
  // =========================================================================

  private async loadAll(): Promise<void> {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      const files = await readdir(DATA_DIR);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await readFile(path.join(DATA_DIR, file), 'utf-8');
            const session = JSON.parse(content, this.reviver) as Session;
            this.sessions.set(session.id, session);
          } catch (err) {
            console.error(`Failed to load session ${file}:`, err);
          }
        }
      }
    } catch {
      // Directory may not exist yet, that's ok
    }
  }

  private async flushDirty(): Promise<void> {
    if (this.dirty.size === 0) return;

    await mkdir(DATA_DIR, { recursive: true });

    const toFlush = Array.from(this.dirty);
    this.dirty.clear();

    for (const sessionId of toFlush) {
      const session = this.sessions.get(sessionId);
      if (session) {
        try {
          const filePath = path.join(DATA_DIR, `${sessionId}.json`);
          await writeFile(filePath, JSON.stringify(session, null, 2));
        } catch (err) {
          console.error(`Failed to save session ${sessionId}:`, err);
          // Re-add to dirty for next flush
          this.dirty.add(sessionId);
        }
      }
    }
  }

  // JSON reviver for Date objects
  private reviver(key: string, value: unknown): unknown {
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      return new Date(value);
    }
    return value;
  }

  // Flush on demand (for cleanup)
  async flush(): Promise<void> {
    await this.flushDirty();
  }

  // Cleanup on shutdown
  async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    await this.flushDirty();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

// Singleton - persists across API route invocations in the same process
export const sessionStore = new SessionStore();

export default sessionStore;
