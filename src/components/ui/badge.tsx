import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline" | "gradient" | "glass";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[rgba(255,255,255,0.06)] text-[#a1a1a1] border-[rgba(255,255,255,0.1)]",
  success: "bg-[rgba(80,227,194,0.1)] text-[#50e3c2] border-[rgba(80,227,194,0.2)]",
  warning: "bg-[rgba(245,166,35,0.1)] text-[#f5a623] border-[rgba(245,166,35,0.2)]",
  danger: "bg-[rgba(238,0,0,0.1)] text-[#ff6166] border-[rgba(238,0,0,0.2)]",
  info: "bg-[rgba(0,112,243,0.1)] text-[#3291ff] border-[rgba(0,112,243,0.2)]",
  outline: "bg-transparent text-[#666] border-[rgba(255,255,255,0.12)]",
  gradient: "bg-transparent text-[#ededed] border-transparent",
  glass: "bg-[rgba(255,255,255,0.04)] text-[#ededed] border-[rgba(255,255,255,0.1)]",
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
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${pixel ? "font-pixel-square uppercase tracking-[0.16em]" : "font-mono"} ${variants[variant]} ${className}`}
      data-agent-role="badge"
      data-agent-variant={variant}
      {...props}
    >
      {children}
    </span>
  );
}
