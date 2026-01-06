// Self-Exciting Generative Loop - Type Definitions

// =============================================================================
// CORE SESSION TYPES
// =============================================================================

export type SessionState =
  | 'initializing'
  | 'references_uploaded'
  | 'analyzing'
  | 'directions_planned'
  | 'generating'
  | 'idle'
  | 'error';

export type SessionMode =
  | 'character_design'
  | 'assets'
  | 'story_frames'
  | 'evolutionary_progress'
  | 'pm_flow';

export interface Session {
  id: string;
  mode: SessionMode;
  state: SessionState;
  referenceUrls: string[];
  caption: string;
  salienceProfile: SalienceProfile | null;
  directions: Direction[];
  preferences: PreferenceState;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// SALIENCE EXTRACTION
// =============================================================================

export interface SalienceAxis {
  name: string;           // e.g., "cinematic_scale", "color_temperature"
  weight: number;         // 0-1, how prominent this axis is
  value: number;          // 0-1, where the reference falls on this axis
  polarities: [string, string];  // e.g., ["cold", "warm"]
}

export interface SalienceProfile {
  axes: SalienceAxis[];
  styleTags: string[];       // ["cinematic", "epic", "moody"]
  avoidTags: string[];       // ["cute", "flat_lighting"]
  compositionNotes: string[];
  moodNotes: string[];
  colorNotes: string[];
  explanationShort: string;  // Max 220 chars
  extractedAt: Date;
}

// =============================================================================
// DIRECTIONS (Rays on the Star)
// =============================================================================

export interface AxisDelta {
  axis: string;    // Axis name
  strength: number; // 0-1
}

export interface DirectionVector {
  pushAxes: AxisDelta[];
  pullAxes: AxisDelta[];
  styleTags: string[];
  avoidTags: string[];
}

export interface PromptSkeleton {
  coreSubject: string;
  sceneComposition: string;
  styleAndMood: string;
  constraints: string[];
}

export interface Direction {
  id: string;
  index: number;               // 0-5 for 6 directions
  label: string;               // "Cinematic escalation" (max 28 chars)
  intent: string;              // One-line description (max 120 chars)
  vector: DirectionVector;
  promptSkeleton: PromptSkeleton;
  nodes: GenerationNode[];
  createdAt: Date;
}

// =============================================================================
// GENERATION NODES
// =============================================================================

export type NodeStatus = 'pending' | 'queued' | 'generating' | 'complete' | 'error';
export type MediaType = 'image' | 'video';
export type ModelType = 'gpt-image-1.5-2025-12-16' | 'sora-2-2025-10-06';

export interface PromptMeta {
  aspectRatio: string;        // "1:1", "16:9", etc.
  seed: number;
  styleStrength: number;      // 0-1
  guidance: number;           // 1-12
  duration?: number;          // Video only, 3-12 seconds
  fps?: number;               // Video only, 12-30
}

export interface GenerationNode {
  id: string;
  directionId: string;
  depth: number;              // 1-5
  status: NodeStatus;
  mediaType: MediaType;
  model: ModelType;
  prompt: string | null;
  promptMeta: PromptMeta | null;
  negative: string[];
  explanationShort: string | null;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  progress: number;           // 0-100
  streamingContent?: string;  // Partial content during generation
  error: string | null;
  isPinned: boolean;
  parentNodeId: string | null;
  salienceDelta: AxisDelta[]; // How this node shifted axes
  createdAt: Date;
  completedAt: Date | null;
}

// =============================================================================
// PREFERENCE LEARNING
// =============================================================================

export type UserActionType =
  | 'select_node'
  | 'duplicate_node'
  | 'pin_to_workspace'
  | 'reject_node'
  | 'continue_direction'
  | 'branch_node'
  | 'mutate_node';

export interface UserAction {
  id: string;
  sessionId: string;
  type: UserActionType;
  nodeId: string;
  payload?: Record<string, unknown>;
  timestamp: Date;
}

export interface PreferenceState {
  weights: Record<string, number>;  // axis name -> preference weight
  explorationRate: number;          // 0-1, how much to explore vs exploit
  styleAffinities: Record<string, number>;  // style tag -> affinity score
  updatedAt: Date;
}

// =============================================================================
// PROMPT COMPOSITION (LLM Agent Outputs)
// =============================================================================

export interface ContextPack {
  nodeTarget: {
    mediaType: MediaType;
    depth: number;
    maxDepth: number;
  };
  mode: SessionMode;
  direction: Direction;
  salienceProfile: SalienceProfile;
  parentNode: GenerationNode | null;
  preferenceState: PreferenceState | null;
  recentActions: UserAction[];
}

export interface PromptPackage {
  modelTarget: ModelType;
  prompt: string;
  negative: string[];
  params: PromptMeta;
  explanationShort: string;      // Max 200 chars
  salienceDelta: AxisDelta[];    // 2-6 axes with small deltas
  needsRevision: boolean;
  issues: string[];
}

export interface GatedPackage extends PromptPackage {
  approved: boolean;
  revised: boolean;
  gateIssues: string[];
}

// =============================================================================
// STREAMING & EVENTS
// =============================================================================

export type StreamEventType =
  | 'session_update'
  | 'salience_extracted'
  | 'directions_planned'
  | 'job_queued'
  | 'generation_progress'
  | 'generation_complete'
  | 'node_created'
  | 'error'
  | 'heartbeat';

export interface StreamEvent {
  type: StreamEventType;
  sessionId: string;
  timestamp: Date;
  payload: unknown;
}

export interface GenerationProgressPayload {
  nodeId: string;
  directionId: string;
  progress: number;
  stage: 'queued' | 'composing' | 'gating' | 'generating' | 'saving';
  message: string;
}

export interface GenerationCompletePayload {
  nodeId: string;
  directionId: string;
  outputUrl: string;
  thumbnailUrl: string | null;
  explanationShort: string;
}

// =============================================================================
// JOB QUEUE
// =============================================================================

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface QueuedJob {
  id: string;
  sessionId: string;
  nodeId: string;
  directionId: string;
  status: JobStatus;
  priority: number;           // Higher = process first
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

// =============================================================================
// STAR LAYOUT CONFIG
// =============================================================================

export interface StarLayoutConfig {
  numDirections: 5 | 6 | 7 | 8;
  maxDepth: number;           // Default: 5
  baseRadius: number;         // Distance from seed to depth 1
  radiusStep: number;         // Distance between depth levels
  nodeWidth: number;
  nodeHeight: number;
}

export const DEFAULT_STAR_CONFIG: StarLayoutConfig = {
  numDirections: 6,
  maxDepth: 5,
  baseRadius: 200,
  radiusStep: 180,
  nodeWidth: 280,
  nodeHeight: 200,
};

// =============================================================================
// NODE ACTIONS
// =============================================================================

export type NodeAction = 'push' | 'fork' | 'mutate' | 'pin' | 'prune';

export interface NodeActionConfig {
  action: NodeAction;
  label: string;           // Button text
  shortLabel: string;      // Tooltip text
  description: string;     // Self-exciting microcopy
  color: string;
}

export const NODE_ACTIONS: NodeActionConfig[] = [
  {
    action: 'push',
    label: 'Push',
    shortLabel: 'Continue',
    description: 'Push this vector',
    color: 'blue',
  },
  {
    action: 'fork',
    label: 'Fork',
    shortLabel: 'Branch',
    description: 'Fork a variant',
    color: 'purple',
  },
  {
    action: 'mutate',
    label: 'Mutate',
    shortLabel: 'Surprise',
    description: 'Surprise me (same vibe)',
    color: 'amber',
  },
  {
    action: 'pin',
    label: 'Pin',
    shortLabel: 'Anchor',
    description: 'Keep this as anchor',
    color: 'emerald',
  },
  {
    action: 'prune',
    label: 'Prune',
    shortLabel: 'Remove',
    description: 'Kill this branch',
    color: 'red',
  },
];

// =============================================================================
// GENERATING STATE MICROCOPY
// =============================================================================

export const GENERATING_MICROCOPY = [
  'Growing...',
  'Unfolding frame by frame...',
  'Locking in details...',
  'Crystallizing vision...',
  'Shaping the unknown...',
];

export const DIRECTION_MICROCOPY = {
  header: 'Pick a direction. Watch it evolve.',
  noPrompt: 'No prompt needed — just choose a vector.',
  eachRay: 'Each ray is a different worldline.',
  depthCap: 'Depth 5/5 reached. Branch from any node to continue.',
  bounded: 'Caps prevent runaway randomness.',
};
