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

/* Viewfinder bracket corners */
function ViewfinderBrackets() {
  const b = "absolute w-2.5 h-2.5 pointer-events-none";
  return (
    <>
      <span className={`${b} top-0 left-0 border-t-2 border-l-2 border-[#e5005a]`} aria-hidden="true" />
      <span className={`${b} top-0 right-0 border-t-2 border-r-2 border-[#e5005a]`} aria-hidden="true" />
      <span className={`${b} bottom-0 left-0 border-b-2 border-l-2 border-[#e5005a]`} aria-hidden="true" />
      <span className={`${b} bottom-0 right-0 border-b-2 border-r-2 border-[#e5005a]`} aria-hidden="true" />
    </>
  );
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
    positive: "text-[var(--color-success)]",
    negative: "text-[var(--color-error)]",
    neutral: "text-[var(--color-text-tertiary)]",
  };

  const changeArrows: Record<string, string> = {
    positive: "\u25B2",
    negative: "\u25BC",
    neutral: "",
  };

  return (
    <div
      className="group relative flex flex-col gap-1 rounded-none border-2 border-[#0a0a0a] bg-white px-4 py-4 transition-all duration-150 hover:border-[#e5005a] hover:bg-[#e5005a]"
      data-agent-role="stat"
      data-agent-key={label}
      data-agent-value={value}
    >
      <ViewfinderBrackets />
      {/* Data readout label */}
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--color-text-tertiary)] group-hover:text-white transition-colors">{icon}</span>}
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/70 transition-colors">
          {label}
        </span>
      </div>
      {/* Large display number */}
      <div className="flex items-baseline gap-2">
        <span
          className={`font-display text-[2.2rem] font-black uppercase leading-none tracking-tight tabular-nums transition-colors ${
            gradient ? (gradientClass || "gradient-text") : "text-[#0a0a0a] group-hover:text-white"
          }`}
        >
          {value}
        </span>
        {change && (
          <span className={`font-mono text-[10px] font-bold tabular-nums uppercase tracking-[0.1em] ${changeColors[changeType]} group-hover:text-white/80 transition-colors`}>
            {changeArrows[changeType]} {change}
          </span>
        )}
      </div>
      {/* Sublabel line */}
      <div className="mt-1 h-px w-full bg-[#0a0a0a]/10 group-hover:bg-white/20 transition-colors" />
      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] group-hover:text-white/50 transition-colors">
        LIVE DATA
      </span>
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
