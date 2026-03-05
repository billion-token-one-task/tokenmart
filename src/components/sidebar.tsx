"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useMemo, useState } from "react";
import { AsciiArt } from "@/components/ui/ascii-art";
import { SectionPattern } from "@/components/ui/section-pattern";
import { ART_GRADIENTS, LOGO_MOUNTAIN } from "@/lib/ascii-art";
import { getSectionById, getSectionStyleVars, shellNavSections } from "@/lib/ui-shell";

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
  const currentSection = useMemo(() => {
    return shellNavSections.find((section) => pathname.startsWith(`/${section.id}`))?.id ?? "platform";
  }, [pathname]);
  const currentConfig = getSectionById(currentSection);

  const nav = (
    <>
      <div className="relative overflow-hidden border-b border-[rgba(255,255,255,0.08)] px-4 py-4">
        <SectionPattern
          section={currentSection}
          className="opacity-80 [mask-image:linear-gradient(135deg,black_12%,black_40%,transparent_86%)]"
          opacity={0.56}
        />
        <Link href="/" className="group flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <AsciiArt
              lines={LOGO_MOUNTAIN}
              gradient={ART_GRADIENTS.LOGO_MOUNTAIN}
              pixelFont="font-pixel-square"
              size="sm"
              className="opacity-95"
            />
            <div className="shell-pill px-2 py-1 text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">
              {currentConfig.hintLabel}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="editorial-label">Agent Credit Exchange</div>
              <span className={`shell-display ${currentConfig.displayTreatment} text-[20px] tracking-tight ${currentConfig.gradientTextClass}`}>
                TokenMart
              </span>
            </div>
            <div className="text-right font-mono text-[10px] leading-tight text-[var(--color-text-quaternary)]">
              <div>INFERENCE / LEDGER</div>
              <div>ASCII / DITHER / TRUST</div>
            </div>
          </div>
        </Link>
        <div
          className="shell-rule mt-3"
          style={
            {
              "--rule-from": currentConfig.accentFrom,
              "--rule-to": currentConfig.accentTo,
            } as React.CSSProperties
          }
        />
      </div>

      <div className="px-3 py-3">
        <button
          className="shell-panel-soft flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-[var(--color-text-primary)]"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
        >
          <span className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="font-mono uppercase tracking-[0.18em] text-[10px] text-[var(--color-text-tertiary)]">
              Command Search
            </span>
          </span>
          <kbd className="shell-pill px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
            {"\u2318"}K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3" data-agent-role="nav-sections">
        <div className="space-y-5">
          {shellNavSections.map((section) => {
            const sectionConfig = getSectionById(section.id);

            return (
              <section key={section.id} data-agent-section={section.id}>
                <div className={`shell-section-label px-2 ${sectionConfig.pixelFont} ${sectionConfig.gradientTextClass}`}>
                  <span>{section.title}</span>
                  <span className="font-mono text-[9px] text-[var(--color-text-quaternary)]">
                    {sectionConfig.hintLabel}
                  </span>
                </div>
                <div className="mt-1 space-y-1.5">
                  {section.items.map((item, index) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`shell-nav-item flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-all duration-200 ${
                          active
                            ? "shell-nav-item-active text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        }`}
                        data-agent-action={`navigate-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                        data-agent-href={item.href}
                        data-agent-endpoint={item.agentEndpoint}
                        data-agent-active={active ? "true" : "false"}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        style={
                          {
                            "--nav-from": sectionConfig.accentFrom,
                            "--nav-to": sectionConfig.accentTo,
                            "--nav-glow": sectionConfig.accentGlow,
                            ...getSectionStyleVars(section.id),
                          } as CSSProperties
                        }
                      >
                        <span className={`shrink-0 ${active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-quaternary)]"}`}>
                          {iconFor(item.icon)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <span className={`font-mono text-[10px] ${active ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-quaternary)]"}`}>
                          {String(index + 1).padStart(2, "0")}
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

      <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <AsciiArt
            lines={LOGO_MOUNTAIN}
            gradient={ART_GRADIENTS.MOUNTAIN_SMALL}
            pixelFont="font-pixel-square"
            size="sm"
            opacity={0.35}
          />
          <div className="text-right font-mono text-[10px] leading-relaxed text-[var(--color-text-quaternary)]">
            <div>STATE / LIVE</div>
            <div>CREDITS / ROUTING / TRUST</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        className="shell-panel md:hidden fixed left-3 top-3 z-50 rounded-xl p-2 text-[var(--color-text-primary)]"
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

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`shell-sidebar-frame relative flex h-screen w-[280px] shrink-0 flex-col ${
          mobileOpen ? "fixed left-0 top-0 z-40" : "hidden md:flex"
        }`}
        data-agent-role="navigation"
        aria-label="Main navigation"
      >
        {nav}
        <div
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-px"
          style={{
            background: `linear-gradient(180deg, ${currentConfig.accentFrom}33, ${currentConfig.accentTo}22 44%, transparent 100%)`,
          }}
        />
      </aside>
    </>
  );
}
