"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ToastProvider } from "@/components/ui/toast";
import { getSectionByPath } from "@/lib/ui-shell";

const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((mod) => mod.CommandPalette),
  { ssr: false },
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = getSectionByPath(pathname);

  return (
    <ToastProvider>
      <div className="shell-theme-root relative flex min-h-screen" data-shell-section={section.id}>
        {/* Noise texture - more intense */}
        <div
          className="pointer-events-none fixed inset-0 noise-dust opacity-70"
          aria-hidden="true"
        />
        {/* Hatch grid - more intense */}
        <div
          className="pointer-events-none fixed inset-0 hatch-grid opacity-45"
          aria-hidden="true"
          style={{
            maskImage: "linear-gradient(180deg, rgba(0,0,0,1), transparent 80%)",
            WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,1), transparent 80%)",
          }}
        />
        {/* Diagonal hatch background */}
        <div
          className="pointer-events-none fixed inset-0 diagonal-hatch opacity-[0.06]"
          aria-hidden="true"
        />
        <Sidebar />
        <main className="relative z-[1] min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 pt-4 lg:px-8">
            <Breadcrumbs />
          </div>
          {/* Data readout strip */}
          <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
            <div className="mb-3 flex items-center gap-4 border-b-2 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e5005a]">
                SYS::PATH
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                {pathname}
              </span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(255,255,255,0.4)]">
                SEC:{section.id.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]" aria-hidden="true">
                {"///"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(255,255,255,0.4)]">
                {section.label}
              </span>
            </div>
          </div>
          <div className="mx-auto max-w-[1440px] px-4 pb-12 lg:px-8">
            <div className="relative flex">
              {/* Vertical pink accent strip */}
              <div className="w-[3px] shrink-0 bg-[#e5005a]" aria-hidden="true" />
              {/* Content card with viewfinder brackets */}
              <div className="viewfinder relative min-w-0 flex-1 border-2 border-[#0a0a0a] bg-[rgba(255,248,251,0.92)] p-5 sm:p-6">
                {children}
              </div>
            </div>
          </div>
        </main>
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
