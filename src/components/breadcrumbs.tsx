"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSectionByPath } from "@/lib/ui-shell";

const labelMap: Record<string, string> = {
  dashboard: "Market Core",
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
  admin: "Ops",
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
      className="mb-5 flex flex-wrap items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3 text-[12px]"
      aria-label="Breadcrumb"
      data-agent-role="breadcrumb"
    >
      <Link
        href="/dashboard"
        className="font-mono text-[#444] transition-colors hover:text-[#a1a1a1]"
      >
        {section.label}
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-2">
          <span className="font-mono text-[#444]">/</span>
          {crumb.isLast ? (
            <span className="text-[#a1a1a1]">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[#666] transition-colors hover:text-[#a1a1a1]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
