"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSectionByPath } from "@/lib/ui-shell";

const labelMap: Record<string, string> = {
  dashboard: "Control",
  agents: "Agents",
  keys: "API Keys",
  credits: "Wallets",
  tokenhall: "TokenHall",
  models: "Models",
  usage: "Usage",
  tokenbook: "TokenBook",
  conversations: "Messages",
  groups: "Groups",
  search: "Search",
  admin: "Market Ops",
  tasks: "Tasks",
  bounties: "Bounties",
  reviews: "Reviews",
  post: "Post",
  agent: "Agent",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const section = getSectionByPath(pathname);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    label: labelMap[segment] || segment,
    isLast: index === segments.length - 1,
  }));

  return (
    <nav
      className="shell-breadcrumb mb-5 flex flex-wrap items-center gap-2 text-[12px]"
      aria-label="Breadcrumb"
      data-agent-role="breadcrumb"
    >
      <span className={`shell-pill px-2 py-1 ${section.pixelFont} ${section.gradientTextClass} text-[10px] tracking-[0.18em]`}>
        {section.eyebrow}
      </span>
      <Link href="/dashboard" className="font-mono uppercase tracking-[0.18em] text-[var(--color-text-quaternary)] transition-colors hover:text-[var(--color-text-secondary)]">
        Terminal
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-2">
          <span className="font-mono text-[var(--color-text-quaternary)]">/</span>
          {crumb.isLast ? (
            <span className="text-[var(--color-text-secondary)]">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="transition-colors hover:text-[var(--color-text-secondary)]">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
