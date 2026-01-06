'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, SegmentsData } from '@/types/pipeline';

interface SegmentsStepProps {
  project: Project;
  step: PipelineStep<SegmentsData>;
}

export function SegmentsStep({ project, step }: SegmentsStepProps) {
  const { generateSegments } = usePipelineStore();

  const canGenerate = project.scriptGeneration.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  const handleGenerate = async () => {
    try {
      await generateSegments();
    } catch (error) {
      console.error('Failed to generate segments:', error);
    }
  };

  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-6">
        {/* Consistency Profile */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Visual Style</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Art Style</dt>
              <dd className="text-white">{step.data.consistencyProfile.artStyle}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Background</dt>
              <dd className="text-white">{step.data.consistencyProfile.backgroundStyle}</dd>
            </div>
            {step.data.consistencyProfile.characterDescription && (
              <div className="col-span-2">
                <dt className="text-slate-500">Character</dt>
                <dd className="text-white">{step.data.consistencyProfile.characterDescription}</dd>
              </div>
            )}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {step.data.consistencyProfile.moodKeywords?.map((keyword, i) => (
              <span key={i} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400">
            Segments ({step.data.segments.length})
          </h3>
          {step.data.segments.map((segment) => (
            <div key={segment.id} className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  {segment.position}
                </span>
                <span className="text-xs text-slate-500">{segment.duration}s</span>
              </div>
              <p className="text-white text-sm mb-2">{segment.narration}</p>
              <p className="text-slate-400 text-xs">{segment.sceneDescription}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canGenerate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            Generate the script first before creating segments.
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Creating segments...</p>
          <p className="text-sm text-slate-500 mt-1">{step.progress}%</p>
        </div>
      )}

      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-6">
            Split the script into 3-4 video segments with a consistent visual style.
          </p>
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Create Segments
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

export default SegmentsStep;
