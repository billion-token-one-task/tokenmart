"use client";

import { useMemo } from "react";

interface HalftoneSvgProps {
  className?: string;
  centerX?: number;
  centerY?: number;
  color?: string;
  maxRadius?: number;
  spacing?: number;
  spread?: number;
  width?: number;
  height?: number;
}

/**
 * SVG Halftone dot field.
 * Procedurally generates distance-based circles that shrink away from a focal point.
 * Ported from 4oreverAI with warm terracotta palette.
 */
export function HalftoneSvg({
  className,
  centerX = 0.65,
  centerY = 0.25,
  color = "oklch(0.52 0.15 28 / 0.13)",
  maxRadius = 4.5,
  spacing = 14,
  spread = 0.5,
  width = 600,
  height = 500,
}: HalftoneSvgProps) {
  const circles = useMemo(() => {
    const cx = centerX * width;
    const cy = centerY * height;
    const maxDist = Math.sqrt(width ** 2 + height ** 2) * spread;
    const out: Array<{ cx: number; cy: number; r: number }> = [];

    for (let x = spacing / 2; x < width; x += spacing) {
      for (let y = spacing / 2; y < height; y += spacing) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const t = Math.min(dist / maxDist, 1);
        const r = maxRadius * (1 - t * t);
        if (r > 0.3) {
          out.push({
            cx: Number(x.toFixed(1)),
            cy: Number(y.toFixed(1)),
            r: Number(r.toFixed(2)),
          });
        }
      }
    }

    return out;
  }, [centerX, centerY, maxRadius, spacing, spread, width, height]);

  return (
    <svg
      className={`pointer-events-none select-none ${className || ""}`}
      viewBox={`0 0 ${width} ${height}`}
      fill={color}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {circles.map((c, idx) => (
        <circle key={idx} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
    </svg>
  );
}
