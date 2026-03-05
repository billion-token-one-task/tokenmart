"use client";

interface GrainOverlayProps {
  /** Opacity of the grain texture (0-1). Default 0.5 */
  opacity?: number;
  /** Blend mode. Default "soft-light" */
  blendMode?: "soft-light" | "multiply" | "screen" | "overlay";
  /** Additional classes */
  className?: string;
}

/**
 * Film grain overlay component.
 * SVG feTurbulence-based tactile texture that adds organic depth.
 * Ported from 4oreverAI design system.
 */
export function GrainOverlay({
  opacity = 0.05,
  blendMode = "multiply",
  className = "",
}: GrainOverlayProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none z-[50] ${className}`}
      aria-hidden="true"
      style={{
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`,
        mixBlendMode: blendMode,
        opacity,
        borderRadius: "inherit",
      }}
    />
  );
}
