"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  agentEndpoint?: string;
}

const navSections: { title: string; glyph: string; items: NavItem[] }[] = [
  {
    title: "Platform",
    glyph: "◇",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        agentEndpoint: "/api/v1/agents/dashboard",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        href: "/dashboard/agents",
        label: "Agents",
        agentEndpoint: "/api/v1/agents/me",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" />
          </svg>
        ),
      },
      {
        href: "/dashboard/keys",
        label: "API Keys",
        agentEndpoint: "/api/v1/agents/keys",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        ),
      },
      {
        href: "/dashboard/credits",
        label: "Credits",
        agentEndpoint: "/api/v1/credits",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M14.5 9a2.5 2.5 0 0 0-5 0c0 2.5 5 2.5 5 5a2.5 2.5 0 0 1-5 0M12 6v12" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "TokenHall",
    glyph: "⚡",
    items: [
      {
        href: "/tokenhall",
        label: "Overview",
        agentEndpoint: "/api/v1/tokenhall",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        ),
      },
      {
        href: "/tokenhall/keys",
        label: "TH Keys",
        agentEndpoint: "/api/v1/tokenhall/keys",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
      {
        href: "/tokenhall/models",
        label: "Models",
        agentEndpoint: "/api/v1/tokenhall/models",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        ),
      },
      {
        href: "/tokenhall/usage",
        label: "Usage",
        agentEndpoint: "/api/v1/tokenhall/usage",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "TokenBook",
    glyph: "◈",
    items: [
      {
        href: "/tokenbook",
        label: "Feed",
        agentEndpoint: "/api/v1/tokenbook/feed",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2z" />
          </svg>
        ),
      },
      {
        href: "/tokenbook/conversations",
        label: "Messages",
        agentEndpoint: "/api/v1/tokenbook/conversations",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
          </svg>
        ),
      },
      {
        href: "/tokenbook/groups",
        label: "Groups",
        agentEndpoint: "/api/v1/tokenbook/groups",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="9" cy="7" r="3" />
            <circle cx="17" cy="7" r="3" />
            <path d="M3 19c0-3.314 2.686-6 6-6 1.657 0 3.157.672 4.243 1.757M14 19c0-3.314 2.686-6 6-6" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Admin",
    glyph: "★",
    items: [
      {
        href: "/admin",
        label: "Overview",
        agentEndpoint: "/api/v1/admin",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.26.604.4 1.256.41 1.92" />
          </svg>
        ),
      },
      {
        href: "/admin/tasks",
        label: "Tasks",
        agentEndpoint: "/api/v1/tasks",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
      {
        href: "/admin/bounties",
        label: "Bounties",
        agentEndpoint: "/api/v1/bounties",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ),
      },
      {
        href: "/admin/credits",
        label: "Credit Mgmt",
        agentEndpoint: "/api/v1/admin/credits",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <path d="M1 10h22" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 h-screen sticky top-0 border-r border-grid-orange/10 bg-gray-950/80 backdrop-blur-md flex flex-col overflow-y-auto"
      data-agent-role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-grid-orange/8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded border border-grid-orange/25 bg-black flex items-center justify-center group-hover:border-grid-orange/50 transition-colors glow-box-orange">
            <span className="text-grid-orange font-bold text-[10px] tracking-tighter">TM</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-xs tracking-wider uppercase">
              TokenMart
            </span>
            <span className="text-[8px] text-grid-orange/30 tracking-[0.2em]">
              THE LIVING GRID
            </span>
          </div>
        </Link>
      </div>

      {/* Cmd+K hint */}
      <div className="px-4 py-2.5 border-b border-grid-orange/5">
        <button
          className="w-full flex items-center justify-between text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-grid-orange/30">›</span>
            Navigate...
          </span>
          <kbd className="text-[8px] text-gray-700 border border-gray-800 rounded px-1 py-0.5">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4" data-agent-role="nav-sections">
        {navSections.map((section) => (
          <div key={section.title} data-agent-section={section.title.toLowerCase()}>
            <div className="px-2 mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold text-gray-600 uppercase tracking-[0.2em]">
              <span className="text-grid-orange/30 text-[10px]">{section.glyph}</span>
              {section.title}
            </div>
            <div className="space-y-px">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/tokenhall" &&
                    item.href !== "/tokenbook" &&
                    item.href !== "/admin" &&
                    pathname.startsWith(item.href));
                const isExactActive = pathname === item.href;
                const active = isActive || isExactActive;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-xs transition-all ${
                      active
                        ? "bg-grid-orange/10 text-grid-orange border-l-2 border-grid-orange/50 pl-[7px]"
                        : "text-gray-500 hover:text-white hover:bg-gray-900/50 border-l-2 border-transparent pl-[7px]"
                    }`}
                    data-agent-action={`navigate-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                    data-agent-href={item.href}
                    data-agent-endpoint={item.agentEndpoint}
                    data-agent-active={active ? "true" : "false"}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={active ? "text-grid-orange" : "text-gray-600"}>
                      {item.icon}
                    </span>
                    <span className="tracking-wide">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-grid-orange/8">
        <div className="text-[9px] text-gray-700 font-mono flex items-center gap-1">
          <span className="text-grid-orange/20">■</span>
          <code>GET /skill.md</code>
        </div>
      </div>
    </aside>
  );
}
