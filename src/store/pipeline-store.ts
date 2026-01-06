// Pipeline Store - Zustand state management for Content Factory

import { create } from 'zustand';
import type {
  Project,
  PipelineStep,
  PipelineStepId,
  StepStatus,
  ContentIdeaData,
  ScriptData,
  SegmentsData,
  ImagePromptData,
  GeneratedImageData,
  GeneratedVideoData,
  ComposedVideoData,
  ThumbnailData,
  DistributionData,
  DistributionPlatform,
} from '@/types/pipeline';
import {
  createEmptyProject,
  STEP_ID_TO_KEY,
} from '@/types/pipeline';

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface PipelineStore {
  // Current project
  project: Project | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  activeStepId: PipelineStepId | null;
  isPanelOpen: boolean;

  // Project lifecycle
  createProject: (name: string) => Promise<string>;
  loadProject: (projectId: string) => Promise<void>;
  resetProject: () => void;
  setProject: (project: Project) => void;

  // UI actions
  setActiveStep: (stepId: PipelineStepId | null) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Step actions (trigger pipeline steps via API)
  submitContentIdea: (data: ContentIdeaData) => Promise<void>;
  generateScript: () => Promise<void>;
  generateSegments: () => Promise<void>;
  generateImagePrompts: () => Promise<void>;
  generateImages: () => Promise<void>;
  generateVideos: () => Promise<void>;
  composeVideo: (audioTrackId?: string) => Promise<void>;
  generateThumbnail: () => Promise<void>;
  distribute: (platforms: DistributionPlatform[]) => Promise<void>;
  retryStep: (stepId: PipelineStepId) => Promise<void>;

  // SSE update handlers (called from usePipelineStream hook)
  startStep: (stepId: PipelineStepId) => void;
  updateStepProgress: (stepId: PipelineStepId, progress: number, message?: string) => void;
  completeStep: <T>(stepId: PipelineStepId, data: T) => void;
  failStep: (stepId: PipelineStepId, error: string) => void;

  // Internal helpers
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateStep: <T>(stepId: PipelineStepId, updates: Partial<PipelineStep<T>>) => void;
}

// =============================================================================
// HELPER: Get project key from step ID
// =============================================================================

function getProjectKey(stepId: PipelineStepId): keyof Project {
  return STEP_ID_TO_KEY[stepId];
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  // Initial state
  project: null,
  isLoading: false,
  error: null,
  activeStepId: null,
  isPanelOpen: false,

  // =============================================================================
  // PROJECT LIFECYCLE
  // =============================================================================

  createProject: async (name: string): Promise<string> => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/pipeline/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();
      const project = createEmptyProject(data.id, name);

      set({
        project,
        isLoading: false,
        activeStepId: 'content_idea', // Start at first step
        isPanelOpen: true,
      });

      return data.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadProject: async (projectId: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/pipeline/project/${projectId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load project');
      }

      const data = await response.json();
      set({ project: data.project, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  resetProject: () => {
    set({
      project: null,
      activeStepId: null,
      isPanelOpen: false,
      error: null,
    });
  },

  setProject: (project: Project) => {
    set({ project });
  },

  // =============================================================================
  // UI ACTIONS
  // =============================================================================

  setActiveStep: (stepId: PipelineStepId | null) => {
    set({
      activeStepId: stepId,
      isPanelOpen: stepId !== null,
    });
  },

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  // =============================================================================
  // STEP ACTIONS (API Calls)
  // =============================================================================

  submitContentIdea: async (data: ContentIdeaData): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('content_idea');

    try {
      const response = await fetch(`/api/pipeline/project/${project.id}/step/content_idea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit content idea');
      }

      const result = await response.json();
      get().completeStep('content_idea', result.data);
    } catch (error) {
      get().failStep('content_idea', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  generateScript: async (): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('script_generation');

    // Trigger generation - SSE will provide progress updates
    const response = await fetch(`/api/pipeline/project/${project.id}/step/script_generation`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('script_generation', errorData.error || 'Failed to generate script');
      throw new Error(errorData.error || 'Failed to generate script');
    }
  },

  generateSegments: async (): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('segments');

    const response = await fetch(`/api/pipeline/project/${project.id}/step/segments`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('segments', errorData.error || 'Failed to generate segments');
      throw new Error(errorData.error || 'Failed to generate segments');
    }
  },

  generateImagePrompts: async (): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('image_prompts');

    const response = await fetch(`/api/pipeline/project/${project.id}/step/image_prompts`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('image_prompts', errorData.error || 'Failed to generate prompts');
      throw new Error(errorData.error || 'Failed to generate prompts');
    }
  },

  generateImages: async (): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('image_generation');

    const response = await fetch(`/api/pipeline/project/${project.id}/step/image_generation`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('image_generation', errorData.error || 'Failed to generate images');
      throw new Error(errorData.error || 'Failed to generate images');
    }
  },

  generateVideos: async (): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('video_generation');

    const response = await fetch(`/api/pipeline/project/${project.id}/step/video_generation`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('video_generation', errorData.error || 'Failed to generate videos');
      throw new Error(errorData.error || 'Failed to generate videos');
    }
  },

  composeVideo: async (audioTrackId?: string): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('video_composition');

    const response = await fetch(`/api/pipeline/project/${project.id}/step/video_composition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioTrackId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('video_composition', errorData.error || 'Failed to compose video');
      throw new Error(errorData.error || 'Failed to compose video');
    }
  },

  generateThumbnail: async (): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('thumbnail');

    const response = await fetch(`/api/pipeline/project/${project.id}/step/thumbnail`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('thumbnail', errorData.error || 'Failed to generate thumbnail');
      throw new Error(errorData.error || 'Failed to generate thumbnail');
    }
  },

  distribute: async (platforms: DistributionPlatform[]): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    get().startStep('distribution');

    const response = await fetch(`/api/pipeline/project/${project.id}/step/distribution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      get().failStep('distribution', errorData.error || 'Failed to distribute');
      throw new Error(errorData.error || 'Failed to distribute');
    }
  },

  retryStep: async (stepId: PipelineStepId): Promise<void> => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    // Reset step state
    get().updateStep(stepId, {
      status: 'pending',
      error: null,
      progress: 0,
    });

    // Re-trigger the appropriate action
    switch (stepId) {
      case 'script_generation':
        await get().generateScript();
        break;
      case 'segments':
        await get().generateSegments();
        break;
      case 'image_prompts':
        await get().generateImagePrompts();
        break;
      case 'image_generation':
        await get().generateImages();
        break;
      case 'video_generation':
        await get().generateVideos();
        break;
      case 'video_composition':
        await get().composeVideo();
        break;
      case 'thumbnail':
        await get().generateThumbnail();
        break;
      case 'distribution':
        await get().distribute([]);
        break;
      default:
        throw new Error(`Cannot retry step: ${stepId}`);
    }
  },

  // =============================================================================
  // SSE HANDLERS
  // =============================================================================

  startStep: (stepId: PipelineStepId) => {
    get().updateStep(stepId, {
      status: 'in_progress',
      progress: 0,
      error: null,
      startedAt: new Date(),
    });

    // Update project current step
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          currentStepId: stepId,
          status: 'in_progress',
          updatedAt: new Date(),
        },
      };
    });
  },

  updateStepProgress: (stepId: PipelineStepId, progress: number, _message?: string) => {
    get().updateStep(stepId, {
      progress: Math.min(99, Math.max(0, progress)), // Cap at 99 until complete
      status: 'in_progress',
    });
  },

  completeStep: <T>(stepId: PipelineStepId, data: T) => {
    get().updateStep<T>(stepId, {
      status: 'complete',
      progress: 100,
      data,
      completedAt: new Date(),
    });

    // Update project status
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date(),
        },
      };
    });
  },

  failStep: (stepId: PipelineStepId, error: string) => {
    set((state) => {
      if (!state.project) return state;

      const key = getProjectKey(stepId);
      const step = state.project[key] as PipelineStep<unknown>;

      return {
        project: {
          ...state.project,
          [key]: {
            ...step,
            status: 'error' as StepStatus,
            error,
            retryCount: step.retryCount + 1,
          },
          status: 'failed',
          updatedAt: new Date(),
        },
      };
    });
  },

  // =============================================================================
  // INTERNAL HELPERS
  // =============================================================================

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  updateStep: <T>(stepId: PipelineStepId, updates: Partial<PipelineStep<T>>) => {
    set((state) => {
      if (!state.project) return state;

      const key = getProjectKey(stepId);
      const step = state.project[key] as PipelineStep<unknown>;

      return {
        project: {
          ...state.project,
          [key]: { ...step, ...updates },
          updatedAt: new Date(),
        },
      };
    });
  },
}));

// =============================================================================
// SELECTORS (for optimized component renders)
// =============================================================================

export const selectProject = (state: PipelineStore) => state.project;
export const selectIsLoading = (state: PipelineStore) => state.isLoading;
export const selectError = (state: PipelineStore) => state.error;
export const selectActiveStepId = (state: PipelineStore) => state.activeStepId;
export const selectIsPanelOpen = (state: PipelineStore) => state.isPanelOpen;

export const selectStep = (stepId: PipelineStepId) => (state: PipelineStore) => {
  if (!state.project) return null;
  const key = getProjectKey(stepId);
  return state.project[key] as PipelineStep<unknown>;
};

export const selectActiveStep = (state: PipelineStore) => {
  if (!state.project || !state.activeStepId) return null;
  const key = getProjectKey(state.activeStepId);
  return state.project[key] as PipelineStep<unknown>;
};

export default usePipelineStore;
