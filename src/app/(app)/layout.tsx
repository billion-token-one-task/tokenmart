"use client";

import { type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CommandPalette } from "@/components/command-palette";
import { SectionPattern } from "@/components/ui/section-pattern";
import { ToastProvider } from "@/components/ui/toast";
import { AuroraBg } from "@/components/ui/aurora-bg";
import { getSectionByPath, getSectionStyleVars } from "@/lib/ui-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = getSectionByPath(pathname);

  return (
    <ToastProvider>
      <div
        className="shell-theme-root flex min-h-screen relative"
        data-shell-section={section.id}
        data-shell-surface={section.surfacePreset}
        data-shell-contrast={section.contrastPreset}
        style={getSectionStyleVars(section.id) as CSSProperties}
      >
        <AuroraBg intensity={0.72} />
        <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
          <div className="shell-grid-overlay" />
          <SectionPattern
            section={section.id}
            className="opacity-80 [mask-image:radial-gradient(circle_at_65%_28%,black_0%,black_36%,transparent_76%)]"
            opacity={0.52}
          />
          <div className="shell-crosshair top-[12vh] right-[10vw]" />
          <div className="shell-crosshair bottom-[12vh] left-[22vw] hidden xl:block" />
        </div>

        <Sidebar />

        <main
          className="flex-1 min-w-0 overflow-y-auto relative z-10"
          data-agent-role="main-content"
        >
          <div className="px-6 lg:px-10 pt-5">
            <Breadcrumbs />
          </div>
          <div className="px-6 lg:px-10 pb-12">
            {children}
          </div>
        </main>

        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
