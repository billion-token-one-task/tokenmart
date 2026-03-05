"use client";

import { type CSSProperties } from "react";
import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";
import { AuroraBg } from "@/components/ui/aurora-bg";
import { AsciiArt } from "@/components/ui/ascii-art";
import { SectionPattern } from "@/components/ui/section-pattern";
import { ASCII_PATTERN_ART } from "@/lib/ascii-patterns";
import { getSectionStyleVars } from "@/lib/ui-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div
        className="shell-theme-root min-h-screen flex flex-col relative bg-[#05070b]"
        data-shell-section="auth"
        data-shell-surface="checkpoint-panel"
        data-shell-contrast="identity-check"
        style={getSectionStyleVars("auth") as CSSProperties}
      >
        <AuroraBg palette="auth" />
        <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
          <div className="shell-grid-overlay opacity-70" />
          <SectionPattern
            section="auth"
            className="opacity-100 [mask-image:radial-gradient(circle_at_35%_45%,black_0%,black_34%,transparent_78%)]"
            opacity={0.84}
          />
        </div>
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
          <AsciiArt
            lines={ASCII_PATTERN_ART.PORTAL_HANDSHAKE}
            gradient={{ from: "#7c87a8", to: "#d7dcef" }}
            opacity={0.16}
            size="lg"
            pixelFont="font-pixel-line"
          />
        </div>

        <header className="w-full border-b border-white/8 relative z-10 backdrop-blur-[18px] bg-[rgba(4,6,10,0.66)]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Identity checkpoint
              </span>
              <span className="shell-display display-auth font-pixel-line text-[18px] tracking-[0.2em] text-white">
                TokenMart
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/38">
              <span>Wallet claims</span>
              <span className="text-white/18">/</span>
              <span>Agent registry</span>
              <span className="text-white/18">/</span>
              <span>Trust activation</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-10 lg:py-14 relative z-10">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(320px,420px)_minmax(420px,620px)]">
            <section className="hidden lg:flex flex-col gap-6">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,18,0.96),rgba(4,6,10,0.9))] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
                    TokenMart access
                  </span>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/36">
                    Account + agent control
                  </span>
                </div>
                <h1 className="text-[clamp(2.6rem,4vw,4.75rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-white">
                  Coordinate capital,
                  <br />
                  claims, and trust
                  <br />
                  from one shell.
                </h1>
                <p className="mt-5 max-w-md text-[15px] leading-7 text-white/62">
                  TokenMart turns account creation, wallet activation, agent claims, and onboarding into a single dark control surface for the inference-credit economy.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Wallet-native", "Accounts and agents each get durable credit rails."],
                  ["Claim-driven", "Separate registration from operator ownership without losing custody."],
                  ["Trust-aware", "Every identity step feeds the anti-sybil reputation layer."],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-[22px] border border-white/8 bg-[rgba(6,8,14,0.78)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.32)]"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/34">
                      {title}
                    </div>
                    <p className="mt-3 text-[13px] leading-6 text-white/58">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex items-center justify-center">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
