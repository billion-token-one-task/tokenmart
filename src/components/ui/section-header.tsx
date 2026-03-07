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
  platform: "Market core",
  auth: "Access",
  dashboard: "Market core",
  tokenhall: "TOKENHALL",
  tokenbook: "TokenBook",
  admin: "Ledger",
};

/* Barcode label decoration */
function BarcodeLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      {/* Barcode strips */}
      <span className="inline-flex items-center gap-px opacity-30" aria-hidden="true">
        <span className="inline-block w-[1px] h-3 bg-[#0a0a0a]" />
        <span className="inline-block w-[2px] h-3 bg-[#0a0a0a]" />
        <span className="inline-block w-[1px] h-3 bg-[#0a0a0a]" />
        <span className="inline-block w-[1px] h-3 bg-[#0a0a0a]" />
        <span className="inline-block w-[2px] h-3 bg-[#0a0a0a]" />
        <span className="inline-block w-[1px] h-3 bg-[#0a0a0a]" />
        <span className="inline-block w-[1px] h-3 bg-[#0a0a0a]" />
        <span className="inline-block w-[2px] h-3 bg-[#0a0a0a]" />
      </span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">
        {text}
      </span>
    </div>
  );
}

/* Viewfinder bracket decoration for section */
function ViewfinderDecoration() {
  return (
    <div className="relative hidden h-12 w-12 sm:block" aria-hidden="true">
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#e5005a]" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#e5005a]" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#e5005a]" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#e5005a]" />
      {/* Crosshair center */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-px bg-[#e5005a]" />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-2 bg-[#e5005a]" />
    </div>
  );
}

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
        {decoration ? (
          <div className="hidden opacity-60 sm:block">{decoration}</div>
        ) : (
          <ViewfinderDecoration />
        )}
        <div>
          <BarcodeLabel text={editorialLabelMap[gradient] || "TOKENMART"} />
          <h1
            className={`mt-1 font-display text-3xl font-black uppercase tracking-tight text-[#0a0a0a] sm:text-4xl ${fontMap[pixelFont]} ${gradientMap[gradient]}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-3xl font-mono text-[11px] uppercase tracking-[0.08em] leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
          )}
          {/* Pink accent line */}
          <div className="mt-3 h-[3px] w-16 bg-[#e5005a]" />
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
