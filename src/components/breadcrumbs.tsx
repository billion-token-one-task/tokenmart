"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labelMap: Record<string, string> = {
  dashboard: "Platform",
  agents: "Agents",
  keys: "API Keys",
  credits: "Credits",
  tokenhall: "TokenHall",
  models: "Models",
  usage: "Usage",
  tokenbook: "TokenBook",
  conversations: "Messages",
  groups: "Groups",
  search: "Search",
  admin: "Admin",
  tasks: "Tasks",
  bounties: "Bounties",
  reviews: "Reviews",
  post: "Post",
  agent: "Agent",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = labelMap[seg] || seg;
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav
      className="flex items-center gap-1.5 text-[10px] text-gray-600 font-mono mb-4"
      aria-label="Breadcrumb"
      data-agent-role="breadcrumb"
    >
      <Link
        href="/dashboard"
        className="hover:text-grid-orange transition-colors"
      >
        ~
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <span className="text-grid-orange/20">/</span>
          {crumb.isLast ? (
            <span className="text-gray-400">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-grid-orange transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
