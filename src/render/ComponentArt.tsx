import { useMemo } from 'react';
import type { ComponentKind } from '../model/types';
import { buildScene, type Shape } from './proceduralArt';

function renderShape(shape: Shape, i: number) {
  switch (shape.t) {
    case 'poly':
      return (
        <polygon
          key={i}
          points={shape.points}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.sw}
          strokeLinejoin="round"
        />
      );
    case 'ellipse':
      return <ellipse key={i} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={shape.fill} />;
    case 'circle':
      return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
    case 'line':
      return (
        <line key={i} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={shape.sw} strokeLinecap="round" />
      );
    case 'text':
      return (
        <text
          key={i}
          x={shape.x}
          y={shape.y}
          fill={shape.fill}
          fontSize={shape.size}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="system-ui, sans-serif"
        >
          {shape.value}
        </text>
      );
    default:
      return null;
  }
}

export interface ComponentArtProps {
  kind: ComponentKind;
  name: string;
  description?: string;
  size?: number;
  className?: string;
}

/** Renders the deterministic procedural isometric art for a component. */
export function ComponentArt({ kind, name, description, size = 96, className }: ComponentArtProps) {
  const scene = useMemo(() => buildScene({ kind, name, description }), [kind, name, description]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`${kind} ${name}`}
    >
      {scene.shapes.map(renderShape)}
    </svg>
  );
}
