'use client';

import { usePipelineStore } from '@/store/pipeline-store';
import { PIPELINE_STEPS, type PipelineStepId } from '@/types/pipeline';

interface NextStepButtonProps {
  currentStepId: PipelineStepId;
}

export function NextStepButton({ currentStepId }: NextStepButtonProps) {
  const { setActiveStep } = usePipelineStore();

  // Find the next step
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentStepId);
  const nextStep = PIPELINE_STEPS[currentIndex + 1];

  if (!nextStep) {
    // This is the last step
    return (
      <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-emerald-400 font-medium">Pipeline Complete!</p>
            <p className="text-sm text-slate-400">All steps have been completed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setActiveStep(nextStep.id)}
        className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
      >
        <span>Continue to {nextStep.label}</span>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}

export default NextStepButton;
