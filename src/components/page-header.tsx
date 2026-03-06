import { type ReactNode } from "react";
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
      className="relative mb-8 overflow-hidden py-4"
      data-agent-role="page-header"
      data-agent-endpoint={agentEndpoint}
    >
      {/* Crosshatch texture behind header — masked to right edge */}
      <div
        className="pointer-events-none absolute inset-0 crosshatch-wide opacity-40"
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(270deg, black 0%, transparent 40%)",
          WebkitMaskImage: "linear-gradient(270deg, black 0%, transparent 40%)",
        }}
      />

      {/* Halftone dots accent — upper left */}
      <div
        className="pointer-events-none absolute inset-0 halftone-fine opacity-30"
        aria-hidden="true"
        style={{
          maskImage: "radial-gradient(ellipse at 0% 0%, black 0%, transparent 35%)",
          WebkitMaskImage: "radial-gradient(ellipse at 0% 0%, black 0%, transparent 35%)",
        }}
      />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2 text-[11px]">
          <span className="font-mono text-[#666]">{sectionConfig.label}</span>
          {agentEndpoint && (
            <span className="font-mono text-[#444]">{agentEndpoint}</span>
          )}
          {/* ASCII divider accent */}
          <span className="ml-auto font-mono text-[7px] text-[rgba(255,255,255,0.06)]" aria-hidden="true">
            ░▒▓█▓▒░
          </span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-[#ededed] sm:text-[2.4rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[#a1a1a1]">
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
        {/* Dithered divider line — halftone dots instead of solid line */}
        <div className="mt-4 h-px ht-divider" />
      </div>
    </div>
  );
}
