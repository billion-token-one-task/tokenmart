"use client";

interface HalftoneOverlayProps {
  trustTier?: 0 | 1 | 2 | 3;
  variant?: "dots" | "lines" | "noise";
  className?: string;
}

const tierConfig = {
  0: { opacity: 0.12, grid: "4px" },
  1: { opacity: 0.08, grid: "6px" },
  2: { opacity: 0.04, grid: "10px" },
  3: { opacity: 0.01, grid: "20px" },
};

export function HalftoneOverlay({
  trustTier = 1,
  variant = "dots",
  className = "",
}: HalftoneOverlayProps) {
  const config = tierConfig[trustTier];

  const backgrounds: Record<string, string> = {
    dots: `radial-gradient(circle, rgba(255,255,255,${config.opacity}) 1px, transparent 1px)`,
    lines: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,${config.opacity}) 2px, rgba(255,255,255,${config.opacity}) 4px)`,
    noise: `radial-gradient(circle, rgba(255,255,255,${config.opacity}) 0.5px, transparent 0.5px)`,
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-[1] ${className}`}
      style={{
        background: backgrounds[variant],
        backgroundSize: `${config.grid} ${config.grid}`,
        borderRadius: "inherit",
      }}
      aria-hidden="true"
      data-agent-role="halftone-overlay"
      data-agent-value={`tier-${trustTier}`}
    />
  );
}
