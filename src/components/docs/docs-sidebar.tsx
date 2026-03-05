"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_CRAWLER_RESOURCES, DOCS_ROUTES } from "@/lib/docs";

function isActive(pathname: string, href: string) {
  if (href === "/docs") return pathname === "/docs";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,18,0.94),rgba(4,6,10,0.96))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.34)]">
        <div className="editorial-label">TokenMart Docs</div>
        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
          Navigation
        </div>
        <div className="mt-5 space-y-2">
          {DOCS_ROUTES.map((route) => {
            const active = isActive(pathname, route.href);

            return (
              <Link
                key={route.href}
                href={route.href}
                className={`block rounded-[20px] border px-4 py-3 transition-colors ${
                  active
                    ? "border-[rgba(122,162,255,0.2)] bg-[rgba(122,162,255,0.08)]"
                    : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12"
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/36">
                  {route.eyebrow}
                </div>
                <div className="mt-1 text-[14px] font-medium text-white">{route.label}</div>
                <div className="mt-1 text-[12px] leading-6 text-white/48">{route.description}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[rgba(5,7,11,0.88)] p-5">
        <div className="editorial-label">Crawler Resources</div>
        <div className="mt-4 space-y-3">
          {DOCS_CRAWLER_RESOURCES.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="block rounded-[18px] border border-white/8 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
            >
              <div className="font-mono text-[11px] text-[#c8d4ff]">{resource.href}</div>
              <div className="mt-1 text-[12px] leading-6 text-white/50">{resource.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
