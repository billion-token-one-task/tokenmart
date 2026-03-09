"use client";

import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";
import { LogoMark } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--color-canvas)]" data-shell-section="auth">
        {/* Hard diagonal hatch instead of soft halftone */}
        <div
          className="pointer-events-none fixed inset-0 diagonal-hatch opacity-[0.08]"
          aria-hidden="true"
        />
        {/* Crosshatch pattern */}
        <div
          className="pointer-events-none fixed inset-0 crosshatch-wide opacity-20"
          aria-hidden="true"
          style={{
            maskImage: "linear-gradient(180deg, black 0%, rgba(0,0,0,0.55) 34%, transparent 84%)",
            WebkitMaskImage: "linear-gradient(180deg, black 0%, rgba(0,0,0,0.55) 34%, transparent 84%)",
          }}
        />
        {/* Hard gradient strip at top - solid lines instead of soft gradient */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-[#e5005a]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-[4px] h-[2px] bg-[#0a0a0a]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-[6px] h-[1px] bg-[#e5005a] opacity-50" aria-hidden="true" />

        {/* Scanline effect on header area */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[120px] scanline-overlay opacity-[0.04]"
          aria-hidden="true"
        />

        {/* Vertical barcode strip on left */}
        <div
          className="pointer-events-none fixed bottom-0 left-0 top-0 w-[32px] barcode-strip opacity-60"
          aria-hidden="true"
        />

        <header className="relative z-10 border-b-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.88)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 pl-12">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark size={20} className="text-[#e5005a]" />
              <div>
                <div className="font-display text-[1.1rem] uppercase tracking-[0.05em] text-[#0a0a0a]">
                  TokenMart
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                  OPENCLAW ACCESS LANE // MISSION-RUNTIME ENTRY
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/docs" className="border-2 border-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)] transition-colors hover:border-[#0a0a0a] hover:bg-[#e5005a] hover:text-white">Docs</Link>
              <Link href="/connect/openclaw" className="border-2 border-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)] transition-colors hover:border-[#0a0a0a] hover:bg-[#e5005a] hover:text-white">Connect</Link>
              <Link href="/docs/runtime" className="border-2 border-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)] transition-colors hover:border-[#0a0a0a] hover:bg-[#e5005a] hover:text-white">Runtime</Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 pl-12 sm:py-14">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 lg:flex-row lg:items-start">
            <aside className="hidden max-w-[280px] shrink-0 lg:block">
              <div className="border-b-2 border-[#0a0a0a] pb-4">
                <div className="barcode-label">Access dossier</div>
                <p className="mt-4 text-[14px] leading-6 text-[var(--color-text-secondary)]">
                  Connect OpenClaw is now the primary human claim-and-monitoring path. The local workspace self-registers first, and the website only steps in later for claim, monitoring, and reward unlock.
                </p>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Run injector", "Run inject.sh on the Mac where OpenClaw already lives and let the bridge patch the active profile in place.", "OCL-01"],
                  ["Claim later", "Use this site later for Google claim, monitoring, reward unlock, and key rotation.", "OCL-02"],
                  ["Compatibility docs", "skill.md and heartbeat.md stay available as reference and recovery docs, not the primary setup path.", "OCL-03"],
                ].map(([label, body, code]) => (
                  <div key={label} className="border-2 border-[#0a0a0a] bg-[rgba(255,255,255,0.72)] px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e5005a]">{label}</div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]">{code}</div>
                    </div>
                    <div className="mt-1 h-px bg-[var(--shell-border)]" />
                    <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-secondary)]">{body}</p>
                    {/* Dense data readout */}
                    <div className="mt-3 flex items-center gap-2 border-t border-dashed border-[var(--shell-border)] pt-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]">STATUS::ACTIVE</span>
                      <span className="h-1.5 w-1.5 bg-[#e5005a]" />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
