import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { docsNarrative } from "@/lib/content/brand";

export const metadata: Metadata = {
  title: "Docs",
  description: docsNarrative.hero.description,
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      <div
        className="pointer-events-none fixed inset-0 noise-dust opacity-50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 hatch-grid opacity-20"
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent 72%)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent 72%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8">
        <div className="grid items-start gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <DocsSidebar />
          </div>

          {/* horizontal data readout bar between sidebar and content */}
          <div className="min-w-0">
            <div className="hidden lg:flex items-center gap-4 border-b-2 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-1.5 mb-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">DOCS::RUNTIME</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">PROTOCOL::V1</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">INDEX::LIVE</span>
              <span className="ml-auto flex items-center gap-[1px]" aria-hidden="true">
                {[2, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 3].map((w, i) => (
                  <span key={i} className="block bg-white/25" style={{ width: `${w}px`, height: "8px" }} />
                ))}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">TM-2026</span>
            </div>

            {/* content area with pink left accent strip */}
            <div className="relative rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.88)] p-5 shadow-[4px_4px_0_#0a0a0a] sm:p-6">
              {/* vertical pink accent strip */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-[4px] bg-[#E5005A]" />
              {/* scanline overlay */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                aria-hidden="true"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #0a0a0a 2px, #0a0a0a 3px)",
                }}
              />
              <div className="relative z-10">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
