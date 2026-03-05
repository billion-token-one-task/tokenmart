interface NoiseTextureProps {
  opacity?: number;
  size?: number;
  className?: string;
}

export function NoiseTexture({
  opacity = 0.04,
  size = 8,
  className = "",
}: NoiseTextureProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none z-[1] ${className}`}
      style={{
        background: `radial-gradient(circle, rgba(255,255,255,${opacity}) 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        borderRadius: "inherit",
      }}
      aria-hidden="true"
    />
  );
}
