interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[rgba(255,255,255,0.04)] ${className}`}
      style={{ width, height }}
      data-agent-state="loading"
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.04)] to-transparent"
        style={{ animation: "shimmer 2s infinite" }}
      />
    </div>
  );
}
