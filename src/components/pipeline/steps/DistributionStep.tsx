'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import type { Project, PipelineStep, DistributionData, DistributionPlatform } from '@/types/pipeline';

interface DistributionStepProps {
  project: Project;
  step: PipelineStep<DistributionData>;
}

const PLATFORMS: { id: DistributionPlatform; label: string; icon: string }[] = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'instagram', label: 'Instagram Reels', icon: '📸' },
  { id: 'youtube', label: 'YouTube Shorts', icon: '▶️' },
  { id: 'facebook', label: 'Facebook', icon: '👥' },
  { id: 'twitter', label: 'X (Twitter)', icon: '🐦' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'threads', label: 'Threads', icon: '🧵' },
  { id: 'bluesky', label: 'Bluesky', icon: '🦋' },
];

export function DistributionStep({ project, step }: DistributionStepProps) {
  const { distribute } = usePipelineStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<DistributionPlatform[]>([]);

  const canDistribute =
    project.videoComposition.status === 'complete' &&
    project.thumbnail.status === 'complete';
  const isDistributing = step.status === 'in_progress';

  const togglePlatform = (platform: DistributionPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleDistribute = async () => {
    if (selectedPlatforms.length === 0) return;
    try {
      await distribute(selectedPlatforms);
    } catch (error) {
      console.error('Distribution failed:', error);
    }
  };

  if (step.status === 'complete' && step.data) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-emerald-400 font-medium">Distribution Complete!</p>
          <p className="text-sm text-slate-400 mt-1">
            Your video has been published to the selected platforms.
          </p>
        </div>

        <div className="space-y-3">
          {step.data.platforms?.map((platform, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {PLATFORMS.find((p) => p.id === platform.platform)?.icon}
                </span>
                <div>
                  <p className="text-white font-medium">
                    {PLATFORMS.find((p) => p.id === platform.platform)?.label}
                  </p>
                  {platform.accountName && (
                    <p className="text-xs text-slate-400">@{platform.accountName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    platform.status === 'published'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : platform.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {platform.status}
                </span>
                {platform.postUrl && (
                  <a
                    href={platform.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {step.data.caption && (
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-sm text-slate-400 mb-2">Caption</p>
            <p className="text-white">{step.data.caption}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {step.data.hashtags?.map((tag, i) => (
                <span key={i} className="text-xs text-blue-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canDistribute && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            Complete video composition and thumbnail generation first.
          </p>
        </div>
      )}

      {isDistributing && (
        <div className="flex flex-col items-center py-12">
          <div className="w-12 h-12 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Distributing to platforms... {step.progress}%</p>
        </div>
      )}

      {canDistribute && step.status === 'pending' && (
        <>
          <div>
            <p className="text-sm text-slate-400 mb-4">Select platforms to publish to:</p>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${
                    selectedPlatforms.includes(platform.id)
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className="text-xl">{platform.icon}</span>
                  <span className="text-white text-sm">{platform.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDistribute}
            disabled={selectedPlatforms.length === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {selectedPlatforms.length === 0
              ? 'Select platforms to continue'
              : `Publish to ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  );
}

export default DistributionStep;
