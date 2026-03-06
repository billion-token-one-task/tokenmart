"use client";

import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="relative flex min-h-screen flex-col bg-black">
        {/* Halftone hex pattern — auth atmosphere */}
        <div
          className="pointer-events-none fixed inset-0 halftone-hex opacity-30"
          aria-hidden="true"
          style={{
            maskImage: "radial-gradient(ellipse at 50% 40%, black 0%, transparent 60%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 0%, transparent 60%)",
          }}
        />
        {/* Crosshatch texture — subtle diagonal lines */}
        <div
          className="pointer-events-none fixed inset-0 crosshatch opacity-15"
          aria-hidden="true"
          style={{
            maskImage: "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
          }}
        />

        {/* Header */}
        <header className="relative z-10 border-b border-[rgba(255,255,255,0.08)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-white">▲ TokenMart</span>
            </Link>
            <div className="flex items-center gap-4 text-[13px] text-[#666]">
              <Link href="/docs" className="hover:text-[#a1a1a1] transition-colors">Docs</Link>
            </div>
          </div>
        </header>

        {/* Centered content */}
        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
