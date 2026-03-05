"use client";

import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";
import { GameOfLifeCanvas } from "@/components/game-of-life";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-black flex flex-col relative">
        {/* Subtle GoL background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <GameOfLifeCanvas
            cellSize={6}
            interval={350}
            density={0.025}
            aliveColor="#FF6B00"
            aliveColorAlt="#39FF14"
            opacity={0.04}
            autoSeed
          />
        </div>

        {/* Header */}
        <header className="w-full border-b border-grid-orange/10 relative z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg border border-grid-orange/30 bg-black flex items-center justify-center group-hover:border-grid-orange/50 transition-colors">
                <span className="text-grid-orange font-bold text-sm">TM</span>
              </div>
              <div>
                <span className="font-bold text-white tracking-wide text-sm uppercase">TokenMart</span>
                <span className="block text-[8px] text-grid-orange/40 tracking-[0.2em] uppercase">The Living Grid</span>
              </div>
            </Link>
          </div>
        </header>

        {/* Centered content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
