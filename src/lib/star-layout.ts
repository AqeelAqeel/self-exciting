// Star Canvas Layout Mathematics
// Radial positioning for directions and nodes

import type { StarLayoutConfig, Direction, GenerationNode } from '@/types/salience';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_STAR_CONFIG: StarLayoutConfig = {
  numDirections: 6,
  maxDepth: 5,
  baseRadius: 200,     // Distance from seed to depth 1
  radiusStep: 180,     // Distance between depth levels
  nodeWidth: 280,
  nodeHeight: 200,
};

// =============================================================================
// ANGLE CALCULATIONS
// =============================================================================

/**
 * Calculate the angle (in radians) for a direction index.
 * Starts from top (-PI/2) and goes clockwise.
 */
export function getDirectionAngle(
  directionIndex: number,
  numDirections: number
): number {
  const startAngle = -Math.PI / 2; // Start from top
  const angleStep = (2 * Math.PI) / numDirections;
  return startAngle + directionIndex * angleStep;
}

/**
 * Convert radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Get the rotation angle for a direction label (for text alignment).
 */
export function getLabelRotation(
  directionIndex: number,
  numDirections: number
): number {
  const angle = getDirectionAngle(directionIndex, numDirections);
  const degrees = radiansToDegrees(angle);

  // Rotate text to be readable (not upside down)
  if (degrees > 90 || degrees < -90) {
    return degrees + 180;
  }
  return degrees;
}

// =============================================================================
// POSITION CALCULATIONS
// =============================================================================

export interface Position {
  x: number;
  y: number;
}

/**
 * Calculate position for a node at given direction and depth.
 * Seed is at (0, 0), nodes radiate outward.
 */
export function getNodePosition(
  directionIndex: number,
  depth: number,
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): Position {
  const angle = getDirectionAngle(directionIndex, config.numDirections);
  const radius = config.baseRadius + (depth - 1) * config.radiusStep;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

/**
 * Get seed node position (always center).
 */
export function getSeedPosition(): Position {
  return { x: 0, y: 0 };
}

/**
 * Calculate all node positions for a direction.
 */
export function getDirectionNodePositions(
  directionIndex: number,
  nodeCount: number,
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): Position[] {
  const positions: Position[] = [];

  for (let depth = 1; depth <= nodeCount; depth++) {
    positions.push(getNodePosition(directionIndex, depth, config));
  }

  return positions;
}

// =============================================================================
// LABEL POSITIONING
// =============================================================================

export interface LabelPosition extends Position {
  textAnchor: 'start' | 'middle' | 'end';
  alignmentBaseline: 'middle' | 'hanging' | 'baseline';
}

/**
 * Calculate label position for a direction.
 * Labels are positioned just outside the first node.
 */
export function getLabelPosition(
  directionIndex: number,
  numDirections: number,
  labelOffset: number = 80
): LabelPosition {
  const angle = getDirectionAngle(directionIndex, numDirections);
  const x = Math.cos(angle) * labelOffset;
  const y = Math.sin(angle) * labelOffset;

  // Determine text alignment based on position
  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  let alignmentBaseline: 'middle' | 'hanging' | 'baseline' = 'middle';

  if (x > 20) textAnchor = 'start';
  else if (x < -20) textAnchor = 'end';

  if (y > 20) alignmentBaseline = 'hanging';
  else if (y < -20) alignmentBaseline = 'baseline';

  return { x, y, textAnchor, alignmentBaseline };
}

// =============================================================================
// CONNECTOR PATHS
// =============================================================================

/**
 * Get SVG path string for a straight connector line.
 */
export function getConnectorPath(from: Position, to: Position): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

/**
 * Get SVG path string for a curved connector (bezier).
 */
export function getCurvedConnectorPath(
  from: Position,
  to: Position,
  curvature: number = 0.3
): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Calculate perpendicular offset for control point
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular direction
  const perpX = -dy / length;
  const perpY = dx / length;

  // Control point offset
  const controlOffset = length * curvature;
  const controlX = midX + perpX * controlOffset;
  const controlY = midY + perpY * controlOffset;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

/**
 * Get all connector paths for a direction's nodes.
 */
export function getDirectionConnectorPaths(
  directionIndex: number,
  nodeCount: number,
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): { id: string; path: string; fromDepth: number; toDepth: number }[] {
  const paths: { id: string; path: string; fromDepth: number; toDepth: number }[] = [];

  for (let depth = 0; depth < nodeCount; depth++) {
    const fromPos = depth === 0 ? getSeedPosition() : getNodePosition(directionIndex, depth, config);
    const toPos = getNodePosition(directionIndex, depth + 1, config);

    paths.push({
      id: `connector-${directionIndex}-${depth}`,
      path: getConnectorPath(fromPos, toPos),
      fromDepth: depth,
      toDepth: depth + 1,
    });
  }

  return paths;
}

// =============================================================================
// VIEWPORT CALCULATIONS
// =============================================================================

/**
 * Calculate the bounding box for the entire star layout.
 */
export function getStarBoundingBox(
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  const maxRadius = config.baseRadius + (config.maxDepth - 1) * config.radiusStep;
  const padding = Math.max(config.nodeWidth, config.nodeHeight) / 2 + 50;
  const totalRadius = maxRadius + padding;

  return {
    minX: -totalRadius,
    minY: -totalRadius,
    maxX: totalRadius,
    maxY: totalRadius,
    width: totalRadius * 2,
    height: totalRadius * 2,
  };
}

/**
 * Calculate the viewBox string for an SVG element.
 */
export function getStarViewBox(
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): string {
  const bbox = getStarBoundingBox(config);
  return `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`;
}

/**
 * Calculate the center point for the canvas.
 */
export function getStarCenter(
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): Position {
  const bbox = getStarBoundingBox(config);
  return {
    x: bbox.width / 2,
    y: bbox.height / 2,
  };
}

// =============================================================================
// HIT TESTING
// =============================================================================

/**
 * Check if a point is within a node's bounds.
 */
export function isPointInNode(
  point: Position,
  nodeCenter: Position,
  nodeWidth: number,
  nodeHeight: number
): boolean {
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  return (
    point.x >= nodeCenter.x - halfWidth &&
    point.x <= nodeCenter.x + halfWidth &&
    point.y >= nodeCenter.y - halfHeight &&
    point.y <= nodeCenter.y + halfHeight
  );
}

/**
 * Find the node at a given point.
 */
export function findNodeAtPoint(
  point: Position,
  directions: Direction[],
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): { directionIndex: number; nodeIndex: number; node: GenerationNode } | null {
  for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
    const direction = directions[dirIndex];

    for (let nodeIndex = 0; nodeIndex < direction.nodes.length; nodeIndex++) {
      const nodePos = getNodePosition(dirIndex, nodeIndex + 1, config);

      if (isPointInNode(point, nodePos, config.nodeWidth, config.nodeHeight)) {
        return {
          directionIndex: dirIndex,
          nodeIndex,
          node: direction.nodes[nodeIndex],
        };
      }
    }
  }

  return null;
}

// =============================================================================
// ANIMATION HELPERS
// =============================================================================

/**
 * Calculate the animation delay for staggered node appearance.
 */
export function getNodeAnimationDelay(
  directionIndex: number,
  depth: number,
  numDirections: number
): number {
  const baseDelay = 0.1; // seconds
  const directionDelay = directionIndex * 0.05;
  const depthDelay = depth * 0.15;

  return baseDelay + directionDelay + depthDelay;
}

/**
 * Get animation properties for a node entering the canvas.
 */
export function getNodeEntryAnimation(
  directionIndex: number,
  depth: number,
  numDirections: number
) {
  const angle = getDirectionAngle(directionIndex, numDirections);
  const delay = getNodeAnimationDelay(directionIndex, depth, numDirections);

  return {
    initial: {
      opacity: 0,
      scale: 0.8,
      x: Math.cos(angle) * -50,
      y: Math.sin(angle) * -50,
    },
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
    },
    transition: {
      delay,
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  };
}

// =============================================================================
// DEPTH INDICATORS
// =============================================================================

/**
 * Generate concentric ring positions for depth indicators.
 */
export function getDepthRings(
  config: StarLayoutConfig = DEFAULT_STAR_CONFIG
): { depth: number; radius: number }[] {
  const rings: { depth: number; radius: number }[] = [];

  for (let depth = 1; depth <= config.maxDepth; depth++) {
    rings.push({
      depth,
      radius: config.baseRadius + (depth - 1) * config.radiusStep,
    });
  }

  return rings;
}

export default {
  DEFAULT_STAR_CONFIG,
  getDirectionAngle,
  getNodePosition,
  getSeedPosition,
  getLabelPosition,
  getConnectorPath,
  getCurvedConnectorPath,
  getDirectionConnectorPaths,
  getStarBoundingBox,
  getStarViewBox,
  getStarCenter,
  findNodeAtPoint,
  getNodeAnimationDelay,
  getNodeEntryAnimation,
  getDepthRings,
};
