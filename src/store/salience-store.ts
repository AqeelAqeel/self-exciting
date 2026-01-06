// Frontend Zustand Store for Self-Exciting Generative Loop
// Manages session state, directions, nodes, and UI interactions

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Session,
  SessionMode,
  SessionState,
  Direction,
  GenerationNode,
  SalienceProfile,
  PreferenceState,
  NodeAction,
  StarLayoutConfig,
  DEFAULT_STAR_CONFIG,
} from '@/types/salience';

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface SalienceStore {
  // Session state
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // Layout config
  layoutConfig: StarLayoutConfig;
  setLayoutConfig: (config: Partial<StarLayoutConfig>) => void;

  // Active selection
  activeDirectionIndex: number | null;
  activeNodeId: string | null;
  setActiveDirection: (index: number | null) => void;
  setActiveNode: (id: string | null) => void;

  // Reference management (before session creation)
  pendingReferences: File[];
  pendingCaption: string;
  addPendingReference: (file: File) => void;
  removePendingReference: (index: number) => void;
  setPendingCaption: (caption: string) => void;
  clearPendingReferences: () => void;

  // Session lifecycle
  createSession: (mode: SessionMode) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  resetSession: () => void;

  // Analysis flow
  uploadReferences: () => Promise<void>;
  analyzeReferences: () => Promise<void>;

  // Node operations
  continueDirection: (directionId: string) => Promise<string | null>;
  branchNode: (nodeId: string) => Promise<string | null>;
  mutateNode: (nodeId: string) => Promise<string | null>;
  pinNode: (nodeId: string) => void;
  pruneNode: (nodeId: string) => void;
  handleNodeAction: (nodeId: string, action: NodeAction) => void;

  // Streaming updates (called from SSE hook)
  updateNodeProgress: (nodeId: string, progress: number, message?: string) => void;
  completeNode: (nodeId: string, outputUrl: string, explanation: string) => void;
  failNode: (nodeId: string, error: string) => void;

  // Internal state updates
  setSession: (session: Session) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateDirection: (directionId: string, updates: Partial<Direction>) => void;
  updateNode: (nodeId: string, updates: Partial<GenerationNode>) => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_LAYOUT_CONFIG: StarLayoutConfig = {
  numDirections: 6,
  maxDepth: 5,
  baseRadius: 200,
  radiusStep: 180,
  nodeWidth: 280,
  nodeHeight: 200,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useSalienceStore = create<SalienceStore>((set, get) => ({
  // Initial state
  session: null,
  isLoading: false,
  error: null,
  layoutConfig: DEFAULT_LAYOUT_CONFIG,
  activeDirectionIndex: null,
  activeNodeId: null,
  pendingReferences: [],
  pendingCaption: '',

  // Layout config
  setLayoutConfig: (config) =>
    set((state) => ({
      layoutConfig: { ...state.layoutConfig, ...config },
    })),

  // Active selection
  setActiveDirection: (index) => set({ activeDirectionIndex: index }),
  setActiveNode: (id) => set({ activeNodeId: id }),

  // Pending references
  addPendingReference: (file) =>
    set((state) => ({
      pendingReferences: [...state.pendingReferences, file],
    })),

  removePendingReference: (index) =>
    set((state) => ({
      pendingReferences: state.pendingReferences.filter((_, i) => i !== index),
    })),

  setPendingCaption: (caption) => set({ pendingCaption: caption }),

  clearPendingReferences: () =>
    set({ pendingReferences: [], pendingCaption: '' }),

  // Session lifecycle
  createSession: async (mode) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/salience/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, caption: get().pendingCaption }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const data = await response.json();
      set({ session: data.session, isLoading: false });
      return data.sessionId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadSession: async (sessionId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/salience/session/${sessionId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load session');
      }

      const data = await response.json();
      set({ session: data.session, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  resetSession: () =>
    set({
      session: null,
      activeDirectionIndex: null,
      activeNodeId: null,
      pendingReferences: [],
      pendingCaption: '',
      error: null,
    }),

  // Upload references
  uploadReferences: async () => {
    const { session, pendingReferences } = get();
    if (!session || pendingReferences.length === 0) return;

    set({ isLoading: true, error: null });

    try {
      const uploadedUrls: string[] = [];

      for (const file of pendingReferences) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        if (data.success && data.url) {
          uploadedUrls.push(data.url);
        }
      }

      // Update session with reference URLs
      const updateResponse = await fetch(
        `/api/salience/session/${session.id}/references`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: uploadedUrls }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update session references');
      }

      const data = await updateResponse.json();
      set({
        session: data.session,
        pendingReferences: [],
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Analyze references
  analyzeReferences: async () => {
    const { session } = get();
    if (!session) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(
        `/api/salience/session/${session.id}/analyze`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await response.json();
      set({ session: data.session, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Node operations
  continueDirection: async (directionId) => {
    const { session } = get();
    if (!session) return null;

    const direction = session.directions.find((d) => d.id === directionId);
    if (!direction) return null;

    const depth = direction.nodes.length + 1;
    if (depth > get().layoutConfig.maxDepth) return null;

    set({ isLoading: true });

    try {
      const parentNodeId =
        direction.nodes.length > 0
          ? direction.nodes[direction.nodes.length - 1].id
          : null;

      const response = await fetch(
        `/api/salience/session/${session.id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directionId,
            parentNodeId,
            mediaType: 'image',
            depth,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      set({ isLoading: false });
      return data.nodeId;
    } catch (error) {
      set({ isLoading: false, error: 'Generation failed' });
      return null;
    }
  },

  branchNode: async (nodeId) => {
    // Branch creates a new direction from this node
    // For now, just continue in the same direction
    const { session } = get();
    if (!session) return null;

    // Find the direction containing this node
    for (const direction of session.directions) {
      if (direction.nodes.some((n) => n.id === nodeId)) {
        return get().continueDirection(direction.id);
      }
    }

    return null;
  },

  mutateNode: async (nodeId) => {
    // Mutate regenerates with randomness
    // For now, same as branch
    return get().branchNode(nodeId);
  },

  pinNode: (nodeId) => {
    get().updateNode(nodeId, { isPinned: true });
  },

  pruneNode: (nodeId) => {
    const { session } = get();
    if (!session) return;

    const directions = session.directions.map((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => n.id !== nodeId),
    }));

    set({
      session: { ...session, directions },
      activeNodeId: get().activeNodeId === nodeId ? null : get().activeNodeId,
    });
  },

  handleNodeAction: (nodeId, action) => {
    switch (action) {
      case 'push':
        // Find direction and continue
        const { session } = get();
        if (session) {
          for (const direction of session.directions) {
            if (direction.nodes.some((n) => n.id === nodeId)) {
              get().continueDirection(direction.id);
              break;
            }
          }
        }
        break;
      case 'fork':
        get().branchNode(nodeId);
        break;
      case 'mutate':
        get().mutateNode(nodeId);
        break;
      case 'pin':
        const node = get().session?.directions
          .flatMap((d) => d.nodes)
          .find((n) => n.id === nodeId);
        if (node) {
          get().updateNode(nodeId, { isPinned: !node.isPinned });
        }
        break;
      case 'prune':
        get().pruneNode(nodeId);
        break;
    }
  },

  // Streaming updates
  updateNodeProgress: (nodeId, progress, message) => {
    get().updateNode(nodeId, {
      progress,
      status: 'generating',
      streamingContent: message,
    });
  },

  completeNode: (nodeId, outputUrl, explanation) => {
    get().updateNode(nodeId, {
      status: 'complete',
      outputUrl,
      explanationShort: explanation,
      progress: 100,
      completedAt: new Date(),
    });
  },

  failNode: (nodeId, error) => {
    get().updateNode(nodeId, {
      status: 'error',
      error,
      progress: 0,
    });
  },

  // Internal state updates
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  updateDirection: (directionId, updates) =>
    set((state) => {
      if (!state.session) return state;

      const directions = state.session.directions.map((d) =>
        d.id === directionId ? { ...d, ...updates } : d
      );

      return {
        session: { ...state.session, directions },
      };
    }),

  updateNode: (nodeId, updates) =>
    set((state) => {
      if (!state.session) return state;

      const directions = state.session.directions.map((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      }));

      return {
        session: { ...state.session, directions },
      };
    }),
}));

// =============================================================================
// WORKSPACE STORE (for pinned nodes)
// =============================================================================

interface WorkspaceStore {
  pinnedNodes: GenerationNode[];
  addNode: (node: GenerationNode) => void;
  removeNode: (nodeId: string) => void;
  clearAll: () => void;
  reorderNodes: (fromIndex: number, toIndex: number) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  pinnedNodes: [],

  addNode: (node) =>
    set((state) => {
      // Avoid duplicates
      if (state.pinnedNodes.some((n) => n.id === node.id)) {
        return state;
      }
      return { pinnedNodes: [...state.pinnedNodes, node] };
    }),

  removeNode: (nodeId) =>
    set((state) => ({
      pinnedNodes: state.pinnedNodes.filter((n) => n.id !== nodeId),
    })),

  clearAll: () => set({ pinnedNodes: [] }),

  reorderNodes: (fromIndex, toIndex) =>
    set((state) => {
      const nodes = [...state.pinnedNodes];
      const [removed] = nodes.splice(fromIndex, 1);
      nodes.splice(toIndex, 0, removed);
      return { pinnedNodes: nodes };
    }),
}));

export default useSalienceStore;
