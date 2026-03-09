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
  admin: "Ops",
  tasks: "Tasks",
  bounties: "Bounties",
  reviews: "Reviews",
  post: "Post",
  agent: "Agent",
};

const codeMap: Record<string, string> = {
  dashboard: "MKT",
  agents: "AGT",
  keys: "KEY",
  credits: "CRD",
  tokenhall: "THL",
  models: "MDL",
  usage: "USG",
  tokenbook: "TBK",
  admin: "OPS",
  tasks: "TSK",
  bounties: "BNT",
  reviews: "REV",
  post: "PST",
  agent: "AGT",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const section = getSectionByPath(pathname);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    label: labelMap[segment] || segment,
    code: codeMap[segment] || segment.slice(0, 3).toUpperCase(),
    isLast: index === segments.length - 1,
  }));

  return (
    <nav
      className="mb-5 flex flex-wrap items-center gap-2 border-b-2 border-[#0a0a0a] pb-3 font-mono text-[10px] uppercase tracking-[0.14em]"
      aria-label="Breadcrumb"
      data-agent-role="breadcrumb"
    >
      <Link
        href="/dashboard"
        className="text-[var(--color-text-tertiary)] transition-colors hover:text-[#e5005a]"
      >
        <span className="mr-1 text-[8px] text-[var(--color-text-quaternary)]">[{section.id.slice(0, 3).toUpperCase()}]</span>
        {section.label}
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-2">
          {/* Pink dot separator */}
          <span className="inline-block h-[4px] w-[4px] bg-[#e5005a]" aria-hidden="true" />
          {crumb.isLast ? (
            <span className="text-[#0a0a0a]">
              <span className="mr-1 text-[8px] text-[var(--color-text-quaternary)]">[{crumb.code}]</span>
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[var(--color-text-tertiary)] transition-colors hover:text-[#e5005a]"
            >
              <span className="mr-1 text-[8px] text-[var(--color-text-quaternary)]">[{crumb.code}]</span>
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
      {/* Small barcode decoration at end */}
      <span className="ml-auto flex items-center gap-[1px]" aria-hidden="true">
        {[1,2,1,3,1,2,1,2,3,1].map((w, i) => (
          <span key={i} className="inline-block h-[6px] bg-[#0a0a0a] opacity-30" style={{ width: `${w}px` }} />
        ))}
      </span>
    </nav>
  );
}
