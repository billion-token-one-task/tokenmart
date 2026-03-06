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
    positive: "text-[#50e3c2]",
    negative: "text-[#ee0000]",
    neutral: "text-[#666]",
  };

  // Pixel-art up/down arrows
  const changeArrows: Record<string, string> = {
    positive: "\u25B2",
    negative: "\u25BC",
    neutral: "",
  };

  return (
    <div className="flex flex-col gap-2" data-agent-role="stat" data-agent-key={label} data-agent-value={value}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-[#444]">{icon}</span>}
        <span className="font-mono text-[11px] text-[#666]">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-[1.9rem] font-semibold tabular-nums font-mono tracking-[-0.04em] ${
            gradient ? (gradientClass || "gradient-text") : "text-[#ededed]"
          }`}
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
    </div>
  );
}

export function StatGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {children}
    </div>
  );
}
