'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SeedNodeProps {
  referenceUrls: string[];
  caption: string;
}

export function SeedNode({ referenceUrls, caption }: SeedNodeProps) {
  const hasReferences = referenceUrls.length > 0;
  const displayCount = Math.min(referenceUrls.length, 4);
  const extraCount = referenceUrls.length - displayCount;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Outer glow */}
      <circle
        cx={0}
        cy={0}
        r={70}
        fill="url(#seed-glow)"
        opacity={0.5}
      />

      {/* Main seed circle */}
      <circle
        cx={0}
        cy={0}
        r={50}
        fill="rgba(30, 41, 59, 0.9)"
        stroke="rgba(100, 116, 139, 0.5)"
        strokeWidth={2}
      />

      {/* Reference thumbnails or placeholder */}
      <foreignObject x={-40} y={-40} width={80} height={80}>
        <div className="w-full h-full flex items-center justify-center">
          {hasReferences ? (
            <div className="grid grid-cols-2 gap-1 w-16 h-16">
              {referenceUrls.slice(0, displayCount).map((url, index) => (
                <div
                  key={index}
                  className="w-7 h-7 rounded overflow-hidden bg-slate-700"
                >
                  <img
                    src={url}
                    alt={`Reference ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {extraCount > 0 && (
                <div className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                  +{extraCount}
                </div>
              )}
            </div>
          ) : (
            <div className="text-2xl text-slate-500">+</div>
          )}
        </div>
      </foreignObject>

      {/* Caption (if present) */}
      {caption && (
        <text
          x={0}
          y={65}
          textAnchor="middle"
          className="text-xs fill-slate-400"
          style={{ fontSize: '10px' }}
        >
          {caption.length > 20 ? caption.slice(0, 20) + '...' : caption}
        </text>
      )}

      {/* Gradient definition */}
      <defs>
        <radialGradient id="seed-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
          <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
        </radialGradient>
      </defs>
    </motion.g>
  );
}

export default SeedNode;
