'use client';

import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, ScriptData } from '@/types/pipeline';
import { GenerationProgress, type SubStep } from '../GenerationProgress';
import { NextStepButton } from '../NextStepButton';

interface ScriptStepProps {
  project: Project;
  step: PipelineStep<ScriptData>;
}

export function ScriptStep({ project, step }: ScriptStepProps) {
  const { generateScript, cancelStep } = usePipelineStore();

  const [subSteps, setSubSteps] = useState<SubStep[]>([
    { id: 'prepare', label: 'Preparing request', status: 'pending' },
    { id: 'send', label: 'Sending to AI model', status: 'pending' },
    { id: 'generate', label: 'Generating script content', status: 'pending' },
    { id: 'parse', label: 'Parsing response', status: 'pending' },
    { id: 'save', label: 'Saving to database', status: 'pending' },
  ]);
  const [logs, setLogs] = useState<string[]>([]);

  const canGenerate = project.contentIdea.status === 'complete';
  const isGenerating = step.status === 'in_progress';

  // Update sub-steps based on progress
  useEffect(() => {
    if (isGenerating) {
      const progress = step.progress || 0;

      setSubSteps((prev) => prev.map((s, i) => {
        const stepThreshold = (i + 1) * 20;
        if (progress >= stepThreshold) {
          return { ...s, status: 'complete', message: 'Done' };
        } else if (progress >= stepThreshold - 20) {
          return { ...s, status: 'running', message: 'In progress...' };
        }
        return { ...s, status: 'pending' };
      }));
    }
  }, [step.progress, isGenerating]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const handleGenerate = async () => {
    // Reset state
    setSubSteps((prev) => prev.map((s) => ({ ...s, status: 'pending', message: undefined })));
    setLogs([]);

    try {
      // Step 1: Prepare
      setSubSteps((prev) => prev.map((s) =>
        s.id === 'prepare' ? { ...s, status: 'running', message: 'Building request...' } : s
      ));
      addLog('Preparing script generation request...');

      await new Promise((r) => setTimeout(r, 500));

      setSubSteps((prev) => prev.map((s) =>
        s.id === 'prepare' ? { ...s, status: 'complete', message: 'Request ready' } : s
      ));
      addLog('Request prepared successfully');

      // Step 2: Send
      setSubSteps((prev) => prev.map((s) =>
        s.id === 'send' ? { ...s, status: 'running', message: 'Connecting to AI...' } : s
      ));
      addLog('Sending request to AI model...');

      // Actually trigger the generation
      await generateScript();

      setSubSteps((prev) => prev.map((s) => ({ ...s, status: 'complete', message: 'Done' })));
      addLog('Script generation complete!');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`ERROR: ${errorMsg}`);
      setSubSteps((prev) => prev.map((s) =>
        s.status === 'running' ? { ...s, status: 'error', error: errorMsg } : s
      ));
    }
  };

  // Show completed script
  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-2">{step.data.title}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {step.data.hashtags?.map((tag, i) => (
              <span key={i} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Hook (First 3 seconds)</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3">{step.data.hook}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Body</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3 whitespace-pre-wrap">
              {step.data.body}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Call to Action</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3">{step.data.cta}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Full Script</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3 whitespace-pre-wrap">
              {step.data.fullText}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Duration: ~{step.data.estimatedDuration}s</span>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Caption</h4>
            <p className="text-white bg-slate-800 rounded-lg p-3">{step.data.captionText}</p>
          </div>
        </div>

        {/* Next Step Button */}
        <NextStepButton currentStepId="script_generation" />
      </div>
    );
  }

  // Show generation progress
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <GenerationProgress
          title="Generating Script"
          subSteps={subSteps}
          logs={logs}
          overallProgress={step.progress}
          onCancel={() => cancelStep('script_generation')}
        />
      </div>
    );
  }

  // Show generate button
  return (
    <div className="space-y-6">
      {!canGenerate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            Complete the Content Idea step first before generating the script.
          </p>
        </div>
      )}

      {canGenerate && step.status === 'pending' && (
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400">
              Generate a video script based on your content idea.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              The AI will create a hook, body, and call-to-action for your video.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Generate Script
          </button>
        </div>
      )}

      {step.status === 'error' && (
        <div className="space-y-4">
          <GenerationProgress
            title="Generation Failed"
            subSteps={subSteps}
            logs={logs}
          />
          <div className="text-center">
            <button
              onClick={handleGenerate}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Retry Generation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScriptStep;
