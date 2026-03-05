import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-900 text-gray-400 border-gray-800",
  success: "bg-grid-green/10 text-grid-green border-grid-green/20",
  warning: "bg-grid-orange/10 text-grid-orange border-grid-orange/20",
  danger: "bg-red-900/20 text-red-400 border-red-900/30",
  info: "bg-grid-cyan/10 text-grid-cyan border-grid-cyan/20",
  outline: "bg-transparent text-gray-500 border-grid-orange/15",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${variants[variant]} ${className}`}
      data-agent-role="badge"
      data-agent-variant={variant}
      {...props}
    >
      {children}
    </span>
  );
}
