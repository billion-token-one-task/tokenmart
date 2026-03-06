"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { getSectionById, shellNavSections } from "@/lib/ui-shell";

function iconFor(name: string) {
  const props = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "agent":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" />
        </svg>
      );
    case "key":
      return (
        <svg {...props}>
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      );
    case "coin":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M14.5 9a2.5 2.5 0 0 0-5 0c0 2.5 5 2.5 5 5a2.5 2.5 0 0 1-5 0M12 6v12" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case "bars":
      return (
        <svg {...props}>
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      );
    case "newspaper":
      return (
        <svg {...props}>
          <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2z" />
        </svg>
      );
    case "message":
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <circle cx="9" cy="7" r="3" />
          <circle cx="17" cy="7" r="3" />
          <path d="M3 19c0-3.314 2.686-6 6-6 1.657 0 3.157.672 4.243 1.757M14 19c0-3.314 2.686-6 6-6" />
        </svg>
      );
    case "gear":
      return (
        <svg {...props}>
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.26.604.4 1.256.41 1.92" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "star":
      return (
        <svg {...props}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case "card":
      return (
        <svg {...props}>
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <path d="M1 10h22" />
        </svg>
      );
    default:
      return null;
  }
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.08)] px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#ededed]">
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#ededed]">
            TokenMart
          </span>
        </Link>
      </div>

      {/* Command search */}
      <div className="px-3 py-3">
        <button
          className="flex w-full items-center justify-between rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.06)]"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
        >
          <span className="flex items-center gap-2 text-[12px] text-[#666]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="text-[13px] text-[#666]">Search...</span>
          </span>
          <kbd className="rounded border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 font-mono text-[10px] text-[#444]">
            {"\u2318"}K
          </kbd>
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3" data-agent-role="nav-sections">
        <div className="space-y-5">
          {shellNavSections.map((section) => {
            return (
              <section key={section.id} data-agent-section={section.id}>
                <div className="flex items-center gap-2 px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#444]">
                  <span>{section.title}</span>
                  <span className="flex-1 h-px bg-gradient-to-r from-[rgba(255,255,255,0.06)] to-transparent" />
                  <span className="text-[6px] text-[rgba(255,255,255,0.08)]" aria-hidden="true">┄</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex items-center gap-3 rounded-[6px] px-3 py-2 text-[13px] transition-colors ${
                          active
                            ? "bg-[rgba(255,255,255,0.06)] text-[#ededed]"
                            : "text-[#a1a1a1] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#ededed]"
                        }`}
                        data-agent-action={`navigate-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                        data-agent-href={item.href}
                        data-agent-endpoint={item.agentEndpoint}
                        data-agent-active={active ? "true" : "false"}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[#ededed]" />
                        )}
                        <span className={`shrink-0 ${active ? "text-[#ededed]" : "text-[#666]"}`}>
                          {iconFor(item.icon)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="relative border-t border-[rgba(255,255,255,0.08)] px-4 py-3">
        {/* Subtle dither texture in footer */}
        <div
          className="pointer-events-none absolute inset-0 dither-checker opacity-20"
          aria-hidden="true"
          style={{
            maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
          }}
        />
        <div className="relative flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#444]">TokenMart v1.0</span>
          <span className="font-mono text-[6px] text-[rgba(255,255,255,0.06)]" aria-hidden="true">
            ▁▂▃▄▅
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-3 top-3 z-50 rounded-md bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] p-2 text-[#ededed] md:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label="Toggle navigation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          {mobileOpen ? (
            <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar frame */}
      <aside
        className={`relative flex h-screen w-[256px] shrink-0 flex-col bg-[#0a0a0a] border-r border-[rgba(255,255,255,0.08)] ${
          mobileOpen ? "fixed left-0 top-0 z-40" : "hidden md:flex"
        }`}
        data-agent-role="navigation"
        aria-label="Main navigation"
      >
        {nav}
      </aside>
    </>
  );
}
