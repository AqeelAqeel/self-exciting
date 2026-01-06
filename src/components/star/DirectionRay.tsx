'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getNodePosition,
  getLabelPosition,
  getDirectionConnectorPaths,
  getSeedPosition,
  getNodeEntryAnimation,
} from '@/lib/star-layout';
import { NodeCard } from './NodeCard';
import type { Direction, NodeAction, StarLayoutConfig } from '@/types/salience';

interface DirectionRayProps {
  direction: Direction;
  directionIndex: number;
  config: StarLayoutConfig;
  isActive: boolean;
  activeNodeId: string | null;
  onDirectionClick: () => void;
  onNodeClick: (nodeId: string) => void;
  onNodeAction: (nodeId: string, action: NodeAction) => void;
}

export function DirectionRay({
  direction,
  directionIndex,
  config,
  isActive,
  activeNodeId,
  onDirectionClick,
  onNodeClick,
  onNodeAction,
}: DirectionRayProps) {
  // Calculate label position
  const labelPos = useMemo(
    () => getLabelPosition(directionIndex, config.numDirections, 80),
    [directionIndex, config.numDirections]
  );

  // Calculate connector paths
  const connectors = useMemo(
    () => getDirectionConnectorPaths(directionIndex, direction.nodes.length, config),
    [directionIndex, direction.nodes.length, config]
  );

  // Check if at max depth
  const isAtMaxDepth = direction.nodes.length >= config.maxDepth;

  return (
    <motion.g
      className="direction-ray"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: directionIndex * 0.1 }}
    >
      {/* Direction label */}
      <motion.g
        onClick={onDirectionClick}
        style={{ cursor: 'pointer' }}
        whileHover={{ scale: 1.05 }}
      >
        <text
          x={labelPos.x}
          y={labelPos.y}
          textAnchor={labelPos.textAnchor}
          alignmentBaseline={labelPos.alignmentBaseline}
          className={`text-sm font-medium transition-colors duration-200 ${
            isActive ? 'fill-blue-400' : 'fill-slate-500 hover:fill-slate-300'
          }`}
          style={{ fontSize: '12px' }}
        >
          {direction.label}
        </text>

        {/* Active indicator */}
        {isActive && (
          <motion.circle
            cx={labelPos.x + (labelPos.textAnchor === 'start' ? -8 : labelPos.textAnchor === 'end' ? 8 : 0)}
            cy={labelPos.y}
            r={3}
            className="fill-blue-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            layoutId={`active-indicator-${direction.id}`}
          />
        )}
      </motion.g>

      {/* Connector lines */}
      {connectors.map((connector) => {
        const isGenerating =
          direction.nodes[connector.toDepth - 1]?.status === 'generating';
        const isComplete =
          direction.nodes[connector.toDepth - 1]?.status === 'complete';

        return (
          <g key={connector.id}>
            {/* Background line */}
            <path
              d={connector.path}
              stroke="rgba(100, 116, 139, 0.3)"
              strokeWidth={2}
              fill="none"
            />

            {/* Animated progress line */}
            <motion.path
              d={connector.path}
              stroke={isComplete ? '#22c55e' : isGenerating ? '#3b82f6' : 'transparent'}
              strokeWidth={2}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{
                pathLength: isComplete ? 1 : isGenerating ? 0.6 : 0,
              }}
              transition={{
                duration: isGenerating ? 2 : 0.5,
                repeat: isGenerating ? Infinity : 0,
                ease: isGenerating ? 'easeInOut' : 'easeOut',
              }}
            />

            {/* Generating pulse */}
            {isGenerating && (
              <motion.circle
                r={4}
                fill="#3b82f6"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <animateMotion
                  dur="1.5s"
                  repeatCount="indefinite"
                  path={connector.path}
                />
              </motion.circle>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      <AnimatePresence mode="popLayout">
        {direction.nodes.map((node, nodeIndex) => {
          const pos = getNodePosition(directionIndex, nodeIndex + 1, config);
          const isLastNode = nodeIndex === direction.nodes.length - 1;
          const canPush = isLastNode && !isAtMaxDepth;
          const animation = getNodeEntryAnimation(
            directionIndex,
            nodeIndex + 1,
            config.numDirections
          );

          return (
            <motion.g
              key={node.id}
              initial={animation.initial}
              animate={animation.animate}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={animation.transition}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
            >
              <foreignObject
                x={-config.nodeWidth / 2}
                y={-config.nodeHeight / 2}
                width={config.nodeWidth}
                height={config.nodeHeight}
              >
                <NodeCard
                  node={node}
                  depth={nodeIndex + 1}
                  maxDepth={config.maxDepth}
                  isActive={activeNodeId === node.id}
                  canPush={canPush}
                  onClick={() => onNodeClick(node.id)}
                  onAction={(action) => onNodeAction(node.id, action)}
                />
              </foreignObject>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Max depth indicator */}
      {isAtMaxDepth && direction.nodes.length > 0 && (
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {(() => {
            const lastPos = getNodePosition(
              directionIndex,
              config.maxDepth,
              config
            );
            return (
              <text
                x={lastPos.x}
                y={lastPos.y + config.nodeHeight / 2 + 20}
                textAnchor="middle"
                className="text-xs fill-amber-400"
                style={{ fontSize: '10px' }}
              >
                Depth {config.maxDepth}/{config.maxDepth} reached
              </text>
            );
          })()}
        </motion.g>
      )}
    </motion.g>
  );
}

export default DirectionRay;
