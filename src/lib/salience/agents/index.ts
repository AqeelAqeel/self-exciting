// LLM Agent Callers for Self-Exciting Generative Loop
// Uses Gemini for analysis (salience extraction, direction planning)
// Uses OpenAI for generation (prompt composition, constraint gating)

import { callGemini } from '@/lib/gemini-client';
import { callAI } from '@/lib/ai-client';
import type {
  SalienceProfile,
  Direction,
  PromptPackage,
  GatedPackage,
  ContextPack,
} from '@/types/salience';
import {
  SALIENCE_EXTRACTOR_SYSTEM,
  DIRECTION_PLANNER_SYSTEM,
  PROMPT_COMPOSER_SYSTEM,
  CONSTRAINT_GATE_SYSTEM,
  buildSalienceExtractorMessage,
  buildDirectionPlannerMessage,
  buildPromptComposerMessage,
  buildConstraintGateMessage,
  type SalienceExtractorInput,
  type DirectionPlannerInput,
  type PromptComposerInput,
  type ConstraintGateInput,
} from './prompts';

// Model versions
const OPENAI_TEXT_MODEL = 'gpt-5.2-2025-12-11';

// =============================================================================
// SALIENCE EXTRACTOR (Uses Gemini with Vision)
// =============================================================================

interface SalienceExtractorResponse {
  salience_axes: Array<{
    name: string;
    weight: number;
    value: number;
    polarities: [string, string];
  }>;
  style_tags: string[];
  avoid_tags: string[];
  composition_notes: string[];
  mood_notes: string[];
  color_notes: string[];
  explanation_short: string;
  needs_revision: boolean;
  issues: string[];
}

export async function extractSalience(
  referenceUrls: string[],
  caption: string,
  mode: string,
  preferenceState?: Record<string, number> | null
): Promise<SalienceProfile> {
  const input: SalienceExtractorInput = {
    mode,
    userCaption: caption,
    referenceUrls,
    preferenceState,
  };

  // Use Gemini with vision for analyzing reference images
  const response = await callGemini({
    systemPrompt: SALIENCE_EXTRACTOR_SYSTEM,
    userMessage: buildSalienceExtractorMessage(input),
    images: referenceUrls, // Gemini will analyze these images
    maxTokens: 4096,
    temperature: 0.7,
  });

  const parsed = JSON.parse(response.content) as SalienceExtractorResponse;

  if (parsed.needs_revision) {
    throw new Error(`Salience extraction failed: ${parsed.issues.join('; ')}`);
  }

  return {
    axes: parsed.salience_axes.map((axis) => ({
      name: axis.name,
      weight: axis.weight,
      value: axis.value,
      polarities: axis.polarities,
    })),
    styleTags: parsed.style_tags,
    avoidTags: parsed.avoid_tags,
    compositionNotes: parsed.composition_notes,
    moodNotes: parsed.mood_notes,
    colorNotes: parsed.color_notes,
    explanationShort: parsed.explanation_short,
    extractedAt: new Date(),
  };
}

// =============================================================================
// DIRECTION PLANNER (Uses Gemini)
// =============================================================================

interface DirectionPlannerResponse {
  directions: Array<{
    index: number;
    label: string;
    intent: string;
    vector: {
      push_axes: Array<{ axis: string; strength: number }>;
      pull_axes: Array<{ axis: string; strength: number }>;
      style_tags: string[];
      avoid_tags: string[];
    };
    prompt_skeleton: {
      core_subject: string;
      scene_composition: string;
      style_and_mood: string;
      constraints: string[];
    };
  }>;
  ui_labels: {
    title: string;
    subtitle: string;
    hint: string;
  };
  needs_revision: boolean;
  issues: string[];
}

export async function planDirections(
  salienceProfile: SalienceProfile,
  n: number,
  mode: string
): Promise<Direction[]> {
  const input: DirectionPlannerInput = {
    n,
    mode,
    salienceProfile: {
      salience_axes: salienceProfile.axes.map((a) => ({
        name: a.name,
        weight: a.weight,
        value: a.value,
      })),
      style_tags: salienceProfile.styleTags,
      avoid_tags: salienceProfile.avoidTags,
    },
  };

  // Use Gemini for direction planning
  const response = await callGemini({
    systemPrompt: DIRECTION_PLANNER_SYSTEM,
    userMessage: buildDirectionPlannerMessage(input),
    maxTokens: 8192,
    temperature: 0.8,
  });

  const parsed = JSON.parse(response.content) as DirectionPlannerResponse;

  if (parsed.needs_revision) {
    throw new Error(`Direction planning failed: ${parsed.issues.join('; ')}`);
  }

  return parsed.directions.map((d) => ({
    id: crypto.randomUUID(),
    index: d.index,
    label: d.label,
    intent: d.intent,
    vector: {
      pushAxes: d.vector.push_axes.map((a) => ({ axis: a.axis, strength: a.strength })),
      pullAxes: d.vector.pull_axes.map((a) => ({ axis: a.axis, strength: a.strength })),
      styleTags: d.vector.style_tags,
      avoidTags: d.vector.avoid_tags,
    },
    promptSkeleton: {
      coreSubject: d.prompt_skeleton.core_subject,
      sceneComposition: d.prompt_skeleton.scene_composition,
      styleAndMood: d.prompt_skeleton.style_and_mood,
      constraints: d.prompt_skeleton.constraints,
    },
    nodes: [],
    createdAt: new Date(),
  }));
}

// =============================================================================
// PROMPT COMPOSER (Uses OpenAI gpt-5.2)
// =============================================================================

interface PromptComposerResponse {
  model_target: 'gpt-image-1.5-2025-12-16' | 'sora-2-2025-10-06';
  prompt: string;
  negative: string[];
  params: {
    aspect_ratio: string;
    seed: number;
    style_strength: number;
    guidance: number;
    duration_s: number;
    fps: number;
  };
  explanation_short: string;
  salience_delta: Array<{ axis: string; delta: number }>;
  needs_revision: boolean;
  issues: string[];
}

export async function composePrompt(contextPack: ContextPack): Promise<PromptPackage> {
  const input: PromptComposerInput = {
    nodeTarget: contextPack.nodeTarget,
    mode: contextPack.mode,
    direction: {
      label: contextPack.direction.label,
      vector: {
        push_axes: contextPack.direction.vector.pushAxes.map((a) => ({
          axis: a.axis,
          strength: a.strength,
        })),
        pull_axes: contextPack.direction.vector.pullAxes.map((a) => ({
          axis: a.axis,
          strength: a.strength,
        })),
        style_tags: contextPack.direction.vector.styleTags,
        avoid_tags: contextPack.direction.vector.avoidTags,
      },
      prompt_skeleton: {
        core_subject: contextPack.direction.promptSkeleton.coreSubject,
        scene_composition: contextPack.direction.promptSkeleton.sceneComposition,
        style_and_mood: contextPack.direction.promptSkeleton.styleAndMood,
        constraints: contextPack.direction.promptSkeleton.constraints,
      },
    },
    salienceProfile: {
      salience_axes: contextPack.salienceProfile.axes.map((a) => ({
        name: a.name,
        weight: a.weight,
        value: a.value,
      })),
      style_tags: contextPack.salienceProfile.styleTags,
      avoid_tags: contextPack.salienceProfile.avoidTags,
    },
    parentNode: contextPack.parentNode
      ? {
          prompt: contextPack.parentNode.prompt ?? '',
          promptMeta: (contextPack.parentNode.promptMeta ?? {}) as Record<string, unknown>,
        }
      : null,
    preferenceState: contextPack.preferenceState
      ? { weights: contextPack.preferenceState.weights }
      : null,
    recentActions: contextPack.recentActions.slice(-20).map((a) => ({
      type: a.type,
      nodeId: a.nodeId,
    })),
  };

  // Use OpenAI for prompt composition
  const response = await callAI(
    {
      messages: [
        { role: 'system', content: PROMPT_COMPOSER_SYSTEM },
        { role: 'user', content: buildPromptComposerMessage(input) },
      ],
      model: OPENAI_TEXT_MODEL,
      maxTokens: 4096,
      temperature: 0.7,
    },
    'openai'
  );

  const parsed = JSON.parse(response.content) as PromptComposerResponse;

  return {
    modelTarget: parsed.model_target,
    prompt: parsed.prompt,
    negative: parsed.negative,
    params: {
      aspectRatio: parsed.params.aspect_ratio,
      seed: parsed.params.seed,
      styleStrength: parsed.params.style_strength,
      guidance: parsed.params.guidance,
      duration: parsed.params.duration_s || undefined,
      fps: parsed.params.fps || undefined,
    },
    explanationShort: parsed.explanation_short,
    salienceDelta: parsed.salience_delta.map((d) => ({
      axis: d.axis,
      strength: d.delta,
    })),
    needsRevision: parsed.needs_revision,
    issues: parsed.issues,
  };
}

// =============================================================================
// CONSTRAINT GATE (Uses OpenAI gpt-5.2)
// =============================================================================

interface ConstraintGateResponse {
  approved: boolean;
  revised: {
    model_target: 'gpt-image-1.5-2025-12-16' | 'sora-2-2025-10-06';
    prompt: string;
    negative: string[];
    params: {
      aspect_ratio: string;
      seed: number;
      style_strength: number;
      guidance: number;
      duration_s: number;
      fps: number;
    };
  };
  issues: string[];
}

export async function gatePrompt(promptPackage: PromptPackage): Promise<GatedPackage> {
  const input: ConstraintGateInput = {
    modelTarget: promptPackage.modelTarget,
    prompt: promptPackage.prompt,
    negative: promptPackage.negative,
    params: {
      aspect_ratio: promptPackage.params.aspectRatio,
      seed: promptPackage.params.seed,
      style_strength: promptPackage.params.styleStrength,
      guidance: promptPackage.params.guidance,
      duration_s: promptPackage.params.duration ?? 0,
      fps: promptPackage.params.fps ?? 0,
    },
  };

  // Use OpenAI for constraint gating
  const response = await callAI(
    {
      messages: [
        { role: 'system', content: CONSTRAINT_GATE_SYSTEM },
        { role: 'user', content: buildConstraintGateMessage(input) },
      ],
      model: OPENAI_TEXT_MODEL,
      maxTokens: 2048,
      temperature: 0.3, // Lower temperature for validation
    },
    'openai'
  );

  const parsed = JSON.parse(response.content) as ConstraintGateResponse;

  // If approved, return the original with gate metadata
  // If not approved, return the revised version
  const finalPackage = parsed.approved
    ? promptPackage
    : {
        ...promptPackage,
        modelTarget: parsed.revised.model_target,
        prompt: parsed.revised.prompt,
        negative: parsed.revised.negative,
        params: {
          aspectRatio: parsed.revised.params.aspect_ratio,
          seed: parsed.revised.params.seed,
          styleStrength: parsed.revised.params.style_strength,
          guidance: parsed.revised.params.guidance,
          duration: parsed.revised.params.duration_s || undefined,
          fps: parsed.revised.params.fps || undefined,
        },
      };

  return {
    ...finalPackage,
    approved: parsed.approved,
    revised: !parsed.approved,
    gateIssues: parsed.issues,
  };
}

// =============================================================================
// AGENT ORCHESTRATOR
// =============================================================================

export interface AgentOrchestrator {
  extractSalience: typeof extractSalience;
  planDirections: typeof planDirections;
  composePrompt: typeof composePrompt;
  gatePrompt: typeof gatePrompt;
}

export const agents: AgentOrchestrator = {
  extractSalience,
  planDirections,
  composePrompt,
  gatePrompt,
};

export default agents;
