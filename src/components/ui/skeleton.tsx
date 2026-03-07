interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-none border border-[#0a0a0a]/10 bg-[var(--color-surface-2)] ${className}`}
      style={{ width, height }}
      data-agent-state="loading"
    >
      {/* Barcode-strip pattern underneath */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, #0a0a0a 0px, #0a0a0a 2px, transparent 2px, transparent 4px, #0a0a0a 4px, #0a0a0a 5px, transparent 5px, transparent 8px)",
        }}
      />
      {/* Pink shimmer sweep */}
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(229,0,90,0.15), rgba(229,0,90,0.25), rgba(229,0,90,0.15), transparent)",
          animation: "shimmer 2s infinite",
        }}
      />
    </div>
  );
}
