"use client";

import { useMemo } from "react";

interface PixelParticlesProps {
  /** Number of particles */
  count?: number;
  /** Color palette for particles */
  colors?: string[];
  /** Minimum size in px */
  minSize?: number;
  /** Maximum size in px */
  maxSize?: number;
  className?: string;
}

/** Deterministic pseudo-random from seed */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * CSS-only floating pixel dot particles.
 * Uses deterministic positioning for SSR safety,
 * CSS animations for movement.
 */
export function PixelParticles({
  count = 30,
  colors = ["#A34830", "#C07050", "#B89060", "#C8A838", "#A35050"],
  minSize = 2,
  maxSize = 4,
  className = "",
}: PixelParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const r1 = seededRandom(i * 3 + 1);
      const r2 = seededRandom(i * 3 + 2);
      const r3 = seededRandom(i * 3 + 3);
      const r4 = seededRandom(i * 7 + 11);
      const r5 = seededRandom(i * 11 + 7);

      return {
        left: `${(r1 * 100).toFixed(4)}%`,
        top: `${(r2 * 100).toFixed(4)}%`,
        size: `${(minSize + r3 * (maxSize - minSize)).toFixed(4)}px`,
        color: colors[Math.floor(r4 * colors.length)],
        duration: (4 + r5 * 6).toFixed(4), // 4-10s
        delay: (r1 * 4).toFixed(4), // 0-4s
      };
    });
  }, [count, colors, minSize, maxSize]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[1] overflow-hidden hidden md:block ${className}`}
      aria-hidden="true"
    >
      {particles.map((p, i) => {
        // Some particles are larger "glow" particles with lower opacity
        const isGlow = seededRandom(i * 13 + 5) > 0.75;
        const sizeNum = parseFloat(p.size);
        const glowSize = `${(isGlow ? sizeNum * 2.5 : sizeNum).toFixed(4)}px`;
        const glowOpacity = isGlow ? "0.15" : "0.4";

        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: glowSize,
              height: glowSize,
              backgroundColor: p.color,
              opacity: glowOpacity,
              boxShadow: `0 0 ${isGlow ? 12 : 6}px ${p.color}`,
              animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite${isGlow ? ", ht-breathe-slow 12s ease-in-out infinite" : ""}`,
            }}
          />
        );
      })}
    </div>
  );
}
