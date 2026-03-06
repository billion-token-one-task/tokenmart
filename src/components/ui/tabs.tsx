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
      <div className="mb-5 flex gap-5 border-b border-[rgba(255,255,255,0.08)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`relative -mb-px border-b px-0 py-2 text-[13px] font-medium transition-colors ${
              active === tab.id
                ? "border-white text-[#ededed]"
                : "border-transparent text-[#666] hover:text-[#a1a1a1]"
            }`}
            data-agent-role="tab"
            data-agent-value={tab.id}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                {tab.count}
              </span>
            )}
            {active === tab.id && (
              <div
                className="absolute bottom-[-1px] left-0 right-0 h-px bg-[rgba(255,255,255,0.8)]"
              />
            )}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
