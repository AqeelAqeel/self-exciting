'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, ScriptData } from '@/types/pipeline';

interface ScriptStepProps {
  project: Project;
  step: PipelineStep<ScriptData>;
}

export function ScriptStep({ project, step }: ScriptStepProps) {
  const { generateScript } = usePipelineStore();

  const canGenerate = project.contentIdea.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  const handleGenerate = async () => {
    try {
      await generateScript();
    } catch (error) {
      console.error('Failed to generate script:', error);
    }
  };

  // Show completed script
  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-2">{step.data.title}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {step.data.hashtags?.map((tag, i) => (
              <span key={i} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Hook (First 3 seconds)</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3">{step.data.hook}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Body</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3 whitespace-pre-wrap">
              {step.data.body}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Call to Action</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3">{step.data.cta}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Full Script</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3 whitespace-pre-wrap">
              {step.data.fullText}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Duration: ~{step.data.estimatedDuration}s</span>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Caption</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3">{step.data.captionText}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show generate button
  return (
    <div className="space-y-6">
      {!canGenerate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            Complete the Content Idea step first before generating the script.
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Generating script...</p>
          <p className="text-sm text-slate-500 mt-1">{step.progress}%</p>
        </div>
      )}

      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-6">
            Generate a video script based on your content idea.
          </p>
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Generate Script
          </button>
        </div>
      )}

      {step.status === 'error' && (
        <div className="text-center py-8">
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default ScriptStep;
