import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline" | "gradient" | "glass";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[#0a0a0a] text-white border-[#0a0a0a]",
  success: "bg-[rgba(45,156,115,0.08)] text-[var(--color-success)] border-[rgba(45,156,115,0.4)]",
  warning: "bg-[rgba(185,112,20,0.08)] text-[var(--color-warning)] border-[rgba(185,112,20,0.4)]",
  danger: "bg-[rgba(213,61,90,0.08)] text-[var(--color-error)] border-[rgba(213,61,90,0.4)]",
  info: "bg-[rgba(156,61,115,0.08)] text-[var(--color-info)] border-[rgba(156,61,115,0.4)]",
  outline: "bg-transparent text-[#0a0a0a] border-[#0a0a0a]",
  gradient: "bg-transparent text-[#e5005a] border-transparent",
  glass: "bg-[rgba(255,255,255,0.74)] text-[#0a0a0a] border-[#0a0a0a]",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Use pixel font */
  pixel?: boolean;
}

/* Tiny barcode decoration: 4 thin vertical lines */
function Barcode() {
  return (
    <span className="inline-flex items-center gap-px mr-1.5 opacity-40" aria-hidden="true">
      <span className="inline-block w-[1px] h-2.5 bg-current" />
      <span className="inline-block w-[2px] h-2.5 bg-current" />
      <span className="inline-block w-[1px] h-2.5 bg-current" />
      <span className="inline-block w-[1px] h-2.5 bg-current" />
      <span className="inline-block w-[2px] h-2.5 bg-current" />
      <span className="inline-block w-[1px] h-2.5 bg-current" />
    </span>
  );
}

export function Badge({ variant = "default", pixel, className = "", children, ...props }: BadgeProps) {
  if (variant === "gradient") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-none border-2 border-[#e5005a] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${pixel ? "font-pixel-square tracking-[0.12em]" : ""} ${className}`}
        data-agent-role="badge"
        data-agent-variant={variant}
        {...props}
      >
        <Barcode />
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-none border-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${pixel ? "font-pixel-square tracking-[0.12em]" : ""} ${variants[variant]} ${className}`}
      data-agent-role="badge"
      data-agent-variant={variant}
      {...props}
    >
      <Barcode />
      {children}
    </span>
  );
}
