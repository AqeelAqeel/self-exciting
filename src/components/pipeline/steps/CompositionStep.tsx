'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, ComposedVideoData } from '@/types/pipeline';

interface CompositionStepProps {
  project: Project;
  step: PipelineStep<ComposedVideoData>;
}

export function CompositionStep({ project, step }: CompositionStepProps) {
  const { composeVideo } = usePipelineStore();
  const canGenerate = project.videoGeneration.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="aspect-[9/16] max-h-[500px] mx-auto bg-slate-900">
            {step.data.url ? (
              <video
                src={step.data.url}
                className="w-full h-full object-contain"
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                No video
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Duration</dt>
              <dd className="text-white">{step.data.duration}s</dd>
            </div>
            <div>
              <dt className="text-slate-500">Resolution</dt>
              <dd className="text-white">{step.data.resolution}</dd>
            </div>
            {step.data.audioTrackName && (
              <div className="col-span-2">
                <dt className="text-slate-500">Audio Track</dt>
                <dd className="text-white">{step.data.audioTrackName}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canGenerate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">Generate all video segments first.</p>
        </div>
      )}
      {isGenerating && (
        <div className="flex flex-col items-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Stitching videos with FFmpeg... {step.progress}%</p>
        </div>
      )}
      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">
            Stitch all video segments together with transitions and background music.
          </p>
          <button
            onClick={() => composeVideo()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Compose Final Video
          </button>
        </div>
      )}
    </div>
  );
}

export default CompositionStep;
