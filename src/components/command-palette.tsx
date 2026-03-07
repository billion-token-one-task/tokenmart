"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { flattenShellCommands, getSectionById, shellSectionOrder } from "@/lib/ui-shell";

const commands = flattenShellCommands();

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query
    ? commands.filter((command) =>
        [command.label, command.href, command.section]
          .some((value) => value.toLowerCase().includes(query.toLowerCase()))
      )
    : commands;

  const groupedCommands = shellSectionOrder.reduce((acc, sectionId) => {
    const sectionItems = filtered.filter((command) => command.section === sectionId);
    if (sectionItems.length > 0) {
      acc.push([sectionId, sectionItems] as const);
    }
    return acc;
  }, [] as Array<readonly [typeof shellSectionOrder[number], typeof filtered]>);
  const selectedIndexById = new Map(filtered.map((command, index) => [command.id, index]));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }

      if (!open) return;

      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, filtered.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const command = filtered[selectedIndex];
        if (command) {
          router.push(command.href);
          setOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered, open, router, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      onClick={() => setOpen(false)}
      data-agent-role="command-palette"
    >
      <div className="absolute inset-0 bg-[rgba(10,10,10,0.25)] backdrop-blur-sm" />

      <div
        className="viewfinder relative w-full max-w-[620px] overflow-hidden border-2 border-[#0a0a0a] bg-[var(--color-surface-0)] shadow-[4px_4px_0px_#0a0a0a]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Pink accent stripe at top */}
        <div className="h-[4px] w-full bg-[#e5005a]" aria-hidden="true" />

        {/* Scanline overlay */}
        <div className="pointer-events-none absolute inset-0 scanline-overlay opacity-[0.03]" aria-hidden="true" />

        <div className="border-b-2 border-[#0a0a0a] px-4 py-3">
          {/* Data readout */}
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="barcode-label">
                Route index
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#e5005a]">
                :: ACTIVE
              </span>
            </div>
            <kbd className="border-2 border-[#0a0a0a] bg-[var(--color-canvas)] px-1.5 py-0.5 font-mono text-[10px] text-[#0a0a0a]">
              ESC
            </kbd>
          </div>
          <div className="flex items-center gap-3 border-2 border-[#0a0a0a] bg-[var(--color-canvas-strong)] px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-tertiary)]">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search routes, modules, and surfaces"
              className="w-full bg-transparent font-mono text-[13px] text-[#0a0a0a] placeholder:text-[var(--color-text-tertiary)] outline-none"
              data-agent-role="search-input"
            />
            <span className="font-mono text-[10px] text-[#e5005a]">
              {filtered.length.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-3 py-3">
          {groupedCommands.map(([sectionId, sectionCommands]) => {
            const section = getSectionById(sectionId);

            return (
              <section key={sectionId} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]">
                  <span className="flex items-center gap-1">
                    <span className="text-[#e5005a]" aria-hidden="true">+</span>
                    <span>{section.label}</span>
                  </span>
                  <span className="font-mono text-[9px] text-[var(--color-text-tertiary)]">
                    {section.hintLabel}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {sectionCommands.map((command) => {
                    const currentIndex = selectedIndexById.get(command.id) ?? 0;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        className={`w-full border-2 px-3 py-3 text-left transition-all ${
                          isSelected
                            ? "border-[#e5005a] bg-[#e5005a] text-white"
                            : "border-transparent bg-transparent hover:border-[#0a0a0a] hover:bg-[rgba(255,255,255,0.62)]"
                        }`}
                        data-selected={isSelected ? "true" : "false"}
                        onClick={() => {
                          router.push(command.href);
                          setOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        data-agent-action={`navigate-${command.id}`}
                        data-agent-href={command.href}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[13px] ${isSelected ? "text-white font-medium" : "text-[var(--color-text-secondary)]"}`}>
                                {command.label}
                              </span>
                              <span className={`font-mono text-[10px] ${isSelected ? "text-[rgba(255,255,255,0.7)]" : "text-[var(--color-text-tertiary)]"}`}>
                                {section.eyebrow}
                              </span>
                            </div>
                            <div className={`mt-1 font-mono text-[11px] ${isSelected ? "text-[rgba(255,255,255,0.6)]" : "text-[var(--color-text-tertiary)]"}`}>
                              {command.href}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {command.shortcut && (
                              <kbd className={`border-2 px-1.5 py-0.5 font-mono text-[10px] ${
                                isSelected
                                  ? "border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.8)]"
                                  : "border-[#0a0a0a] bg-[var(--color-canvas)] text-[#0a0a0a]"
                              }`}>
                                {command.shortcut}
                              </kbd>
                            )}
                            <span className={`h-2 w-2 ${isSelected ? "bg-white" : "bg-[#e5005a]"}`} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="border-2 border-[#0a0a0a] bg-[var(--color-canvas-strong)] px-4 py-10 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                NO MATCHES :: NULL
              </div>
              <div className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
                No routes or commands matched &ldquo;{query}&rdquo;.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t-2 border-[#0a0a0a] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="border border-[#0a0a0a] px-1 py-0.5 text-[9px]">&uarr;&darr;</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-[#0a0a0a] px-1 py-0.5 text-[9px]">&crarr;</kbd>
              <span>Open</span>
            </span>
          </div>
          <span className="text-[8px] text-[var(--color-text-quaternary)]">CMD::PALETTE</span>
        </div>
      </div>
    </div>
  );
}
