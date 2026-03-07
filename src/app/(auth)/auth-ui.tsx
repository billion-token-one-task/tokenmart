import Link from "next/link";
import type { ReactNode } from "react";

/* ── viewfinder bracket corners (reusable) ── */
function ViewfinderBrackets({ size = 10, color = "#0a0a0a" }: { size?: number; color?: string }) {
  const s = `${size}px`;
  const borderStyle = `2px solid ${color}`;
  return (
    <>
      {/* top-left */}
      <span className="pointer-events-none absolute left-0 top-0" style={{ width: s, height: s, borderTop: borderStyle, borderLeft: borderStyle }} aria-hidden="true" />
      {/* top-right */}
      <span className="pointer-events-none absolute right-0 top-0" style={{ width: s, height: s, borderTop: borderStyle, borderRight: borderStyle }} aria-hidden="true" />
      {/* bottom-left */}
      <span className="pointer-events-none absolute bottom-0 left-0" style={{ width: s, height: s, borderBottom: borderStyle, borderLeft: borderStyle }} aria-hidden="true" />
      {/* bottom-right */}
      <span className="pointer-events-none absolute bottom-0 right-0" style={{ width: s, height: s, borderBottom: borderStyle, borderRight: borderStyle }} aria-hidden="true" />
    </>
  );
}

export function AuthCard({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] shadow-[4px_4px_0_#0a0a0a] ${className}`}
      data-agent-role="auth-form"
      data-agent-action={action}
      style={{ animation: "hero-reveal 0.45s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      {/* solid pink top strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-[#E5005A]" />
      {/* scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #0a0a0a 2px, #0a0a0a 3px)",
        }}
      />
      {/* hatch grid */}
      <div className="pointer-events-none absolute inset-0 hatch-grid opacity-10" aria-hidden="true" />
      {/* viewfinder brackets */}
      <ViewfinderBrackets size={14} />
      <div className="relative z-10 p-6 sm:p-7">{children}</div>
    </div>
  );
}

export function AuthEyebrow({
  label,
}: {
  label: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">
        {label}
      </span>
      {/* barcode decoration */}
      <span className="flex items-center gap-[2px]" aria-hidden="true">
        {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2].map((w, i) => (
          <span key={i} className="block bg-[#0a0a0a]" style={{ width: `${w}px`, height: "10px" }} />
        ))}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">TM-2026</span>
    </div>
  );
}

export function AuthTitleBlock({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[2.6rem] uppercase leading-[0.88] tracking-[0.02em] text-[#0a0a0a] sm:text-[3rem]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-[13px] leading-6 text-[var(--color-text-secondary)]">{summary}</p>
      {/* technical readout */}
      <div className="mt-3 flex items-center gap-4 border-t border-[#0a0a0a]/10 pt-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">PROTOCOL::AUTH-LAYER</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">VER 1.0.0</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">SUBSYSTEM::IDENTITY</span>
      </div>
    </div>
  );
}

export function AuthInfoGrid({
  items,
}: {
  items: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="mt-5 grid gap-0 border-2 border-[#0a0a0a] sm:grid-cols-3">
      {items.map(([title, body], i) => (
        <div
          key={title}
          className={`group relative p-3 transition-colors hover:bg-[#E5005A] hover:text-white ${
            i < items.length - 1 ? "border-b-2 border-[#0a0a0a] sm:border-b-0 sm:border-r-2" : ""
          }`}
        >
          <ViewfinderBrackets size={8} />
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/70">{title}</div>
          <p className="mt-1.5 text-[11px] leading-5 text-[var(--color-text-secondary)] group-hover:text-white/90">{body}</p>
        </div>
      ))}
    </div>
  );
}

export function AuthPanel({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: string;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-[#0a0a0a] bg-[rgba(185,112,20,0.06)] text-[var(--color-warning)]"
      : tone === "success"
        ? "border-[#0a0a0a] bg-[rgba(45,156,115,0.06)] text-[var(--color-success)]"
        : "border-[#0a0a0a] bg-white/60 text-[var(--color-text-secondary)]";

  return (
    <div className={`relative rounded-none border-2 px-4 py-3 ${toneClass}`}>
      {/* status dot */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className={`block h-[6px] w-[6px] rounded-none ${
          tone === "warning" ? "bg-[var(--color-warning)]" : tone === "success" ? "bg-[var(--color-success)]" : "bg-[#E5005A]"
        }`} />
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          {tone === "warning" ? "WARN" : tone === "success" ? "OK" : "INFO"}
        </span>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em]">{title}</div>
      <p className="mt-1.5 text-[11px] leading-5">{body}</p>
    </div>
  );
}

export function AuthLinks({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className="mt-5 border-t-2 border-[#0a0a0a]/10 pt-4 text-center">
      <Link href={primaryHref} className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#0a0a0a] transition-colors hover:text-[#E5005A]">
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
        {primaryLabel}
      </Link>
      {secondaryLabel && secondaryHref ? (
        <div className="mt-2">
          <Link href={secondaryHref} className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] transition-colors hover:text-[#E5005A]">
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            {secondaryLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
