'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, ImagePromptData } from '@/types/pipeline';

interface ImagePromptsStepProps {
  project: Project;
  step: PipelineStep<ImagePromptData[]>;
}

export function ImagePromptsStep({ project, step }: ImagePromptsStepProps) {
  const { generateImagePrompts } = usePipelineStore();
  const canGenerate = project.segments.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-4">
        {step.data.map((prompt, i) => (
          <div key={prompt.segmentId || i} className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                Segment {prompt.segmentIndex + 1}
              </span>
            </div>
            <p className="text-white text-sm mb-2">{prompt.prompt}</p>
            {prompt.negativePrompt && (
              <p className="text-red-400 text-xs">Negative: {prompt.negativePrompt}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canGenerate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">Create segments first.</p>
        </div>
      )}
      {isGenerating && (
        <div className="flex flex-col items-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Generating prompts... {step.progress}%</p>
        </div>
      )}
      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <button
            onClick={() => generateImagePrompts()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Generate Image Prompts
          </button>
        </div>
      )}
    </div>
  );
}

export default ImagePromptsStep;
