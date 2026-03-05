"use client";

import { Sidebar } from "@/components/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CommandPalette } from "@/components/command-palette";
import { GameOfLifeCanvas } from "@/components/game-of-life";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen relative">
        {/* Very subtle GoL background — barely perceptible ambient texture */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <GameOfLifeCanvas
            cellSize={6}
            interval={300}
            density={0.03}
            aliveColor="#FF6B00"
            aliveColorAlt="#39FF14"
            opacity={0.035}
            autoSeed
          />
        </div>

        <Sidebar />

        <main
          className="flex-1 min-w-0 overflow-y-auto relative z-10"
          data-agent-role="main-content"
        >
          <div className="px-6 lg:px-10 pt-4">
            <Breadcrumbs />
          </div>
          <div className="px-6 lg:px-10 pb-10">
            {children}
          </div>
        </main>

        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
