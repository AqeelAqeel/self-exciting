'use client';

import React, { useCallback, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalienceStore } from '@/store/salience-store';
import {
  getStarBoundingBox,
  getDepthRings,
  DEFAULT_STAR_CONFIG,
} from '@/lib/star-layout';
import { SeedNode } from './SeedNode';
import { DirectionRay } from './DirectionRay';
import type { NodeAction } from '@/types/salience';

interface StarCanvasProps {
  className?: string;
}

export function StarCanvas({ className = '' }: StarCanvasProps) {
  const {
    session,
    layoutConfig,
    activeDirectionIndex,
    activeNodeId,
    setActiveDirection,
    setActiveNode,
    handleNodeAction,
  } = useSalienceStore();

  const config = layoutConfig ?? DEFAULT_STAR_CONFIG;
  const bbox = useMemo(() => getStarBoundingBox(config), [config]);
  const depthRings = useMemo(() => getDepthRings(config), [config]);

  const handleNodeActionCallback = useCallback(
    (nodeId: string, action: NodeAction) => {
      handleNodeAction(nodeId, action);
    },
    [handleNodeAction]
  );

  const handleDirectionClick = useCallback(
    (index: number) => {
      setActiveDirection(activeDirectionIndex === index ? null : index);
    },
    [activeDirectionIndex, setActiveDirection]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setActiveNode(activeNodeId === nodeId ? null : nodeId);
    },
    [activeNodeId, setActiveNode]
  );

  if (!session) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-slate-500">No session loaded</p>
      </div>
    );
  }

  if (session.directions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-4 ${className}`}>
        <div className="text-4xl opacity-50">+</div>
        <p className="text-slate-400 text-center max-w-md">
          Upload references and analyze to reveal directions.
          <br />
          <span className="text-slate-500 text-sm">
            Each ray is a different worldline.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-950 ${className}`}>
      <TransformWrapper
        initialScale={0.8}
        minScale={0.3}
        maxScale={2}
        centerOnInit
        limitToBounds={false}
        panning={{ disabled: false }}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button
                onClick={() => zoomIn()}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={() => zoomOut()}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                title="Zoom out"
              >
                −
              </button>
              <button
                onClick={() => resetTransform()}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs transition-colors"
                title="Reset view"
              >
                ⟲
              </button>
            </div>

            {/* Header microcopy */}
            <div className="absolute top-4 left-4 z-20">
              <p className="text-slate-400 text-sm">
                Pick a direction. Watch it evolve.
              </p>
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <svg
                viewBox={`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`}
                className="w-full h-full"
                style={{ minWidth: bbox.width, minHeight: bbox.height }}
              >
                {/* Background depth rings */}
                <g className="depth-rings">
                  {depthRings.map(({ depth, radius }) => (
                    <circle
                      key={`ring-${depth}`}
                      cx={0}
                      cy={0}
                      r={radius}
                      fill="none"
                      stroke="rgba(100, 116, 139, 0.15)"
                      strokeWidth={1}
                      strokeDasharray="4 8"
                    />
                  ))}
                </g>

                {/* Depth labels */}
                <g className="depth-labels">
                  {depthRings.map(({ depth, radius }) => (
                    <text
                      key={`label-${depth}`}
                      x={radius + 10}
                      y={-5}
                      className="text-xs fill-slate-600"
                      style={{ fontSize: '10px' }}
                    >
                      D{depth}
                    </text>
                  ))}
                </g>

                {/* Direction rays */}
                <AnimatePresence mode="popLayout">
                  {session.directions.map((direction, index) => (
                    <DirectionRay
                      key={direction.id}
                      direction={direction}
                      directionIndex={index}
                      config={config}
                      isActive={activeDirectionIndex === index}
                      activeNodeId={activeNodeId}
                      onDirectionClick={() => handleDirectionClick(index)}
                      onNodeClick={handleNodeClick}
                      onNodeAction={handleNodeActionCallback}
                    />
                  ))}
                </AnimatePresence>

                {/* Seed node at center */}
                <SeedNode
                  referenceUrls={session.referenceUrls}
                  caption={session.caption}
                />
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Status overlay */}
      {session.state === 'analyzing' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
          <div className="bg-slate-800 rounded-lg px-6 py-4 flex items-center gap-3">
            <motion.div
              className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-slate-200">Analyzing references...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StarCanvas;
