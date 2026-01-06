'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GenerationNode, NodeAction } from '@/types/salience';
import { GENERATING_MICROCOPY, NODE_ACTIONS } from '@/types/salience';

interface NodeCardProps {
  node: GenerationNode;
  depth: number;
  maxDepth: number;
  isActive: boolean;
  canPush: boolean;
  onClick: () => void;
  onAction: (action: NodeAction) => void;
}

export function NodeCard({
  node,
  depth,
  maxDepth,
  isActive,
  canPush,
  onClick,
  onAction,
}: NodeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [copyIndex, setCopyIndex] = useState(0);

  // Rotate microcopy for generating state
  useEffect(() => {
    if (node.status === 'generating') {
      const interval = setInterval(() => {
        setCopyIndex((prev) => (prev + 1) % GENERATING_MICROCOPY.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [node.status]);

  // Status-based styling
  const statusStyles = {
    pending: 'border-slate-600 bg-slate-800/50',
    queued: 'border-slate-600 bg-slate-800/50',
    generating: 'border-blue-500/50 bg-slate-800 ring-2 ring-blue-500/20',
    complete: 'border-slate-600 bg-slate-800',
    error: 'border-red-500/50 bg-slate-800',
  };

  return (
    <motion.div
      className={`
        relative w-full h-full rounded-xl border overflow-hidden
        transition-all duration-200 cursor-pointer
        ${statusStyles[node.status]}
        ${isActive ? 'ring-2 ring-blue-400/50' : ''}
        ${node.isPinned ? 'ring-2 ring-amber-400/50' : ''}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            D{depth}/{maxDepth}
          </span>
          {node.isPinned && (
            <span className="text-amber-400 text-xs">pinned</span>
          )}
        </div>

        {/* Progress indicator for generating state */}
        {node.status === 'generating' && (
          <div className="flex items-center gap-2">
            <ProgressRing progress={node.progress} />
            <span className="text-xs text-blue-400">
              {node.progress > 0 ? `${Math.round(node.progress)}%` : ''}
            </span>
          </div>
        )}

        {/* Explanation toggle */}
        {node.status === 'complete' && node.explanationShort && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowExplanation(!showExplanation);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Why this?
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden p-3" style={{ height: 'calc(100% - 40px)' }}>
        {/* Pending state */}
        {(node.status === 'pending' || node.status === 'queued') && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm text-center">
            <p>
              Pick a direction.
              <br />
              <span className="text-xs text-slate-600">Watch it evolve.</span>
            </p>
          </div>
        )}

        {/* Generating state */}
        {node.status === 'generating' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <motion.div
              className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.span
              key={copyIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-blue-400 text-sm"
            >
              {GENERATING_MICROCOPY[copyIndex]}
            </motion.span>

            {/* Streaming content preview */}
            {node.streamingContent && (
              <div className="text-slate-300 text-xs max-h-16 overflow-hidden opacity-60 text-center px-2">
                {node.streamingContent.slice(0, 100)}
                {node.streamingContent.length > 100 && '...'}
              </div>
            )}
          </div>
        )}

        {/* Complete state */}
        {node.status === 'complete' && (
          <div className="w-full h-full">
            {node.outputUrl ? (
              <div className="relative w-full h-full rounded overflow-hidden bg-slate-700">
                {node.mediaType === 'image' ? (
                  <img
                    src={node.outputUrl}
                    alt="Generated"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={node.outputUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                )}

                {/* Model badge */}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-xs text-slate-300">
                  {node.model === 'gpt-image-1.5-2025-12-16' ? 'img' : 'vid'}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No output
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {node.status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400">
            <span className="text-2xl">!</span>
            <span className="text-sm text-center">
              {node.error || 'Generation failed'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('push');
              }}
              className="text-xs underline hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Action buttons - show on hover for complete nodes */}
      <AnimatePresence>
        {isHovered && node.status === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-900/95 to-transparent"
          >
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {NODE_ACTIONS.map(({ action, label, description, color }) => {
                // Skip push if can't push
                if (action === 'push' && !canPush) return null;

                // Toggle pin label
                const displayLabel = action === 'pin' && node.isPinned ? 'Unpin' : label;

                const colorClasses: Record<string, string> = {
                  blue: 'bg-blue-600 hover:bg-blue-500',
                  purple: 'bg-purple-600 hover:bg-purple-500',
                  amber: 'bg-amber-600 hover:bg-amber-500',
                  emerald: 'bg-emerald-600 hover:bg-emerald-500',
                  red: 'bg-red-600 hover:bg-red-500',
                };

                return (
                  <motion.button
                    key={action}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(action);
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium text-white transition-colors ${colorClasses[color]}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={description}
                  >
                    {displayLabel}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation popover */}
      <AnimatePresence>
        {showExplanation && node.explanationShort && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 left-2 right-2 p-3 rounded-lg bg-slate-900 border border-slate-700 shadow-xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowExplanation(false)}
              className="absolute top-1 right-1 text-slate-500 hover:text-slate-300 p-1"
            >
              ×
            </button>
            <p className="text-xs text-slate-300 pr-4">{node.explanationShort}</p>
            {node.salienceDelta && node.salienceDelta.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {node.salienceDelta.slice(0, 3).map((delta, i) => (
                  <span
                    key={i}
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      delta.strength > 0
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    {delta.axis}: {delta.strength > 0 ? '+' : ''}{(delta.strength * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Progress ring component
function ProgressRing({ progress }: { progress: number }) {
  const isIndeterminate = progress === 0;
  const circumference = 2 * Math.PI * 8;
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <div className="relative w-5 h-5">
      <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
        {/* Background circle */}
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="rgba(59, 130, 246, 0.2)"
          strokeWidth="2"
        />

        {/* Progress circle */}
        <motion.circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={
            isIndeterminate
              ? {
                  strokeDashoffset: [circumference, circumference / 2, circumference],
                  rotate: [0, 180, 360],
                }
              : { strokeDashoffset }
          }
          transition={
            isIndeterminate
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        />
      </svg>
    </div>
  );
}

export default NodeCard;
