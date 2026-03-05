interface StatProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}

export function Stat({ label, value, change, changeType = "neutral", icon }: StatProps) {
  const changeColors = {
    positive: "text-grid-green",
    negative: "text-red-400",
    neutral: "text-gray-600",
  };

  return (
    <div className="flex flex-col gap-1" data-agent-role="stat" data-agent-key={label} data-agent-value={value}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-grid-orange/40">{icon}</span>}
        <span className="text-[9px] font-medium text-gray-600 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-white tracking-wider">{value}</span>
        {change && (
          <span className={`text-[10px] font-medium font-mono ${changeColors[changeType]}`}>{change}</span>
        )}
      </div>
    </div>
  );
}

export function StatGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {children}
    </div>
  );
}
