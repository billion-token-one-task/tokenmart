"use client";

import { useState, ReactNode } from "react";
import { resolveSectionConfig } from "@/lib/ui-shell";

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
  /** Gradient colors for active underline */
  gradient?: string;
}

export function Tabs({ tabs, defaultTab, onChange, children, gradient }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id || "");
  const section = resolveSectionConfig({ gradient });

  const handleChange = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  const gradientStyle = gradient
    ? undefined
    : `linear-gradient(90deg, ${section.accentFrom}, ${section.accentTo})`;

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-[rgba(255,255,255,0.08)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`relative -mb-px rounded-t-[18px] border border-b-0 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              active === tab.id
                ? "border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(15,18,27,0.9),rgba(8,10,16,0.94))] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
            data-agent-role="tab"
            data-agent-value={tab.id}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 font-mono text-[11px] tabular-nums">
                {tab.count}
              </span>
            )}
            {active === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                style={{
                  background:
                    gradient ||
                    gradientStyle,
                }}
              />
            )}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
