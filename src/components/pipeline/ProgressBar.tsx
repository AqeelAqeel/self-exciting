'use client';

import type { Project, PipelineStepId, PipelineStep } from '@/types/pipeline';
import { PIPELINE_STEPS, STEP_ID_TO_KEY } from '@/types/pipeline';

interface ProgressBarProps {
  project: Project;
  activeStepId: PipelineStepId | null;
  onStepClick: (stepId: PipelineStepId) => void;
}

export function ProgressBar({ project, activeStepId, onStepClick }: ProgressBarProps) {
  return (
    <div className="w-full bg-slate-900/80 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Horizontal step bar */}
        <div className="flex items-stretch gap-1">
          {PIPELINE_STEPS.map((stepMeta, index) => {
            const key = STEP_ID_TO_KEY[stepMeta.id];
            const step = project[key] as PipelineStep<unknown>;
            const isActive = activeStepId === stepMeta.id;

            // Determine indicator color based on status
            // Green = done, Yellow = in progress, Red = not started
            const getIndicatorColor = () => {
              switch (step.status) {
                case 'complete':
                  return 'bg-emerald-500'; // Green - done
                case 'in_progress':
                  return 'bg-yellow-500'; // Yellow - in progress
                case 'error':
                  return 'bg-orange-500'; // Orange for errors
                case 'pending':
                case 'skipped':
                default:
                  return 'bg-red-500'; // Red - not started
              }
            };

            const getIndicatorGlow = () => {
              switch (step.status) {
                case 'complete':
                  return 'shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]'; // Green glow
                case 'in_progress':
                  return 'shadow-[0_0_8px_2px_rgba(234,179,8,0.6)] animate-pulse'; // Yellow glow
                case 'error':
                  return 'shadow-[0_0_8px_2px_rgba(249,115,22,0.6)]'; // Orange glow for error
                default:
                  return ''; // No glow for not started
              }
            };

            // Get border/ring color based on status
            const getBorderColor = () => {
              if (isActive) return 'ring-2 ring-blue-500';
              switch (step.status) {
                case 'complete':
                  return 'border border-emerald-500/30'; // Green border for done
                case 'in_progress':
                  return 'border border-yellow-500/30'; // Yellow border for in progress
                case 'error':
                  return 'border border-orange-500/30'; // Orange border for error
                default:
                  return 'border border-red-500/20'; // Light red border for not started
              }
            };

            return (
              <button
                key={stepMeta.id}
                onClick={() => onStepClick(stepMeta.id)}
                className={`
                  flex-1 min-w-[90px] flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg
                  transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-slate-700/80'
                    : 'bg-slate-800/40 hover:bg-slate-700/50'
                  }
                  ${getBorderColor()}
                `}
              >
                {/* Step number and indicator light */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {index + 1}.
                  </span>
                  {/* Indicator light */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${getIndicatorColor()} ${getIndicatorGlow()}`}
                  />
                </div>

                {/* Step title */}
                <span className={`text-[11px] font-medium text-center leading-tight ${
                  isActive ? 'text-white' : step.status === 'complete' ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {stepMeta.label}
                </span>

                {/* Progress bar under each step when in progress */}
                {step.status === 'in_progress' && step.progress > 0 && (
                  <div className="w-full h-0.5 bg-slate-700 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-yellow-500 transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProgressBar;
