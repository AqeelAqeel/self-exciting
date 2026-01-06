'use client';

import { useState, useEffect } from 'react';
import type { ProjectListItem, PipelineStepId } from '@/types/pipeline';
import { PIPELINE_STEPS } from '@/types/pipeline';

interface ProjectSelectorProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  isCreating: boolean;
}

export function ProjectSelector({
  onSelectProject,
  onCreateProject,
  isCreating,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pipeline/project');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepLabel = (stepId: PipelineStepId | null): string => {
    if (!stepId) return 'Not started';
    const step = PIPELINE_STEPS.find((s) => s.id === stepId);
    return step?.shortLabel || stepId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400';
      case 'in_progress':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
      }
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Content Factory</h1>
          <p className="text-slate-400 text-sm mt-1">
            Select a project to continue or start a new one
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* New Project Button */}
        <button
          onClick={onCreateProject}
          disabled={isCreating}
          className="w-full mb-8 p-6 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl transition-colors group"
        >
          <div className="flex items-center justify-center gap-3">
            {isCreating ? (
              <>
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-400">Creating project...</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-blue-600 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="text-lg font-medium text-slate-300 group-hover:text-white transition-colors">
                  New Project
                </span>
              </>
            )}
          </div>
        </button>

        {/* Projects List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
            Recent Projects
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchProjects}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p>No projects yet</p>
              <p className="text-sm mt-1">Create your first project to get started</p>
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-white truncate">
                        {project.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          project.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : project.status === 'in_progress'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : project.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span>
                        Step: <span className={getStatusColor(project.status)}>{getStepLabel(project.currentStepId)}</span>
                      </span>
                      <span>•</span>
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-slate-400">
                        {project.completedSteps}/{project.totalSteps} steps
                      </div>
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                          style={{
                            width: `${(project.completedSteps / project.totalSteps) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default ProjectSelector;
