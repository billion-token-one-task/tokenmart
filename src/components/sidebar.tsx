"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { shellNavSections, shellPinnedLinks, getSectionByPath } from "@/lib/ui-shell";
import { LogoMark } from "@/components/logo";

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
  const activeSection = getSectionByPath(pathname).id;
  const pinnedLinks = shellPinnedLinks.filter((link) => link.section === activeSection);
  const visiblePins = pinnedLinks.length > 0 ? pinnedLinks : shellPinnedLinks.slice(0, 3);

  const nav = (
    <>
      {/* Pink accent strip at top */}
      <div className="h-[8px] w-full shrink-0 bg-[#e5005a]" aria-hidden="true" />

      <div className="border-b-2 border-[#0a0a0a] px-5 py-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={22} className="text-[#e5005a]" />
            <span className="font-display text-[1.15rem] uppercase tracking-[0.04em] text-[#0a0a0a]">
              TokenMart
            </span>
          </Link>
          {/* Animated pulse dot - status indicator */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping bg-[#e5005a] opacity-75" />
            <span className="relative inline-flex h-2 w-2 bg-[#e5005a]" />
          </span>
        </div>
        <p className="mt-2 max-w-[14rem] font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-[var(--color-text-tertiary)]">
          Routing, trust, and exchange infrastructure for agent coordination.
        </p>
        {/* Barcode strip decoration */}
        <div className="mt-3 flex items-center gap-1" aria-hidden="true">
          <div className="h-[6px] w-[2px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[1px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[3px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[1px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[2px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[1px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[3px] bg-[#e5005a]" />
          <div className="h-[6px] w-[1px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[2px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[1px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[3px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[1px] bg-[#e5005a]" />
          <div className="h-[6px] w-[2px] bg-[#0a0a0a]" />
          <div className="h-[6px] w-[1px] bg-[#0a0a0a]" />
          <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--color-text-quaternary)]">
            BUILD::v0.1.0
          </span>
        </div>
      </div>

      <div className="px-4 py-4">
        <button
          className="flex w-full items-center justify-between border-2 border-[#0a0a0a] bg-[var(--color-surface-0)] px-3 py-2.5 text-left transition-all hover:bg-[#e5005a] hover:text-white"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
        >
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span>Search routes</span>
          </span>
          <kbd className="border-2 border-[#0a0a0a] bg-[var(--color-canvas)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
            {"\u2318"}K
          </kbd>
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-[rgba(255,255,255,0.92)]">
          <div className="h-[4px] w-full bg-[#e5005a]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 dither-bayer-4 opacity-20" aria-hidden="true" />
          <div className="relative px-3 py-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
              <span className="text-[#e5005a]">+</span>
              <span>Mission Pins</span>
              <span className="ml-auto text-[8px] tracking-[0.18em] text-[var(--color-text-quaternary)]">
                LIVE
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {visiblePins.map((pin) => (
                <Link
                  key={pin.id}
                  href={pin.href}
                  className="group block border-2 border-[#0a0a0a] bg-[rgba(255,240,245,0.72)] px-3 py-2.5 transition-all hover:-translate-y-[1px] hover:bg-[#e5005a] hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-[1rem] uppercase leading-none text-[#0a0a0a] group-hover:text-white">
                      {pin.label}
                    </div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7a68] group-hover:text-white/70">
                      {pin.code}
                    </div>
                  </div>
                  <div className="mt-2 font-mono text-[9px] uppercase leading-4 tracking-[0.14em] text-[#8a7a68] group-hover:text-white/80">
                    {pin.summary}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4" data-agent-role="nav-sections">
        <div className="space-y-6">
          {shellNavSections.map((section) => {
            return (
              <section key={section.id} data-agent-section={section.id}>
                <div className="flex items-center gap-2 px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]">
                  {/* Crosshair marker */}
                  <span className="text-[#e5005a]" aria-hidden="true">+</span>
                  <span className="font-semibold text-[#0a0a0a]">{section.title}</span>
                  <span className="h-[2px] flex-1 bg-[#0a0a0a]" />
                  <span className="text-[8px] text-[var(--color-text-quaternary)]" aria-hidden="true">
                    [{section.id.toUpperCase().slice(0, 3)}]
                  </span>
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex items-center gap-3 px-3 py-2.5 text-[13px] transition-all ${
                          active
                            ? "border-l-[3px] border-l-[#e5005a] border-y border-y-transparent border-r border-r-transparent bg-[#fff0f5] text-[#0a0a0a] font-medium"
                            : "border-l-[3px] border-transparent text-[var(--color-text-secondary)] hover:bg-[#e5005a] hover:text-white"
                        }`}
                        data-agent-action={`navigate-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                        data-agent-href={item.href}
                        data-agent-endpoint={item.agentEndpoint}
                        data-agent-active={active ? "true" : "false"}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className={`shrink-0 ${active ? "text-[#e5005a]" : ""}`}>
                          {iconFor(item.icon)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {/* Dense monospace metadata */}
                        <span className="font-mono text-[8px] uppercase tracking-[0.1em] opacity-40" aria-hidden="true">
                          {item.href.split("/").pop()?.slice(0, 3).toUpperCase()}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="relative border-t-2 border-[#0a0a0a] px-5 py-4">
        <div className="relative flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]">
            Editorial build
          </span>
          {/* TM-01 in viewfinder-bracketed box */}
          <span className="viewfinder border-2 border-[#0a0a0a] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-[#0a0a0a]" aria-hidden="true">
            TM-01
          </span>
        </div>
        {/* Dense metadata footer */}
        <div className="mt-2 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--color-text-quaternary)]" aria-hidden="true">
          <span>SYS::NOMINAL</span>
          <span className="h-1 w-1 bg-[#e5005a]" />
          <span>UPLINK::OK</span>
          <span className="h-1 w-1 bg-[#e5005a]" />
          <span>v0.1</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-3 top-3 z-50 border-2 border-[#0a0a0a] bg-[var(--color-surface-0)] p-2 text-[#0a0a0a] shadow-[2px_2px_0px_#0a0a0a] md:hidden"
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
          className="fixed inset-0 z-40 bg-[rgba(10,10,10,0.3)] backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`relative flex h-screen w-[252px] shrink-0 flex-col border-r-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.96)] ${
          mobileOpen ? "fixed left-0 top-0 z-40" : "hidden md:flex"
        }`}
        data-agent-role="navigation"
        aria-label="Main navigation"
      >
        {/* Subtle diagonal hatch on sidebar background */}
        <div
          className="pointer-events-none absolute inset-0 diagonal-hatch opacity-[0.03]"
          aria-hidden="true"
        />
        {/* Scanline on sidebar */}
        <div
          className="pointer-events-none absolute inset-0 scanline-overlay opacity-[0.02]"
          aria-hidden="true"
        />
        <div className="relative z-[1] flex h-full flex-col">
          {nav}
        </div>
      </aside>
    </>
  );
}
