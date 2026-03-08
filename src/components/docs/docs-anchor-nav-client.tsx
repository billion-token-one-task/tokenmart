"use client";

import { useEffect, useMemo, useState } from "react";

type AnchorItem = { id: string; label: string; eyebrow?: string };

function getHashId() {
  if (typeof window === "undefined") return undefined;
  const hash = window.location.hash.replace(/^#/, "");
  return hash || undefined;
}

export function DocsAnchorNavClient({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: AnchorItem[];
  compact?: boolean;
}) {
  const fallbackId = items[0]?.id;
  const [activeId, setActiveId] = useState<string | undefined>(
    getHashId() ?? fallbackId,
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    const syncHash = () => setActiveId(getHashId() ?? fallbackId);

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, [fallbackId]);

  useEffect(() => {
    const sections = itemIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          );

        const nextId = visibleEntries[0]?.target.id;
        if (nextId) setActiveId(nextId);
      },
      {
        rootMargin: "-18% 0px -58% 0px",
        threshold: [0, 0.2, 0.4, 0.7],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [itemIds]);

  if (compact) {
    return (
      <nav
        aria-label={title}
        className="rounded-none border-2 border-[#0a0a0a] bg-white p-3 shadow-[4px_4px_0_#0a0a0a]"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          {title}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const active = item.id === activeId;

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`min-w-[160px] shrink-0 rounded-none border-2 px-3 py-2 transition-colors ${
                  active
                    ? "border-[#0a0a0a] bg-[#E5005A] text-white shadow-[3px_3px_0_#0a0a0a]"
                    : "border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] text-[#0a0a0a] hover:bg-[#E5005A] hover:text-white"
                }`}
              >
                <div
                  className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                    active
                      ? "text-white/65"
                      : "text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {item.eyebrow ?? "SECTION"}
                </div>
                <div className="mt-1 text-[12px] font-medium leading-5">
                  {item.label}
                </div>
              </a>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label={title}
      className="rounded-none border-2 border-[#0a0a0a] bg-white p-3 shadow-[4px_4px_0_#0a0a0a]"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
        {title}
      </div>
      <div className="mt-3 space-y-0">
        {items.map((item) => {
          const active = item.id === activeId;

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`group -mt-[2px] block rounded-none border-2 px-3 py-2 transition-colors ${
                active
                  ? "border-[#0a0a0a] bg-[#E5005A] text-white shadow-[3px_3px_0_#0a0a0a]"
                  : "border-transparent bg-[rgba(255,249,252,0.94)] hover:border-[#0a0a0a] hover:bg-[#E5005A] hover:text-white"
              }`}
            >
              <div
                className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                  active
                    ? "text-white/65"
                    : "text-[var(--color-text-tertiary)] group-hover:text-white/70"
                }`}
              >
                {item.eyebrow ?? "SECTION"}
              </div>
              <div
                className={`mt-1 text-[12px] font-medium leading-5 ${
                  active
                    ? "text-white"
                    : "text-[#0a0a0a] group-hover:text-white"
                }`}
              >
                {item.label}
              </div>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
