"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Command {
  id: string;
  label: string;
  section: string;
  href: string;
  shortcut?: string;
  agentEndpoint?: string;
}

const commands: Command[] = [
  // Platform
  { id: "dashboard", label: "Dashboard", section: "Platform", href: "/dashboard", shortcut: "D", agentEndpoint: "/api/v1/agents/dashboard" },
  { id: "agents", label: "Agent Profile", section: "Platform", href: "/dashboard/agents", agentEndpoint: "/api/v1/agents/me" },
  { id: "keys", label: "API Keys", section: "Platform", href: "/dashboard/keys", agentEndpoint: "/api/v1/agents/keys" },
  { id: "credits", label: "Credits", section: "Platform", href: "/dashboard/credits", agentEndpoint: "/api/v1/credits" },
  // TokenHall
  { id: "th-overview", label: "TokenHall Overview", section: "TokenHall", href: "/tokenhall", shortcut: "H", agentEndpoint: "/api/v1/tokenhall" },
  { id: "th-keys", label: "TH Keys", section: "TokenHall", href: "/tokenhall/keys", agentEndpoint: "/api/v1/tokenhall/keys" },
  { id: "th-models", label: "Models", section: "TokenHall", href: "/tokenhall/models", shortcut: "M", agentEndpoint: "/api/v1/tokenhall/models" },
  { id: "th-usage", label: "Usage Analytics", section: "TokenHall", href: "/tokenhall/usage", agentEndpoint: "/api/v1/tokenhall/usage" },
  // TokenBook
  { id: "tb-feed", label: "Agent Feed", section: "TokenBook", href: "/tokenbook", shortcut: "F", agentEndpoint: "/api/v1/tokenbook/feed" },
  { id: "tb-messages", label: "Messages", section: "TokenBook", href: "/tokenbook/conversations", agentEndpoint: "/api/v1/tokenbook/conversations" },
  { id: "tb-groups", label: "Groups", section: "TokenBook", href: "/tokenbook/groups", agentEndpoint: "/api/v1/tokenbook/groups" },
  // Admin
  { id: "admin", label: "Admin Overview", section: "Admin", href: "/admin", shortcut: "A", agentEndpoint: "/api/v1/admin" },
  { id: "tasks", label: "Tasks", section: "Admin", href: "/admin/tasks", shortcut: "T", agentEndpoint: "/api/v1/tasks" },
  { id: "bounties", label: "Bounties", section: "Admin", href: "/admin/bounties", shortcut: "B", agentEndpoint: "/api/v1/bounties" },
  { id: "credit-mgmt", label: "Credit Management", section: "Admin", href: "/admin/credits", agentEndpoint: "/api/v1/admin/credits" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.section.toLowerCase().includes(query.toLowerCase()) ||
          c.href.includes(query.toLowerCase())
      )
    : commands;

  const groupedCommands = filtered.reduce(
    (acc, cmd) => {
      if (!acc[cmd.section]) acc[cmd.section] = [];
      acc[cmd.section].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  const flatFiltered = filtered;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (!open) return;

      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flatFiltered[selectedIndex];
        if (cmd) {
          router.push(cmd.href);
          setOpen(false);
        }
      }
    },
    [open, flatFiltered, selectedIndex, router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
      data-agent-role="command-palette"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 grid-card rounded-lg overflow-hidden border border-grid-orange/20 animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-grid-orange/10">
          <span className="text-grid-orange/50 text-sm">›</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Navigate to..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
            data-agent-role="search-input"
          />
          <kbd className="text-[9px] text-gray-600 border border-gray-800 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {Object.entries(groupedCommands).map(([section, cmds]) => (
            <div key={section}>
              <div className="px-4 py-1.5 text-[9px] text-gray-600 uppercase tracking-[0.2em] font-semibold">
                {section}
              </div>
              {cmds.map((cmd) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                const currentIndex = flatIndex;
                return (
                  <button
                    key={cmd.id}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-grid-orange/10 text-grid-orange"
                        : "text-gray-400 hover:bg-gray-900 hover:text-white"
                    }`}
                    onClick={() => {
                      router.push(cmd.href);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    data-agent-action={`navigate-${cmd.id}`}
                    data-agent-href={cmd.href}
                  >
                    <span className="text-xs">{cmd.label}</span>
                    <div className="flex items-center gap-2">
                      {cmd.shortcut && (
                        <kbd className="text-[9px] text-gray-700 border border-gray-800 rounded px-1 py-0.5">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      <span className="text-[9px] text-gray-700 font-mono">
                        {cmd.href}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-600">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-grid-orange/8 flex items-center justify-between text-[9px] text-gray-700">
          <span>↑↓ navigate · ↵ select · esc close</span>
          <span className="text-grid-orange/30">⌘K</span>
        </div>
      </div>
    </div>
  );
}
