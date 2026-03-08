"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DOCS_CRAWLER_RESOURCES,
  DOCS_ROUTES,
  getHumanDoc,
  getHumanDocsForLane,
} from "@/lib/docs";
import type { HumanDocLane } from "@/lib/docs/web-doc-types";

function isActive(pathname: string, href: string) {
  if (href === "/docs") return pathname === "/docs";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getLaneFromPathname(pathname: string): HumanDocLane | undefined {
  const exactDoc = getHumanDoc(pathname);
  if (exactDoc) return exactDoc.lane;

  if (pathname === "/docs/getting-started" || pathname.startsWith("/docs/product")) {
    return "product";
  }
  if (pathname.startsWith("/docs/methodology")) return "methodology";
  if (pathname.startsWith("/docs/api")) return "api";
  if (pathname.startsWith("/docs/architecture")) return "architecture";
  if (pathname.startsWith("/docs/operators")) return "operators";
  if (pathname.startsWith("/docs/runtime")) return "runtime";
  if (pathname.startsWith("/docs/plans")) return "archive";
  if (pathname.startsWith("/docs/reference")) return "reference";

  return undefined;
}

export function DocsSidebar() {
  const pathname = usePathname();
  const activeLane = getLaneFromPathname(pathname);
  const lanePages = activeLane ? getHumanDocsForLane(activeLane) : [];

  return (
    <aside className="space-y-0">
      {/* header card */}
      <div className="rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-4 shadow-[4px_4px_0_#0a0a0a]">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-[1.45rem] uppercase tracking-[0.04em] text-[#0a0a0a]"
          >
            TokenMart
          </Link>
          {/* barcode decoration */}
          <span className="flex items-center gap-[1px]" aria-hidden="true">
            {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3].map((w, i) => (
              <span
                key={i}
                className="block bg-[#0a0a0a]"
                style={{ width: `${w}px`, height: "10px" }}
              />
            ))}
          </span>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          Document control
        </div>
        <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">
          Canonical web docs, runtime contracts, compatibility exports, and
          archive material organized into one reading system.
        </p>
        <div className="mt-3 rounded-none border-2 border-[#0a0a0a] bg-white px-3 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            Current lane
          </div>
          <div className="mt-1 text-[13px] font-medium text-[#0a0a0a]">
            {DOCS_ROUTES.find((route) => isActive(pathname, route.href))
              ?.label ?? "Docs"}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
            {pathname}
          </div>
        </div>
        {/* metadata row */}
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            SUBSYSTEM::DOCS
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            VER::1.0
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            TM-2026
          </span>
        </div>
      </div>

      {/* route directory */}
      <div className="rounded-none border-2 border-t-0 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          Route directory
        </div>
        <div className="mt-3 space-y-0">
          {DOCS_ROUTES.map((route) => {
            const active = isActive(pathname, route.href);

            return (
              <Link
                key={route.href}
                href={route.href}
                className={`block rounded-none border-2 px-3 py-2.5 transition-colors -mt-[2px] ${
                  active
                    ? "border-[#0a0a0a] bg-[rgba(229,0,90,0.04)] text-[#0a0a0a] border-l-[4px] border-l-[#E5005A]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:border-[#0a0a0a] hover:bg-white hover:text-[#0a0a0a]"
                }`}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                  {route.eyebrow}
                </div>
                <div className="mt-0.5 text-[13px] font-medium">
                  {route.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-tertiary)]">
                  {route.description}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {lanePages.length ? (
        <div className="rounded-none border-2 border-t-0 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            Current lane pages
          </div>
          <div className="mt-1 text-[11px] leading-4 text-[var(--color-text-secondary)]">
            Canonical detail pages for the lane you are browsing right now.
          </div>
          <div className="mt-3 space-y-0">
            {lanePages.map((page) => {
              const active = pathname === page.route;

              return (
                <Link
                  key={page.id}
                  href={page.route}
                  className={`-mt-[2px] block rounded-none border-2 px-3 py-2 transition-colors ${
                    active
                      ? "border-[#0a0a0a] bg-[#E5005A] text-white shadow-[3px_3px_0_#0a0a0a]"
                      : "border-transparent text-[var(--color-text-secondary)] hover:border-[#0a0a0a] hover:bg-white hover:text-[#0a0a0a]"
                  }`}
                >
                  <div
                    className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                      active
                        ? "text-white/65"
                        : "text-[var(--color-text-tertiary)]"
                    }`}
                  >
                    {page.heroEyebrow}
                  </div>
                  <div className="mt-1 text-[12px] font-medium leading-5">
                    {page.title}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* crawler resources */}
      <div className="rounded-none border-2 border-t-0 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          Compatibility exports
        </div>
        <div className="mt-1 text-[11px] leading-4 text-[var(--color-text-secondary)]">
          Machine-facing resources remain visible, but they are secondary to the canonical web docs.
        </div>
        <div className="mt-3 space-y-0">
          {DOCS_CRAWLER_RESOURCES.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="block rounded-none border-2 border-transparent px-3 py-2 text-[var(--color-text-secondary)] transition-colors hover:border-[#0a0a0a] hover:bg-white hover:text-[#0a0a0a] -mt-[2px]"
            >
              <div className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                {resource.href}
              </div>
              <div className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-tertiary)]">
                {resource.description}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
