'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, GeneratedVideoData } from '@/types/pipeline';

interface VideosStepProps {
  project: Project;
  step: PipelineStep<GeneratedVideoData[]>;
}

export function VideosStep({ project, step }: VideosStepProps) {
  const { generateVideos } = usePipelineStore();
  const canGenerate = project.imageGeneration.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  if (step.status === 'complete' && step.data) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {step.data.map((video, i) => (
          <div key={video.segmentId || i} className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="aspect-[9/16] bg-slate-700 relative">
              {video.url ? (
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  controls
                  muted
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  No video
                </div>
              )}
            </div>
            <div className="p-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">Segment {video.segmentIndex + 1}</span>
              <span className="text-xs text-slate-500">{video.duration}s</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canGenerate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">Generate images first.</p>
        </div>
      )}
      {isGenerating && (
        <div className="flex flex-col items-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Generating videos with FAL... {step.progress}%</p>
          <p className="text-xs text-slate-500 mt-2">This may take a few minutes</p>
        </div>
      )}
      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Convert images to video using FAL minimax-video</p>
          <button
            onClick={() => generateVideos()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Generate Videos
          </button>
        </div>
      )}
    </div>
  );
}

export default VideosStep;
