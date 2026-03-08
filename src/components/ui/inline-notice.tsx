import type { ReactNode } from "react";

type InlineNoticeTone = "error" | "warning" | "success" | "info" | "neutral";

const toneClasses: Record<InlineNoticeTone, string> = {
  error: "border-[rgba(213,61,90,0.55)] bg-[rgba(229,0,90,0.08)] text-[var(--color-error)]",
  warning: "border-[rgba(185,112,20,0.5)] bg-[rgba(255,247,232,0.92)] text-[var(--color-warning)]",
  success: "border-[rgba(45,156,115,0.45)] bg-[rgba(238,251,245,0.92)] text-[var(--color-success)]",
  info: "border-[rgba(156,61,115,0.4)] bg-[rgba(255,242,249,0.92)] text-[var(--color-info)]",
  neutral: "border-[#0a0a0a] bg-[rgba(255,255,255,0.86)] text-[#4a4036]",
};

interface InlineNoticeProps {
  title?: string;
  message: ReactNode;
  tone?: InlineNoticeTone;
  className?: string;
}

export function InlineNotice({
  title,
  message,
  tone = "neutral",
  className = "",
}: InlineNoticeProps) {
  return (
    <div
      className={`relative overflow-hidden border-2 px-4 py-4 ${toneClasses[tone]} ${className}`}
      data-agent-role="inline-notice"
      data-agent-tone={tone}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[6px] bg-[#e5005a]" aria-hidden="true" />
      <div className="ml-4 space-y-2">
        {title ? (
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-current/80">{title}</div>
        ) : null}
        <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-current">{message}</div>
      </div>
    </div>
  );
}
