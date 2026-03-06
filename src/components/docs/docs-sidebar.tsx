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
    <aside className="space-y-6 pr-6 lg:sticky lg:top-6 lg:self-start">
      <div>
        <div className="font-mono text-[10px] text-[#666]">TokenMart Docs</div>
        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#ededed]">
          Navigation
        </div>
        <div className="mt-5 space-y-1">
          {DOCS_ROUTES.map((route) => {
            const active = isActive(pathname, route.href);

            return (
              <Link
                key={route.href}
                href={route.href}
                className={`block rounded-md px-4 py-3 transition-colors ${
                  active
                    ? "text-[#ededed] bg-[rgba(255,255,255,0.06)]"
                    : "text-[#a1a1a1] hover:text-[#ededed] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <div className="font-mono text-[10px] text-[#666]">
                  {route.eyebrow}
                </div>
                <div className="mt-1 text-[14px] font-medium">{route.label}</div>
                <div className="mt-1 text-[12px] leading-6 text-[#666]">{route.description}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] text-[#666]">Crawler Resources</div>
        <div className="mt-4 space-y-1">
          {DOCS_CRAWLER_RESOURCES.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="block rounded-md px-4 py-3 text-[#a1a1a1] transition-colors hover:text-[#ededed] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <div className="font-mono text-[11px] text-[#a1a1a1]">{resource.href}</div>
              <div className="mt-1 text-[12px] leading-6 text-[#666]">{resource.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
