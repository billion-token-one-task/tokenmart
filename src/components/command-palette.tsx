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
      <div className="absolute inset-0 bg-black/72 backdrop-blur-md" />

      <div
        className="relative w-full max-w-[620px] overflow-hidden bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-[12px] shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-[#444]">
              Command Palette
            </span>
            <kbd className="bg-[rgba(255,255,255,0.04)] rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] text-[#444]">
              ESC
            </kbd>
          </div>
          <div className="flex items-center gap-3 rounded-md bg-transparent px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#444]">
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
              className="w-full bg-transparent text-[14px] text-[#ededed] placeholder:text-[#444] outline-none"
              data-agent-role="search-input"
            />
            <span className="font-mono text-[10px] text-[#444]">
              {filtered.length.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-3 py-3">
          {groupedCommands.map(([sectionId, sectionCommands]) => {
            const section = getSectionById(sectionId);

            return (
              <section key={sectionId} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between px-2 font-mono text-[10px] text-[#666]">
                  <span>{section.label}</span>
                  <span className="font-mono text-[9px] text-[#444]">
                    {section.hintLabel}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {sectionCommands.map((command) => {
                    const currentIndex = selectedIndexById.get(command.id) ?? 0;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        className={`w-full rounded-md px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? "bg-[rgba(255,255,255,0.06)]"
                            : "bg-transparent hover:bg-[rgba(255,255,255,0.04)]"
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
                              <span className={`text-[13px] ${isSelected ? "text-[#ededed]" : "text-[#a1a1a1]"}`}>
                                {command.label}
                              </span>
                              <span className="font-mono text-[10px] text-[#444]">
                                {section.eyebrow}
                              </span>
                            </div>
                            <div className="mt-1 font-mono text-[11px] text-[#444]">
                              {command.href}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {command.shortcut && (
                              <kbd className="bg-[rgba(255,255,255,0.04)] rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] text-[#444]">
                                {command.shortcut}
                              </kbd>
                            )}
                            <span className="h-2 w-2 rounded-full bg-[#666]" />
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
            <div className="rounded-md bg-[rgba(255,255,255,0.04)] px-4 py-10 text-center">
              <div className="font-mono text-[10px] text-[#444]">
                No matches
              </div>
              <div className="mt-2 text-[13px] text-[#a1a1a1]">
                No routes or commands matched &ldquo;{query}&rdquo;.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.08)] px-4 py-3 font-mono text-[10px] text-[#444]">
          <span>Arrow Keys Navigate</span>
          <span>Enter Opens</span>
        </div>
      </div>
    </div>
  );
}
