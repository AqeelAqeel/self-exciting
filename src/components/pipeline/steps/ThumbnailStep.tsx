'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, ThumbnailData } from '@/types/pipeline';

interface ThumbnailStepProps {
  project: Project;
  step: PipelineStep<ThumbnailData>;
}

export function ThumbnailStep({ project, step }: ThumbnailStepProps) {
  const { generateThumbnail } = usePipelineStore();
  const canGenerate = project.videoComposition.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="aspect-video bg-slate-900">
            {step.data.url ? (
              <img
                src={step.data.url}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                No thumbnail
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Style</dt>
              <dd className="text-white capitalize">{step.data.style}</dd>
            </div>
            {step.data.mainText && (
              <div>
                <dt className="text-slate-500">Text Overlay</dt>
                <dd className="text-white">{step.data.mainText}</dd>
              </div>
            )}
          </dl>
        </div>

        <button
          onClick={() => generateThumbnail()}
          className="w-full py-2 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-lg transition-colors"
        >
          Regenerate Thumbnail
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canGenerate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">Compose the final video first.</p>
        </div>
      )}
      {isGenerating && (
        <div className="flex flex-col items-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Generating thumbnail... {step.progress}%</p>
        </div>
      )}
      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">
            Generate an attention-grabbing thumbnail with text overlay.
          </p>
          <button
            onClick={() => generateThumbnail()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Generate Thumbnail
          </button>
        </div>
      )}
    </div>
  );
}

export default ThumbnailStep;
