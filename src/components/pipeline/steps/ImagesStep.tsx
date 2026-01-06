'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, GeneratedImageData } from '@/types/pipeline';

interface ImagesStepProps {
  project: Project;
  step: PipelineStep<GeneratedImageData[]>;
}

export function ImagesStep({ project, step }: ImagesStepProps) {
  const { generateImages } = usePipelineStore();
  const canGenerate = project.imagePrompts.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  if (step.status === 'complete' && step.data) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {step.data.map((image, i) => (
          <div key={image.segmentId || i} className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="aspect-[9/16] bg-slate-700 relative">
              {image.url ? (
                <img
                  src={image.url}
                  alt={`Segment ${image.segmentIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  No image
                </div>
              )}
            </div>
            <div className="p-2">
              <span className="text-xs text-slate-400">Segment {image.segmentIndex + 1}</span>
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
          <p className="text-yellow-400 text-sm">Generate image prompts first.</p>
        </div>
      )}
      {isGenerating && (
        <div className="flex flex-col items-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Generating images... {step.progress}%</p>
        </div>
      )}
      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <button
            onClick={() => generateImages()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Generate Images
          </button>
        </div>
      )}
    </div>
  );
}

export default ImagesStep;
