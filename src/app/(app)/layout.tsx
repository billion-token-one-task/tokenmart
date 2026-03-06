"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ToastProvider } from "@/components/ui/toast";

const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((mod) => mod.CommandPalette),
  { ssr: false },
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="relative flex min-h-screen bg-black">
        {/* Global background pattern — subtle noise dust */}
        <div
          className="pointer-events-none fixed inset-0 noise-dust opacity-40"
          aria-hidden="true"
          style={{
            zIndex: 0,
          }}
        />

        {/* Global crosshatch underlay — very subtle */}
        <div
          className="pointer-events-none fixed inset-0 crosshatch-wide opacity-20"
          aria-hidden="true"
          style={{
            zIndex: 0,
            maskImage: "radial-gradient(ellipse at 50% 30%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 0%, transparent 70%)",
          }}
        />

        <Sidebar />
        <main className="relative z-[1] flex-1 min-w-0 overflow-y-auto">
          <div className="px-4 pt-4 lg:px-8">
            <Breadcrumbs />
          </div>
          <div className="px-4 pb-10 lg:px-8">
            {children}
          </div>
        </main>
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
