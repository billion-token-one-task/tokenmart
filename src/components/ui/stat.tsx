"use client";

interface StatProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  /** Apply gradient to value text */
  gradient?: boolean;
  /** Gradient class override */
  gradientClass?: string;
}

export function Stat({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  gradient,
  gradientClass,
}: StatProps) {
  const changeColors = {
    positive: "text-[#7ee787]",
    negative: "text-[#ff7b72]",
    neutral: "text-[var(--color-text-tertiary)]",
  };

  // Pixel-art up/down arrows
  const changeArrows: Record<string, string> = {
    positive: "\u25B2",
    negative: "\u25BC",
    neutral: "",
  };

  return (
    <div className="flex flex-col gap-1.5 relative" data-agent-role="stat" data-agent-key={label} data-agent-value={value}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--color-text-quaternary)]">{icon}</span>}
        <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-[1.9rem] font-semibold tabular-nums font-mono tracking-[-0.04em] ${
            gradient ? (gradientClass || "gradient-text") : "text-[#ededed]"
          }`}
          style={gradient ? { animation: "glow-breathe 3.5s ease-in-out infinite" } : undefined}
        >
          {value}
        </span>
        {change && (
          <span className={`text-[12px] font-medium font-mono tabular-nums ${changeColors[changeType]}`}>
            {changeArrows[changeType]} {change}
          </span>
        )}
      </div>
      {/* Luminous edge accent for positive changes */}
      {changeType === "positive" && (
        <div
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full opacity-40"
          style={{ background: "linear-gradient(180deg, #7ee787, #7aa2ff)" }}
        />
      )}
    </div>
  );
}

export function StatGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {children}
    </div>
  );
}
