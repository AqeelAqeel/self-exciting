'use client';

import { useEffect } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { usePipelineStream } from '@/hooks/usePipelineStream';
import { ProgressBar } from './ProgressBar';
import { StepContent } from './StepContent';
import { ProjectSelector } from './ProjectSelector';
import { PIPELINE_STEPS, STEP_ID_TO_KEY, type PipelineStep } from '@/types/pipeline';

export function PipelinePage() {
  const {
    project,
    isLoading,
    error,
    activeStepId,
    showProjectSelector,
    lastProjectId,
    createProject,
    selectProject,
    setActiveStep,
    showSelector,
  } = usePipelineStore();

  // Connect to SSE when project exists
  usePipelineStream(project?.id ?? null);

  // Auto-load last project on mount (if we have one saved and no project loaded)
  useEffect(() => {
    if (lastProjectId && !project && !isLoading && showProjectSelector) {
      selectProject(lastProjectId).catch(() => {
        // If loading fails, just show the selector
      });
    }
  }, [lastProjectId, project, isLoading, showProjectSelector, selectProject]);

  // Set default active step to first step if none selected
  useEffect(() => {
    if (project && !activeStepId) {
      setActiveStep('content_idea');
    }
  }, [project, activeStepId, setActiveStep]);

  // Show project selector
  if (showProjectSelector) {
    return (
      <ProjectSelector
        onSelectProject={selectProject}
        onCreateProject={() => createProject('New Video Project')}
        isCreating={isLoading}
      />
    );
  }

  if (isLoading && !project) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-red-400">{error}</p>
          <button
            onClick={showSelector}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  // Get active step metadata
  const activeStepMeta = activeStepId
    ? PIPELINE_STEPS.find((s) => s.id === activeStepId)
    : null;
  const activeStepKey = activeStepId ? STEP_ID_TO_KEY[activeStepId] : null;
  const activeStep = activeStepKey
    ? (project[activeStepKey] as PipelineStep<unknown>)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={showSelector}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors group"
              title="Back to Projects"
            >
              <svg
                className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold">{project.name}</h1>
              <p className="text-xs text-slate-500">Content Factory Pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              Status:{' '}
              <span
                className={
                  project.status === 'completed'
                    ? 'text-emerald-400'
                    : project.status === 'failed'
                    ? 'text-red-400'
                    : project.status === 'in_progress'
                    ? 'text-yellow-400'
                    : 'text-slate-400'
                }
              >
                {project.status.replace('_', ' ')}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <ProgressBar
        project={project}
        activeStepId={activeStepId}
        onStepClick={setActiveStep}
      />

      {/* Step Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {activeStepId && activeStepMeta && activeStep && (
            <>
              {/* Step Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{activeStepMeta.icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold">{activeStepMeta.label}</h2>
                    <p className="text-sm text-slate-400">{activeStepMeta.description}</p>
                  </div>
                </div>
                {/* Status badge */}
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activeStep.status === 'complete'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : activeStep.status === 'in_progress'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : activeStep.status === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {activeStep.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Error message */}
              {activeStep.error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-red-400 font-medium">Error</p>
                      <p className="text-sm text-red-300 mt-1">{activeStep.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Content */}
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
                <StepContent stepId={activeStepId} project={project} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default PipelinePage;
