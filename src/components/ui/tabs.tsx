"use client";

import { useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  children: (activeTab: string) => ReactNode;
  /** Gradient colors for active underline (ignored in Vercel rebrand -- solid white used) */
  gradient?: string;
}

export function Tabs({ tabs, defaultTab, onChange, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id || "");

  const handleChange = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div>
      <div className="mb-5 flex gap-0 border-b-2 border-[#0a0a0a]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`relative -mb-[2px] border-b-[3px] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-all duration-150 ${
              active === tab.id
                ? "border-[#e5005a] bg-[#0a0a0a] text-white"
                : "border-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-1)] hover:text-[#0a0a0a]"
            }`}
            data-agent-role="tab"
            data-agent-value={tab.id}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-2 rounded-none border-2 px-1.5 py-0 font-mono text-[10px] tabular-nums ${
                active === tab.id
                  ? "border-[#e5005a] bg-[#e5005a] text-white"
                  : "border-[#0a0a0a] bg-transparent text-[var(--color-text-tertiary)]"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
