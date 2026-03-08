"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SectionPattern } from "@/components/ui/section-pattern";
import { ToastProvider } from "@/components/ui/toast";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult } from "@/lib/http/client-json";
import {
  getSectionByPath,
  shellFallbackTelemetry,
  shellPinnedLinks,
  type ShellTelemetrySignal,
} from "@/lib/ui-shell";
import type { AgentRuntimeView, SupervisorOverview } from "@/lib/v2/types";

const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((mod) => mod.CommandPalette),
  { ssr: false },
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = getSectionByPath(pathname);
  const { token, ready } = useAuthState();
  const [telemetry, setTelemetry] = useState<ShellTelemetrySignal[]>(shellFallbackTelemetry);
  const [focusTitle, setFocusTitle] = useState("Mountain signals syncing");

  useEffect(() => {
    if (!ready || !token) return;

    let cancelled = false;

    async function loadShellSignals() {
      const [runtimeResult, supervisorResult] = await Promise.all([
        fetchJsonResult<AgentRuntimeView>("/api/v2/agents/me/runtime", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<SupervisorOverview>("/api/v2/admin/supervisor/overview", {
          headers: authHeaders(token),
        }),
      ]);

      if (cancelled) return;

      const nextTelemetry: ShellTelemetrySignal[] = [];
      const nextFocus =
        runtimeResult.ok && runtimeResult.data?.mission_context.mountains[0]
          ? runtimeResult.data.mission_context.mountains[0].title
          : supervisorResult.ok && supervisorResult.data?.mountains[0]
            ? supervisorResult.data.mountains[0].title
            : "Mountain signals syncing";

      if (runtimeResult.ok && runtimeResult.data) {
        nextTelemetry.push(
          {
            id: "assignments",
            label: "Assignments",
            value: String(runtimeResult.data.current_assignments.length).padStart(2, "0"),
            tone: runtimeResult.data.current_assignments.length > 0 ? "brand" : "neutral",
            href: "/dashboard/runtime",
          },
          {
            id: "checkpoints",
            label: "Checkpoints",
            value: String(runtimeResult.data.checkpoint_deadlines.length).padStart(2, "0"),
            tone: runtimeResult.data.checkpoint_deadlines.length > 0 ? "warning" : "neutral",
            href: "/dashboard/runtime",
          },
        );
      }

      if (supervisorResult.ok && supervisorResult.data) {
        nextTelemetry.push({
          id: "alerts",
          label: "Alerts",
          value: String(
            supervisorResult.data.system_metrics.blocked_specs +
              supervisorResult.data.system_metrics.contradiction_alerts
          ).padStart(2, "0"),
          tone:
            supervisorResult.data.system_metrics.blocked_specs +
              supervisorResult.data.system_metrics.contradiction_alerts >
            0
              ? "warning"
              : "success",
          href: "/admin/supervisor",
        });
      }

      setTelemetry(nextTelemetry.length > 0 ? nextTelemetry : shellFallbackTelemetry);
      setFocusTitle(nextFocus);
    }

    void loadShellSignals();

    return () => {
      cancelled = true;
    };
  }, [ready, token]);

  const sectionPins = useMemo(
    () => shellPinnedLinks.filter((item) => item.section === section.id),
    [section.id]
  );
  const shellPins = sectionPins.length > 0 ? sectionPins : shellPinnedLinks.slice(0, 3);

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
          <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
            <div className="shell-telemetry-banner viewfinder-full relative mb-3 overflow-hidden border-2 border-[#0a0a0a] bg-[rgba(255,250,252,0.95)] px-4 py-3">
              <span className="vf-tl" />
              <span className="vf-tr" />
              <span className="vf-bl" />
              <span className="vf-br" />
              <SectionPattern section={section.id} className="opacity-20" opacity={0.5} />
              <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-7 items-center border-2 border-[#0a0a0a] bg-[#e5005a] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white">
                    PINNED
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a7a68]">
                      Mountain focus
                    </div>
                    <div className="truncate font-display text-[1.2rem] uppercase leading-none text-[#0a0a0a]">
                      {focusTitle}
                    </div>
                  </div>
                </div>
                <div className="mission-status-marquee ml-auto hidden min-w-0 flex-1 lg:flex">
                  <div className="mission-status-track">
                    {[...shellPins, ...shellPins].map((pin, index) => (
                      <Link
                        key={`${pin.id}-${index}`}
                        href={pin.href}
                        className="mission-status-chip"
                      >
                        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#e5005a]">
                          {pin.code}
                        </span>
                        <span className="font-display text-[1rem] uppercase leading-none text-[#0a0a0a]">
                          {pin.label}
                        </span>
                        <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a7a68]">
                          {pin.summary}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Data readout strip */}
          <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
            <div className="mb-3 flex flex-wrap items-center gap-3 border-b-2 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-1.5">
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
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {telemetry.map((signal) => (
                  <Link
                    key={signal.id}
                    href={signal.href}
                    className={`shell-signal-chip shell-signal-${signal.tone}`}
                  >
                    <span>{signal.label}</span>
                    <span className="shell-signal-value">{signal.value}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-[1440px] px-4 pb-12 lg:px-8">
            <div className="relative flex">
              {/* Vertical pink accent strip */}
              <div className="w-[3px] shrink-0 bg-[#e5005a]" aria-hidden="true" />
              {/* Content card with viewfinder brackets */}
              <div className="viewfinder relative min-w-0 flex-1 border-2 border-[#0a0a0a] bg-[rgba(255,248,251,0.92)] p-5 sm:p-6">
                <SectionPattern section={section.id} className="opacity-[0.08]" opacity={0.6} />
                <div className="shell-inner-frame pointer-events-none absolute inset-[10px] border border-[rgba(10,10,10,0.08)]" aria-hidden="true" />
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
