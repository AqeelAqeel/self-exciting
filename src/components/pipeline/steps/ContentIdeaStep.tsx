'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, ContentIdeaData } from '@/types/pipeline';

interface ContentIdeaStepProps {
  project: Project;
  step: PipelineStep<ContentIdeaData>;
}

export function ContentIdeaStep({ step }: ContentIdeaStepProps) {
  const { submitContentIdea } = usePipelineStore();

  const [idea, setIdea] = useState(step.data?.topic ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setIsSubmitting(true);
    try {
      await submitContentIdea({
        topic: idea.trim(),
        niche: 'general', // Default value since we removed the field
        style: 'educational',
        targetPlatform: 'tiktok',
        targetDuration: 45,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If step is complete, show the submitted data
  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Your Idea</h3>
          <p className="text-white text-lg">{step.data.topic}</p>
        </div>

        <p className="text-sm text-slate-400">
          Content idea saved. Proceed to the next step to generate the script.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Main Idea Input */}
      <div>
        <label htmlFor="idea" className="block text-sm font-medium text-slate-300 mb-2">
          What's your video idea?
        </label>
        <textarea
          id="idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe your video idea, inspiration, or the topic you want to create content about..."
          rows={4}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          required
        />
        <p className="mt-2 text-xs text-slate-500">
          Be as detailed or brief as you want. This will be used to generate your script.
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !idea.trim()}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          'Continue'
        )}
      </button>
    </form>
  );
}

export default ContentIdeaStep;
