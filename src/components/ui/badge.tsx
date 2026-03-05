import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline" | "gradient" | "glass";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-secondary)] border-[rgba(255,255,255,0.08)]",
  success: "bg-[rgba(126,231,135,0.12)] text-[#b7f7c1] border-[rgba(126,231,135,0.24)]",
  warning: "bg-[rgba(255,184,107,0.12)] text-[#ffd7aa] border-[rgba(255,184,107,0.24)]",
  danger: "bg-[rgba(255,123,114,0.12)] text-[#ffb4ae] border-[rgba(255,123,114,0.24)]",
  info: "bg-[rgba(122,162,255,0.12)] text-[#d9e6ff] border-[rgba(122,162,255,0.24)]",
  outline: "bg-transparent text-[var(--color-text-tertiary)] border-[rgba(255,255,255,0.12)]",
  gradient: "bg-transparent text-[var(--color-text-primary)] border-transparent",
  glass: "backdrop-blur-[8px] bg-[linear-gradient(180deg,rgba(16,20,30,0.74),rgba(8,11,17,0.72))] text-[var(--color-text-primary)] border-[rgba(255,255,255,0.1)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_20px_rgba(0,0,0,0.18)]",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Use pixel font */
  pixel?: boolean;
}

export function Badge({ variant = "default", pixel, className = "", children, ...props }: BadgeProps) {
  if (variant === "gradient") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${pixel ? "font-pixel-square uppercase tracking-[0.16em]" : "font-mono"} gradient-border ${className}`}
        data-agent-role="badge"
        data-agent-variant={variant}
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium ${pixel ? "font-pixel-square uppercase tracking-[0.16em]" : "font-mono"} ${variants[variant]} ${className}`}
      data-agent-role="badge"
      data-agent-variant={variant}
      {...props}
    >
      {children}
    </span>
  );
}
