import { type ReactNode } from "react";
import { SectionPattern } from "@/components/ui/section-pattern";
import {
  resolveSectionConfig,
  type ShellSectionId,
} from "@/lib/ui-shell";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  agentEndpoint?: string;
  pixelFont?: "square" | "grid" | "circle" | "triangle" | "line";
  gradient?: string;
  decoration?: ReactNode;
  section?: ShellSectionId;
}

export function PageHeader({
  title,
  description,
  actions,
  agentEndpoint,
  section,
  gradient,
}: PageHeaderProps) {
  const sectionConfig = resolveSectionConfig({ section, gradient });

  return (
    <div
      className="relative mb-8 border-b-2 border-[#0a0a0a] pb-5"
      data-agent-role="page-header"
      data-agent-endpoint={agentEndpoint}
      data-shell-section={sectionConfig.id}
    >
      <SectionPattern
        section={sectionConfig.id}
        className="opacity-20"
        opacity={0.45}
      />
      {/* Scanline sweep overlay */}
      <div
        className="pointer-events-none absolute inset-0 scanline-overlay opacity-[0.04]"
        aria-hidden="true"
      />

      {/* Crosshatch decoration on right */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-32 crosshatch-wide opacity-30"
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(270deg, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(270deg, black 0%, transparent 100%)",
        }}
      />

      {/* Crosshair decoration top-right */}
      <div className="absolute right-0 top-0 font-mono text-[10px] text-[var(--color-text-quaternary)]" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3">
          <line x1="8" y1="0" x2="8" y2="16" />
          <line x1="0" y1="8" x2="16" y2="8" />
          <circle cx="8" cy="8" r="3" />
        </svg>
      </div>

      <div className="relative">
        {/* Pink accent line */}
        <div className="mb-4 h-[3px] w-[60px] bg-[#e5005a]" aria-hidden="true" />

        <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px]">
          <span className="barcode-label">{sectionConfig.label}</span>
          {agentEndpoint && (
            <span className="font-mono text-[var(--color-text-quaternary)]">{agentEndpoint}</span>
          )}
          <span className="ml-auto font-mono text-[10px] text-[var(--color-text-quaternary)]" aria-hidden="true">
            {sectionConfig.hintLabel}
          </span>
        </div>

        {/* Barcode strip */}
        <div className="mb-4 flex items-center gap-[2px]" aria-hidden="true">
          {[2,1,3,1,2,1,3,2,1,2,3,1,1,2,1,3,1,2,1,3,2,1].map((w, i) => (
            <div key={i} className="h-[4px] bg-[#0a0a0a]" style={{ width: `${w}px` }} />
          ))}
          <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--color-text-quaternary)]">
            {sectionConfig.id.toUpperCase()}
          </span>
        </div>

        <div className="viewfinder flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-[2.8rem] uppercase leading-[0.9] tracking-[0.01em] text-[#0a0a0a] sm:text-[3.4rem]">
              {title}
            </h1>
            {/* Animated pink underline that extends on mount */}
            <div className="mt-2 h-[2px] w-0 animate-slide-in-left bg-[#e5005a]" style={{ animationFillMode: "forwards", width: "100%", maxWidth: "200px" }} aria-hidden="true" />
            {description && (
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--color-text-secondary)]">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Dense data readouts */}
        <div className="mt-4 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]" aria-hidden="true">
          <span>MODULE::{sectionConfig.id.toUpperCase()}</span>
          <span className="h-1 w-1 bg-[#e5005a]" />
          <span>STATUS::ACTIVE</span>
          <span className="h-1 w-1 bg-[#e5005a]" />
          <span>RENDER::OK</span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="h-[2px] bg-[#0a0a0a]" />
          <div className="header-telemetry-strip">
            <div className="header-telemetry-track">
              {[
                `SECTION::${sectionConfig.label.toUpperCase()}`,
                `EYEBROW::${sectionConfig.eyebrow}`,
                `HINT::${sectionConfig.hintLabel}`,
                "MISSION-RUNTIME::LIVE",
                "PINK-SIGNAL::LOCKED",
                "READOUT::NOMINAL",
              ].map((entry, index) => (
                <span key={`${entry}-${index}`} className="header-telemetry-chip">
                  {entry}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
