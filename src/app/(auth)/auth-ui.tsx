import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  children,
  action,
}: {
  children: ReactNode;
  action: string;
}) {
  return (
    <div
      className="relative w-full max-w-[440px] rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0a0a0a] shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
      data-agent-role="auth-form"
      data-agent-action={action}
      style={{ animation: "hero-reveal 0.45s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      <div className="relative z-10 p-8">{children}</div>
    </div>
  );
}

export function AuthEyebrow({
  label,
}: {
  label: string;
}) {
  return (
    <div className="mb-6">
      <span className="font-mono text-[11px] uppercase tracking-wider text-[#666]">
        {label}
      </span>
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
    <div className="mb-7">
      <h1 className="text-[1.8rem] font-semibold tracking-[-0.04em] text-white">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-[14px] text-[#a1a1a1] leading-6">{summary}</p>
    </div>
  );
}

export function AuthInfoGrid({
  items,
}: {
  items: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {items.map(([title, body]) => (
        <div key={title} className="rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-black p-3">
          <div className="font-mono text-[10px] text-[#666] uppercase">{title}</div>
          <p className="mt-2 text-[12px] text-[#a1a1a1]">{body}</p>
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
      ? "border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.05)] text-[#f5a623]"
      : tone === "success"
        ? "border-[rgba(80,227,194,0.2)] bg-[rgba(80,227,194,0.05)] text-[#50e3c2]"
        : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[#a1a1a1]";

  return (
    <div className={`rounded-[6px] border px-4 py-4 ${toneClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-wider">{title}</div>
      <p className="mt-2 text-[12px] leading-6">{body}</p>
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
    <div className="mt-6 text-center text-[13px]">
      <Link href={primaryHref} className="text-[#0070f3] hover:underline">
        {primaryLabel}
      </Link>
      {secondaryLabel && secondaryHref ? (
        <div className="mt-2">
          <Link href={secondaryHref} className="text-[#666] hover:text-[#a1a1a1] transition-colors">
            {secondaryLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
