'use client';

export type SubStepStatus = 'pending' | 'running' | 'complete' | 'error';

export interface SubStep {
  id: string;
  label: string;
  status: SubStepStatus;
  message?: string;
  error?: string;
}

interface GenerationProgressProps {
  title: string;
  subSteps: SubStep[];
  logs?: string[];
  overallProgress?: number;
  onCancel?: () => void;
}

export function GenerationProgress({ title, subSteps, logs = [], overallProgress, onCancel }: GenerationProgressProps) {
  const getStatusIcon = (status: SubStepStatus) => {
    switch (status) {
      case 'complete':
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'running':
        return (
          <div className="w-5 h-5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
        );
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
        );
    }
  };

  const getStatusColor = (status: SubStepStatus) => {
    switch (status) {
      case 'complete':
        return 'text-emerald-400';
      case 'running':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <div className="flex gap-6">
      {/* Left side - Progress checklist */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-300">{title}</h4>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          )}
        </div>

        {/* Overall progress bar */}
        {overallProgress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Sub-steps checklist */}
        <div className="space-y-3">
          {subSteps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              {/* Status icon */}
              {getStatusIcon(step.status)}

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${getStatusColor(step.status)}`}>
                  {step.label}
                </div>
                {step.message && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {step.message}
                  </div>
                )}
                {step.error && (
                  <div className="text-xs text-red-400 mt-0.5">
                    Error: {step.error}
                  </div>
                )}
              </div>

              {/* Step number */}
              <span className="text-xs text-slate-600">
                {index + 1}/{subSteps.length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Console/logs */}
      {logs.length > 0 && (
        <div className="w-72 flex-shrink-0">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Console Output</h4>
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 h-48 overflow-y-auto font-mono text-xs">
            {logs.map((log, index) => (
              <div key={index} className="text-slate-400 mb-1">
                <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GenerationProgress;
