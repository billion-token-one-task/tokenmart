import { type CSSProperties, ReactNode } from "react";
import { SectionPattern } from "@/components/ui/section-pattern";
import {
  getSectionStyleVars,
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

const fontMap: Record<string, string> = {
  square: "font-pixel-square",
  grid: "font-pixel-grid",
  circle: "font-pixel-circle",
  triangle: "font-pixel-triangle",
  line: "font-pixel-line",
};

export function PageHeader({
  title,
  description,
  actions,
  agentEndpoint,
  pixelFont,
  gradient,
  decoration,
  section,
}: PageHeaderProps) {
  const sectionConfig = resolveSectionConfig({ section, gradient });
  const titleFont = pixelFont ? fontMap[pixelFont] : sectionConfig.pixelFont;

  return (
    <div
      className={`shell-page-header surface-${sectionConfig.surfacePreset} mb-8 rounded-[32px] px-5 py-5 sm:px-6`}
      style={{ animation: "hero-reveal 0.6s cubic-bezier(0.22,1,0.36,1) both" }}
      data-agent-role="page-header"
      data-agent-endpoint={agentEndpoint}
      data-shell-section={sectionConfig.id}
      data-shell-contrast={sectionConfig.contrastPreset}
      data-shell-surface={sectionConfig.surfacePreset}
    >
      <SectionPattern
        section={sectionConfig.id}
        className="opacity-60 [mask-image:linear-gradient(135deg,transparent_16%,black_42%,black_82%,transparent)]"
        opacity={0.68}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--section-accent-light), var(--section-accent-line), transparent)",
        }}
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span
              className={`shell-pill px-2.5 py-1 ${sectionConfig.pixelFont} text-[10px] tracking-[0.18em] ${sectionConfig.gradientTextClass}`}
              style={getSectionStyleVars(sectionConfig.id) as CSSProperties}
            >
              {sectionConfig.eyebrow}
            </span>
            <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
              {sectionConfig.hintLabel}
            </span>
            {agentEndpoint && (
              <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 font-mono text-[10px] text-[var(--color-text-quaternary)]">
                {agentEndpoint}
              </span>
            )}
          </div>
          <div className="flex items-start gap-4">
            {decoration && (
              <div className="hidden shrink-0 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(16,20,29,0.9),rgba(7,10,16,0.92))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)] sm:block">
                <div className="opacity-90">{decoration}</div>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1
                className={`shell-display ${sectionConfig.displayTreatment} text-[2rem] tracking-tight text-[var(--color-text-primary)] sm:text-[2.7rem] ${titleFont} ${gradient || sectionConfig.gradientTextClass}`}
              >
                {title}
              </h1>
              {description && (
                <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[16px]">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div
            className="shell-rule mt-4"
            style={
              {
                "--rule-from": sectionConfig.accentFrom,
                "--rule-to": sectionConfig.accentTo,
              } as CSSProperties
            }
          />
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
