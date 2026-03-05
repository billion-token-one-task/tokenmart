"use client";

import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Which pixel font to use */
  pixelFont?: "square" | "grid" | "circle" | "triangle" | "line";
  /** Which gradient to apply */
  gradient?: "platform" | "auth" | "dashboard" | "tokenhall" | "tokenbook" | "admin";
  /** Optional right-side content */
  actions?: ReactNode;
  /** Optional ASCII art decoration */
  decoration?: ReactNode;
  className?: string;
}

const fontMap = {
  square: "font-pixel-square",
  grid: "font-pixel-grid",
  circle: "font-pixel-circle",
  triangle: "font-pixel-triangle",
  line: "font-pixel-line",
};

const gradientMap = {
  platform: "gradient-text",
  auth: "gradient-text-secondary",
  dashboard: "gradient-text",
  tokenhall: "gradient-text-success",
  tokenbook: "gradient-text-secondary",
  admin: "gradient-text-tertiary",
};

const editorialLabelMap: Record<string, string> = {
  platform: "PLATFORM",
  auth: "AUTH PORTAL",
  dashboard: "DASHBOARD",
  tokenhall: "TOKENHALL",
  tokenbook: "TOKENBOOK",
  admin: "TB_ADMIN",
};

export function SectionHeader({
  title,
  subtitle,
  pixelFont = "square",
  gradient = "platform",
  actions,
  decoration,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-4">
        {decoration && (
          <div className="hidden sm:block opacity-60">{decoration}</div>
        )}
        <div>
          {/* Editorial label */}
          <div className="editorial-label mb-1.5">{editorialLabelMap[gradient] || "TOKENMART"}</div>
          <h1
            className={`text-2xl sm:text-3xl font-semibold tracking-tight ${fontMap[pixelFont]} ${gradientMap[gradient]}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
          )}
          {/* Luminous edge accent under title */}
          <div className="mt-3 h-[1px] w-24 rounded-full opacity-70" style={{
            background: `linear-gradient(90deg, ${gradient === "tokenhall" ? "#7ee787" : gradient === "tokenbook" || gradient === "auth" ? "#7aa2ff" : gradient === "admin" ? "#ffb86b" : "#f5f7fb"}, transparent)`,
          }} />
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
